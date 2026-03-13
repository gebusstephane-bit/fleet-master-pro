'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { callAI, type AIMessage } from '@/lib/ai/openai-client';
import { logger } from '@/lib/logger';

const MAX_OUTPUT_TOKENS = 300;

const SYSTEM_PROMPT = `Tu es un expert en gestion de flotte. Analyse cette anomalie de consommation carburant et réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{"explanation":"explication concise en 1-2 phrases","hypotheses":["hypothèse 1","hypothèse 2"],"action":"action recommandée en 1 phrase"}
Réponds en français. Pas de markdown, pas de texte autour du JSON.`;

export const analyzeFuelAnomaly = authActionClient
  .schema(z.object({
    anomaly_id: z.string().uuid(),
  }))
  .action(async ({ ctx, parsedInput }) => {
    const { anomaly_id } = parsedInput as { anomaly_id: string };

    if (!ctx.user.company_id) {
      return { analysis: null };
    }

    const supabase = await createClient();

    // Check if analysis already exists (ai_analysis not in generated types)
    const { data: record } = await (supabase as any)
      .from('fuel_records')
      .select('id, vehicle_id, consumption_l_per_100km, quantity_liters, mileage_at_fill, fuel_type, date, notes, ai_analysis')
      .eq('id', anomaly_id)
      .single();

    if (!record) {
      return { analysis: null };
    }

    // Already analyzed — return cached result
    if ((record as any).ai_analysis) {
      return { analysis: (record as any).ai_analysis };
    }

    // Fetch vehicle info
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('registration_number, brand, model, type, mileage')
      .eq('id', record.vehicle_id)
      .single();

    // Fetch last 10 fills for this vehicle
    const { data: history } = await supabase
      .from('fuel_records')
      .select('consumption_l_per_100km, quantity_liters, mileage_at_fill, date')
      .eq('vehicle_id', record.vehicle_id)
      .not('consumption_l_per_100km', 'is', null)
      .order('date', { ascending: false })
      .limit(10);

    // Fetch driver if assigned
    const { data: assignment } = await supabase
      .from('vehicle_driver_assignments')
      .select('drivers:driver_id(first_name, last_name)')
      .eq('vehicle_id', record.vehicle_id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const driverName = (assignment as any)?.drivers
      ? `${(assignment as any).drivers.first_name} ${(assignment as any).drivers.last_name}`
      : 'Non assigné';

    // Compute average from history
    const validHistory = (history || []).filter((h: any) => h.consumption_l_per_100km);
    const avgConsumption = validHistory.length > 0
      ? validHistory.reduce((sum: number, h: any) => sum + h.consumption_l_per_100km, 0) / validHistory.length
      : 0;

    // Build prompt
    const userPrompt = `Véhicule: ${vehicle?.registration_number || '?'} (${vehicle?.brand || ''} ${vehicle?.model || ''}, type: ${vehicle?.type || '?'}, ${vehicle?.mileage || 0} km)
Conducteur: ${driverName}
Plein analysé: ${record.date}, ${record.quantity_liters}L, ${record.consumption_l_per_100km?.toFixed(1)} L/100km
Moyenne historique (${validHistory.length} pleins): ${avgConsumption.toFixed(1)} L/100km
Déviation: ${avgConsumption > 0 ? (((record.consumption_l_per_100km! - avgConsumption) / avgConsumption) * 100).toFixed(0) : '?'}%
Type carburant: ${record.fuel_type}`;

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const result = await callAI(messages, MAX_OUTPUT_TOKENS);

    if (!result) {
      return { analysis: null };
    }

    // Parse JSON response
    let analysis: { explanation: string; hypotheses: string[]; action: string } | null = null;
    try {
      analysis = JSON.parse(result);
      // Validate shape
      if (!analysis || typeof analysis.explanation !== 'string' || !Array.isArray(analysis.hypotheses) || typeof analysis.action !== 'string') {
        analysis = null;
      }
    } catch {
      logger.warn('[AI Fuel] Failed to parse JSON response', { raw: result.substring(0, 200) });
      return { analysis: null };
    }

    // Save analysis to fuel_records
    if (analysis) {
      try {
        const admin = createAdminClient();
        await (admin as any)
          .from('fuel_records')
          .update({ ai_analysis: analysis })
          .eq('id', anomaly_id);
      } catch (err) {
        logger.error('[AI Fuel] Failed to save analysis', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { analysis };
  });
