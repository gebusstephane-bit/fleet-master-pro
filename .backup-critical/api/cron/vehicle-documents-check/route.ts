/**
 * CRON JOB — Vérification échéances documents véhicules
 *
 * Exécution : tous les jours à 8h (configuré dans vercel.json)
 * Sécurité  : header x-cron-secret ou query param ?secret=
 *
 * Documents contrôlés :
 *   - CT   → technical_control_expiry
 *   - TACHY → tachy_control_expiry
 *   - ATP  → atp_expiry
 *
 * Niveaux d'alerte :
 *   - J60 : ≤ 60 jours → rappel standard
 *   - J30 : ≤ 30 jours → alerte
 *   - J0  : ≤ 0 jours  → URGENT / immobilisation
 *
 * Anti-doublon : table document_alert_logs
 *   UNIQUE (vehicle_id, document_type, alert_level, expiry_date)
 *   → une seule alerte par niveau par cycle d'expiration
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/vehicle-documents-check?secret=VOTRE_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

// ============================================================
// CONFIGURATION
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;

const DOCUMENTS = [
  {
    field: 'technical_control_expiry' as const,
    type: 'CT',
    label: 'Contrôle Technique (CT)',
  },
  {
    field: 'tachy_control_expiry' as const,
    type: 'TACHY',
    label: 'Contrôle Tachygraphe',
  },
  {
    field: 'atp_expiry' as const,
    type: 'ATP',
    label: 'Certificat ATP',
  },
] as const;

// ============================================================
// UTILITAIRES
// ============================================================

function getDaysLeft(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getAlertLevel(daysLeft: number): 'J60' | 'J30' | 'J0' | null {
  if (daysLeft <= 0) return 'J0';
  if (daysLeft <= 30) return 'J30';
  if (daysLeft <= 60) return 'J60';
  return null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================
// TEMPLATES EMAIL (3 niveaux)
// ============================================================

function buildEmailContent(
  alertLevel: 'J60' | 'J30' | 'J0',
  vehicle: { registration_number: string; brand: string; model: string },
  documentLabel: string,
  daysLeft: number,
  expiryDate: string
): { subject: string; html: string } {
  const formattedExpiry = formatDate(expiryDate);
  const vehicleRef = `${vehicle.registration_number} (${vehicle.brand} ${vehicle.model})`;

  if (alertLevel === 'J0') {
    const overdue = Math.abs(daysLeft);
    return {
      subject: `🚨 URGENT — ${documentLabel} périmé — IMMOBILISATION — ${vehicle.registration_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #dc2626;">
          <div style="background:#fef2f2;padding:20px;">
            <h2 style="color:#dc2626;margin:0;">🚨 DOCUMENT PÉRIMÉ — ACTION IMMÉDIATE REQUISE</h2>
          </div>
          <div style="padding:24px;">
            <p>
              Le <strong>${documentLabel}</strong> du véhicule <strong>${vehicleRef}</strong> est
              <strong style="color:#dc2626;">périmé depuis ${overdue} jour(s)</strong>.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#dc2626;font-weight:bold;">
                ⛔ Ce véhicule doit être immobilisé immédiatement jusqu'au renouvellement du document.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Véhicule</td>
                <td style="padding:8px;">${vehicleRef}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td>
                <td style="padding:8px;">${documentLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Date d'expiration</td>
                <td style="padding:8px;color:#dc2626;font-weight:bold;">${formattedExpiry}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Statut</td>
                <td style="padding:8px;color:#dc2626;font-weight:bold;">PÉRIMÉ (${overdue} j)</td>
              </tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents véhicules
          </div>
        </div>
      `,
    };
  }

  if (alertLevel === 'J30') {
    return {
      subject: `⚠️ ALERTE — Échéance critique ${documentLabel} dans ${daysLeft}j — ${vehicle.registration_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #f59e0b;">
          <div style="background:#fffbeb;padding:20px;">
            <h2 style="color:#d97706;margin:0;">⚠️ ALERTE — Échéance dans ${daysLeft} jours</h2>
          </div>
          <div style="padding:24px;">
            <p>
              Le <strong>${documentLabel}</strong> du véhicule <strong>${vehicleRef}</strong>
              expire dans <strong style="color:#d97706;">${daysLeft} jours</strong>.
            </p>
            <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#92400e;">
                Action requise : planifiez le renouvellement de ce document dès maintenant pour éviter l'immobilisation du véhicule.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Véhicule</td>
                <td style="padding:8px;">${vehicleRef}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td>
                <td style="padding:8px;">${documentLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Date d'expiration</td>
                <td style="padding:8px;color:#d97706;font-weight:bold;">${formattedExpiry}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td>
                <td style="padding:8px;color:#d97706;font-weight:bold;">${daysLeft} jours</td>
              </tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents véhicules
          </div>
        </div>
      `,
    };
  }

  // J60 — Rappel standard
  return {
    subject: `📅 Rappel échéance ${documentLabel} dans ${daysLeft}j — ${vehicle.registration_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #3b82f6;">
        <div style="background:#eff6ff;padding:20px;">
          <h2 style="color:#1d4ed8;margin:0;">📅 Rappel — Échéance document dans ${daysLeft} jours</h2>
        </div>
        <div style="padding:24px;">
          <p>
            Le <strong>${documentLabel}</strong> du véhicule <strong>${vehicleRef}</strong>
            expire dans <strong>${daysLeft} jours</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Véhicule</td>
              <td style="padding:8px;">${vehicleRef}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td>
              <td style="padding:8px;">${documentLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Date d'expiration</td>
              <td style="padding:8px;">${formattedExpiry}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td>
              <td style="padding:8px;">${daysLeft} jours</td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:14px;">
            Pensez à programmer le renouvellement de ce document à l'avance.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
          FleetMaster Pro — Alerte automatique documents véhicules
        </div>
      </div>
    `,
  };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  // --- Authentification cron ---
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stats = {
    vehicles_scanned: 0,
    alerts_sent: 0,
    skipped_no_date: 0,
    skipped_already_sent: 0,
    skipped_no_threshold: 0,
    errors: 0,
  };

  try {
    // 1. Récupérer tous les véhicules actifs
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(
        'id, company_id, registration_number, brand, model, technical_control_expiry, tachy_control_expiry, atp_expiry'
      )
      .eq('status', 'active');

    if (vehiclesError || !vehicles) {
      console.error('Cron: échec récupération véhicules', vehiclesError);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: vehiclesError?.message },
        { status: 500 }
      );
    }

    stats.vehicles_scanned = vehicles.length;

    // 2. Pré-charger les destinataires par company (éviter N+1)
    const companyIds = [...new Set(vehicles.map((v) => v.company_id))];
    const recipientsByCompany = new Map<string, string[]>();

    for (const companyId of companyIds) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', companyId)
        .in('role', ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'])
        .not('email', 'is', null);

      const emails = (profiles || [])
        .map((p) => p.email)
        .filter((e): e is string => !!e);

      recipientsByCompany.set(companyId, emails);
    }

    // 3. Scanner chaque véhicule × chaque document
    for (const vehicle of vehicles) {
      const recipients = recipientsByCompany.get(vehicle.company_id) ?? [];
      if (recipients.length === 0) continue;

      for (const doc of DOCUMENTS) {
        const expiryDate = vehicle[doc.field] as string | null;

        // Règle : date null → pas d'alerte
        if (!expiryDate) {
          stats.skipped_no_date++;
          continue;
        }

        const daysLeft = getDaysLeft(expiryDate);
        const alertLevel = getAlertLevel(daysLeft);

        // Règle : hors seuil → pas d'alerte
        if (!alertLevel) {
          stats.skipped_no_threshold++;
          continue;
        }

        // 4. Anti-doublon : déjà envoyé pour cette expiration ?
        const { data: existing } = await supabase
          .from('document_alert_logs' as any)
          .select('id')
          .eq('vehicle_id', vehicle.id)
          .eq('document_type', doc.type)
          .eq('alert_level', alertLevel)
          .eq('expiry_date', expiryDate)
          .maybeSingle();

        if (existing) {
          stats.skipped_already_sent++;
          continue;
        }

        // 5. Envoyer les emails (non-bloquant si erreur)
        try {
          const { subject, html } = buildEmailContent(
            alertLevel,
            vehicle,
            doc.label,
            daysLeft,
            expiryDate
          );

          for (const email of recipients) {
            await sendEmail({ to: email, subject, html });
          }

          // 6. Logger l'alerte pour éviter les doublons futurs
          await supabase
            .from('document_alert_logs' as any)
            .insert({
              vehicle_id: vehicle.id,
              company_id: vehicle.company_id,
              document_type: doc.type,
              alert_level: alertLevel,
              expiry_date: expiryDate,
            });

          stats.alerts_sent++;
          console.log(
            `✅ Alert ${alertLevel} sent: ${vehicle.registration_number} / ${doc.type} / expires ${expiryDate}`
          );
        } catch (err: any) {
          // Ne jamais bloquer le cron si un email échoue
          stats.errors++;
          console.error(
            `❌ Alert error: ${vehicle.registration_number} / ${doc.type}`,
            err.message
          );
        }
      }
    }

    console.log('Cron vehicle-documents-check completed:', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (err: any) {
    console.error('Cron fatal error:', err);
    return NextResponse.json(
      { error: 'Cron job failed', details: err.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
