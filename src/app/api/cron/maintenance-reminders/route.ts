/**
 * CRON JOB — Rappels email J-1 pour les RDV maintenance
 *
 * Exécution : tous les jours à 11h00 UTC (= 12h00 CET / 13h00 CEST)
 * Configuré dans vercel.json : "0 11 * * *"
 *
 * Logique :
 *   - Récupère les maintenance_records avec rdv_date = DEMAIN
 *   - Statuts ciblés : RDV_PRIS, VALIDEE_DIRECTEUR
 *   - Envoie un email aux profils actifs de la company
 *     (rôles : DIRECTEUR, AGENT_DE_PARC, EXPLOITANT)
 *   - Déduplication via table maintenance_reminders
 *     → UNIQUE (maintenance_record_id, recipient_email, 'J-1_12h')
 *
 * Sécurité :
 *   - Header x-cron-secret ou query param ?secret=
 *   - company_id du RDV = company_id du destinataire (anti fuite)
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/maintenance-reminders?secret=VOTRE_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

// ============================================================
// CONFIG
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';

// Rôles qui reçoivent les rappels maintenance
const RECIPIENT_ROLES = ['DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'] as const;

// ============================================================
// UTILITAIRES
// ============================================================

function getTomorrowDateStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  // TIME type: '14:30:00' → '14h30'
  const [h, m] = timeStr.split(':');
  return `${h}h${m}`;
}

function formatDuration(estimated_days: number | null, estimated_hours: number | null): string {
  const days = estimated_days ?? 0;
  const hours = estimated_hours ?? 0;
  if (days > 0 && hours > 0) return `${days} jour(s) et ${hours}h`;
  if (days > 0) return `${days} jour(s)`;
  if (hours > 0) return `${hours}h estimée(s)`;
  return 'Non précisée';
}

// ============================================================
// TEMPLATE EMAIL
// ============================================================

function buildReminderEmail(params: {
  vehicleLabel: string;   // 'Ford Transit - AB-123-CD'
  rdvDateFR: string;      // 'mardi 25 février 2025'
  rdvTime: string;        // '08h30'
  garageName: string | null;
  garageAddress: string | null;
  durationLabel: string;
  maintenanceId: string;
}): { subject: string; html: string } {
  const { vehicleLabel, rdvDateFR, rdvTime, garageName, garageAddress, durationLabel, maintenanceId } = params;

  const garageSection =
    garageName || garageAddress
      ? `
        <tr>
          <td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Garage</td>
          <td style="padding:8px;">${garageName ?? '—'}</td>
        </tr>
        ${garageAddress ? `
        <tr>
          <td style="padding:8px;background:#f9fafb;font-weight:bold;">Adresse</td>
          <td style="padding:8px;">${garageAddress}</td>
        </tr>` : ''}
      `
      : `
        <tr>
          <td style="padding:8px;background:#f9fafb;font-weight:bold;">Garage</td>
          <td style="padding:8px;color:#9ca3af;">Non renseigné</td>
        </tr>
      `;

  return {
    subject: `🔔 Rappel RDV maintenance demain — ${vehicleLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #2563eb;">
        <div style="background:#eff6ff;padding:20px 24px;">
          <h2 style="color:#1d4ed8;margin:0;font-size:18px;">
            🔔 Rappel — RDV maintenance demain
          </h2>
          <p style="color:#3730a3;margin:6px 0 0;font-size:14px;">
            FleetMaster Pro · Rappel automatique J-1
          </p>
        </div>

        <div style="padding:24px;">
          <p style="font-size:15px;color:#374151;margin:0 0 20px;">
            Un RDV de maintenance est prévu <strong>demain</strong> pour le véhicule
            <strong>${vehicleLabel}</strong>.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Véhicule</td>
              <td style="padding:8px;font-weight:bold;color:#111827;">${vehicleLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Date</td>
              <td style="padding:8px;">${rdvDateFR}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Heure</td>
              <td style="padding:8px;font-weight:bold;color:#2563eb;">${rdvTime}</td>
            </tr>
            ${garageSection}
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Durée estimée</td>
              <td style="padding:8px;">${durationLabel}</td>
            </tr>
          </table>

          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
            <p style="margin:0;color:#92400e;font-size:14px;">
              ⚠️ Pensez à préparer le véhicule (documents de bord, clés de rechange) et à informer le conducteur.
            </p>
          </div>

          <center>
            <a href="${APP_URL}/dashboard/maintenance/${maintenanceId}"
               style="display:inline-block;background:#2563eb;color:white;padding:11px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
              Voir le détail de l'intervention
            </a>
          </center>
        </div>

        <div style="background:#f9fafb;padding:14px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
          FleetMaster Pro · Rappel automatique — Ne pas répondre à cet email
        </div>
      </div>
    `,
  };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  // ── Authentification ──────────────────────────────────────
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const stats = {
    rdvs_scanned: 0,
    emails_sent: 0,
    skipped_already_sent: 0,
    skipped_no_recipients: 0,
    skipped_inactive_vehicle: 0,
    errors: 0,
  };

  const tomorrowStr = getTomorrowDateStr();
  console.log(`Cron maintenance-reminders: scanning rdv_date = ${tomorrowStr}`);

  try {
    // ── 1. RDV de demain ──────────────────────────────────────
    const { data: records, error: recordsErr } = await supabase
      .from('maintenance_records')
      .select('id, company_id, vehicle_id, rdv_date, rdv_time, garage_name, garage_address, estimated_days, estimated_hours')
      .eq('rdv_date', tomorrowStr)
      .in('status', ['RDV_PRIS', 'VALIDEE_DIRECTEUR'])
      .not('rdv_time', 'is', null);

    if (recordsErr) {
      console.error('Cron: échec lecture maintenance_records', recordsErr);
      return NextResponse.json({ error: recordsErr.message }, { status: 500 });
    }

    if (!records || records.length === 0) {
      console.log('Cron maintenance-reminders: aucun RDV demain');
      return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...stats });
    }

    stats.rdvs_scanned = records.length;

    // ── 2. Véhicules actifs associés ──────────────────────────
    const vehicleIds = Array.from(new Set(records.map((r) => r.vehicle_id)));
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, status')
      .in('id', vehicleIds);

    const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id, v]));

    // ── 3. Destinataires par company (pré-chargement, évite N+1) ──
    const companyIds = Array.from(new Set(records.map((r) => r.company_id)));
    const recipientsByCompany = new Map<string, Array<{ email: string; role: string }>>();

    for (const companyId of companyIds) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('company_id', companyId)
        .in('role', RECIPIENT_ROLES)
        .eq('is_active', true)
        .not('email', 'is', null);

      const list = (profiles ?? []).filter((p): p is { email: string; role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' } => !!p.email);
      recipientsByCompany.set(companyId, list);
    }

    // ── 4. Traitement par RDV ─────────────────────────────────
    for (const record of records) {
      const vehicle = vehicleMap.get(record.vehicle_id);

      // Véhicule inexistant ou inactif/retraité → skip
      if (!vehicle || vehicle.status === 'inactive' || vehicle.status === 'retired') {
        stats.skipped_inactive_vehicle++;
        continue;
      }

      const recipients = recipientsByCompany.get(record.company_id) ?? [];
      if (recipients.length === 0) {
        stats.skipped_no_recipients++;
        continue;
      }

      const vehicleLabel = `${vehicle.brand} ${vehicle.model} — ${vehicle.registration_number}`;
      const rdvDateFR = formatDateFR(record.rdv_date ?? '');
      const rdvTime = formatTime(record.rdv_time ?? '');
      const durationLabel = formatDuration(record.estimated_days, record.estimated_hours);

      const { subject, html } = buildReminderEmail({
        vehicleLabel,
        rdvDateFR,
        rdvTime,
        garageName: record.garage_name,
        garageAddress: record.garage_address,
        durationLabel,
        maintenanceId: record.id,
      });

      // ── 5. Envoi par destinataire ──────────────────────────
      for (const recipient of recipients) {
        // Anti-doublon : déjà envoyé pour ce RDV × cet email ?
        const { data: existing } = await supabase
          .from('maintenance_reminders' as any)
          .select('id')
          .eq('maintenance_record_id', record.id)
          .eq('recipient_email', recipient.email)
          .eq('reminder_type', 'J-1_12h')
          .maybeSingle();

        if (existing) {
          stats.skipped_already_sent++;
          continue;
        }

        let sendStatus: 'sent' | 'failed' = 'sent';
        let errorMessage: string | undefined;

        try {
          await sendEmail({ to: recipient.email, subject, html });
          stats.emails_sent++;
          console.log(`✅ Reminder sent: ${vehicle.registration_number} → ${recipient.email}`);
        } catch (err: any) {
          sendStatus = 'failed';
          errorMessage = err.message;
          stats.errors++;
          console.error(`❌ Reminder error: ${vehicle.registration_number} → ${recipient.email}`, err.message);
        }

        // ── 6. Log dans maintenance_reminders (même si erreur) ──
        await supabase
          .from('maintenance_reminders' as any)
          .insert({
            maintenance_record_id: record.id,
            company_id: record.company_id,
            recipient_email: recipient.email,
            recipient_role: recipient.role,
            reminder_type: 'J-1_12h',
            status: sendStatus,
            error_message: errorMessage ?? null,
          });
      }
    }

    console.log('Cron maintenance-reminders completed:', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date_scanned: tomorrowStr,
      ...stats,
    });
  } catch (err: any) {
    console.error('Cron maintenance-reminders fatal error:', err);
    return NextResponse.json({ error: 'Cron job failed', details: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
