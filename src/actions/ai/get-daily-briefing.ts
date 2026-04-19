'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { callAI, type AIMessage } from '@/lib/ai/openai-client';
import { planHasFeature } from '@/lib/plans';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_OUTPUT_TOKENS = 800;

const SYSTEM_PROMPT = `Tu es l'assistant IA de Fleet-Master. Génère un briefing matinal pour un gestionnaire de flotte (6-8 points maximum, format liste avec tirets).
Sois direct et actionnable. Priorise par urgence réglementaire puis financière.
OBLIGATOIRE : mentionne systématiquement les véhicules avec score IA inférieur à 60, les documents (CT, assurance, tachy, ATP) expirant sous 30 jours, les maintenances prédictives en retard (overdue) ou dues, et les documents conducteurs (permis, FCO, FCOS, carte tachy) expirant sous 30 jours.
Ne répète pas les UUIDs. Utilise les immatriculations.
Réponds uniquement en français.`;

function cacheKey(companyId: string, date: string): string {
  return crypto.createHash('sha256').update(`${companyId}:${date}`).digest('hex');
}

export const getDailyBriefing = authActionClient
  .schema(z.object({
    plan: z.string(),
  }))
  .action(async ({ ctx, parsedInput }) => {
    const { plan } = parsedInput as { plan: string };

    if (!ctx.user.company_id) {
      return { content: null, generated_at: null, from_cache: false };
    }

    // Gate: check plan feature
    if (!planHasFeature(plan, 'ai_briefing')) {
      return { content: null, generated_at: null, from_cache: false };
    }

    const companyId = ctx.user.company_id;
    const today = new Date().toISOString().split('T')[0];
    const hash = cacheKey(companyId, today);

    // ── Check cache in ai_conversations ──
    const admin = createAdminClient();

    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    // @ts-ignore — ai_conversations not in generated types
    const { data: cached } = await admin
      .from('ai_conversations' as never)
      .select('answer, created_at')
      .eq('company_id', companyId)
      .eq('question', `daily_briefing:${hash}`)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((cached as any)?.answer) {
      return {
        content: (cached as any).answer as string,
        generated_at: (cached as any).created_at as string,
        from_cache: true,
      };
    }

    // ── Gather data for prompt ──
    const supabase = await createClient();

    // 1. Critical alerts (unread, today or recent)
    const { data: alerts } = await supabase
      .from('alerts')
      .select('severity, title, message')
      .eq('is_read', false)
      .in('severity', ['critical', 'high'])
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Maintenance scheduled today
    const { data: maintenances } = await supabase
      .from('maintenance_records')
      .select('description, status, vehicles:vehicle_id(registration_number)')
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'])
      .limit(5);

    // 3. Vehicle documents expiring within 7 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiryLimit = thirtyDaysFromNow.toISOString().split('T')[0];

    const { data: expiringVehicles } = await supabase
      .from('vehicles')
      .select('registration_number, technical_control_expiry, insurance_expiry, tachy_control_expiry, atp_expiry')
      .or(`technical_control_expiry.lte.${expiryLimit},insurance_expiry.lte.${expiryLimit},tachy_control_expiry.lte.${expiryLimit},atp_expiry.lte.${expiryLimit}`)
      .limit(5);

    // 4. Recent fuel anomalies (last 24h, high consumption)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: fuelAnomalies } = await supabase
      .from('fuel_records')
      .select('consumption_l_per_100km, quantity_liters, vehicles:vehicle_id(registration_number)')
      .gte('created_at', yesterday)
      .not('consumption_l_per_100km', 'is', null)
      .order('consumption_l_per_100km', { ascending: false })
      .limit(5);

    // Query 5 — Véhicules avec score IA faible
    const { data: lowScoreVehicles } = await (supabase as any)
      .from('vehicles')
      .select('registration_number, ai_global_score, ai_score_summary')
      .lt('ai_global_score', 60)
      .not('ai_global_score', 'is', null)
      .order('ai_global_score', { ascending: true })
      .limit(5);

    // Query 6 — Maintenances prédictives overdue/due
    const { data: overdueMaintenance } = await (supabase as any)
      .from('maintenance_predictions')
      .select('status, priority, estimated_due_date, days_until_due, km_until_due, vehicles:vehicle_id(registration_number)')
      .in('status', ['overdue', 'due'])
      .order('days_until_due', { ascending: true })
      .limit(5);

    // Query 7 — Documents conducteurs expirant sous 30j
    const { data: expiringDrivers } = await supabase
      .from('drivers')
      .select('first_name, last_name, license_expiry, medical_certificate_expiry, fcos_expiry, driver_card_expiry, adr_certificate_expiry')
      .or(`license_expiry.lte.${expiryLimit},medical_certificate_expiry.lte.${expiryLimit},fcos_expiry.lte.${expiryLimit},driver_card_expiry.lte.${expiryLimit},adr_certificate_expiry.lte.${expiryLimit}`)
      .eq('is_active', true)
      .limit(5);

    // ── Build prompt (max ~800 tokens input) ──
    const sections: string[] = [];

    if (alerts && alerts.length > 0) {
      const list = alerts.map((a: any) => `- [${a.severity}] ${a.title}: ${a.message}`).join('\n');
      sections.push(`ALERTES CRITIQUES (${alerts.length}):\n${list}`);
    } else {
      sections.push('ALERTES CRITIQUES: Aucune alerte critique en cours.');
    }

    if (maintenances && maintenances.length > 0) {
      const list = maintenances.map((m: any) => {
        const reg = (m.vehicles as any)?.registration_number || '?';
        return `- ${reg}: ${m.description || 'Maintenance'} (${m.status})`;
      }).join('\n');
      sections.push(`MAINTENANCES EN COURS (${maintenances.length}):\n${list}`);
    } else {
      sections.push('MAINTENANCES: Aucune maintenance planifiée aujourd\'hui.');
    }

    if (expiringVehicles && expiringVehicles.length > 0) {
      const list = expiringVehicles.map((v: any) => {
        const docs: string[] = [];
        if (v.technical_control_expiry && v.technical_control_expiry <= expiryLimit) docs.push(`CT: ${v.technical_control_expiry}`);
        if (v.insurance_expiry && v.insurance_expiry <= expiryLimit) docs.push(`Assurance: ${v.insurance_expiry}`);
        if (v.tachy_control_expiry && v.tachy_control_expiry <= expiryLimit) docs.push(`Tachy: ${v.tachy_control_expiry}`);
        if (v.atp_expiry && v.atp_expiry <= expiryLimit) docs.push(`ATP: ${v.atp_expiry}`);
        return `- ${v.registration_number}: ${docs.join(', ')}`;
      }).join('\n');
      sections.push(`DOCUMENTS VÉHICULES EXPIRANT SOUS 30 JOURS (${expiringVehicles.length}):\n${list}`);
    } else {
      sections.push('DOCUMENTS: Tous les documents sont à jour.');
    }

    if (fuelAnomalies && fuelAnomalies.length > 0) {
      const suspicious = fuelAnomalies.filter((f: any) => f.consumption_l_per_100km > 20);
      if (suspicious.length > 0) {
        const list = suspicious.map((f: any) => {
          const reg = (f.vehicles as any)?.registration_number || '?';
          return `- ${reg}: ${f.consumption_l_per_100km?.toFixed(1)} L/100km`;
        }).join('\n');
        sections.push(`ANOMALIES CARBURANT (24h, ${suspicious.length}):\n${list}`);
      }
    }

    if (lowScoreVehicles && lowScoreVehicles.length > 0) {
      sections.push(
        `VÉHICULES AVEC SCORE IA FAIBLE (${lowScoreVehicles.length}):\n` +
        lowScoreVehicles.map((v: any) =>
          `- ${v.registration_number}: score ${v.ai_global_score}/100 — ${v.ai_score_summary || 'à analyser'}`
        ).join('\n')
      );
    }

    if (overdueMaintenance && overdueMaintenance.length > 0) {
      sections.push(
        `MAINTENANCES PRÉDICTIVES EN RETARD OU DUES (${overdueMaintenance.length}):\n` +
        overdueMaintenance.map((m: any) => {
          const reg = m.vehicles?.registration_number || 'N/A';
          const statusLabel = m.status === 'overdue' ? 'EN RETARD' : 'DUE';
          const days = m.days_until_due !== null ? `${m.days_until_due}j` : '';
          return `- ${reg}: ${statusLabel} (${m.priority}) ${days} — ${m.estimated_due_date || ''}`;
        }).join('\n')
      );
    }

    if (expiringDrivers && expiringDrivers.length > 0) {
      sections.push(
        `DOCUMENTS CONDUCTEURS EXPIRANT SOUS 30 JOURS (${expiringDrivers.length}):\n` +
        expiringDrivers.map((d: any) => {
          const name = `${d.first_name} ${d.last_name}`;
          const docs: string[] = [];
          if (d.license_expiry) docs.push(`Permis: ${d.license_expiry}`);
          if (d.medical_certificate_expiry) docs.push(`Visite médicale: ${d.medical_certificate_expiry}`);
          if (d.fcos_expiry) docs.push(`FCOS: ${d.fcos_expiry}`);
          if (d.driver_card_expiry) docs.push(`Carte tachy: ${d.driver_card_expiry}`);
          if (d.adr_certificate_expiry) docs.push(`ADR: ${d.adr_certificate_expiry}`);
          return `- ${name}: ${docs.join(', ')}`;
        }).join('\n')
      );
    }

    const userPrompt = `Date du jour: ${today}\n\n${sections.join('\n\n')}\n\nGénère le briefing matinal.`;

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    // ── Call OpenAI ──
    const result = await callAI(messages, MAX_OUTPUT_TOKENS);

    if (!result) {
      return { content: null, generated_at: null, from_cache: false };
    }

    // ── Save to cache ──
    try {
      // @ts-ignore — ai_conversations not in generated types
      await admin.from('ai_conversations' as never).insert({
        company_id: companyId,
        question: `daily_briefing:${hash}`,
        answer: result,
      } as never);
    } catch (err) {
      logger.error('[AI Briefing] Failed to cache result', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      content: result,
      generated_at: new Date().toISOString(),
      from_cache: false,
    };
  });
