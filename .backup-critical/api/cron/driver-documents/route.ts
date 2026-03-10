/**
 * CRON JOB — Vérification échéances documents conducteurs
 *
 * Exécution  : tous les jours à 8h (configuré dans vercel.json)
 * Sécurité   : header x-cron-secret ou query param ?secret=
 * Parallèle  : système indépendant du cron véhicules (vehicle-documents-check)
 *
 * Documents contrôlés :
 *   - LICENSE → license_expiry  (requis, jamais null)
 *   - CQC     → cqc_expiry_date (optionnel, peut être null → ignoré)
 *
 * Niveaux d'alerte :
 *   - J60 : ≤ 60 jours → rappel standard
 *   - J30 : ≤ 30 jours → alerte urgente
 *   - J0  : ≤ 0 jours  → document périmé / immobilisation
 *
 * Destinataires :
 *   - ADMIN + DIRECTEUR de la même company
 *   - Le conducteur lui-même (driver.email)
 *   - Si driver.email vide : ADMIN+DIRECTEUR uniquement + mention "non joignable"
 *
 * Anti-doublon : table driver_alert_logs
 *   UNIQUE (driver_id, document_type, alert_level, expiry_date)
 *
 * Retry : 3 tentatives avec backoff linéaire (1s, 2s, 3s)
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/driver-documents?secret=fleet_cron_2026_secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, type EmailOptions } from '@/lib/email';

// ============================================================
// CONFIGURATION
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;

const DRIVER_DOCUMENTS = [
  {
    field: 'license_expiry' as const,
    type: 'LICENSE' as const,
    label: 'Permis de conduire',
  },
  {
    field: 'cqc_expiry_date' as const,
    type: 'CQC' as const,
    label: 'CQC (Certificat de Qualification Complémentaire)',
  },
] as const;

type DocumentType = 'LICENSE' | 'CQC';
type AlertLevel = 'J60' | 'J30' | 'J0';

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

function getAlertLevel(daysLeft: number): AlertLevel | null {
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

/** Envoi avec retry — 3 tentatives, backoff linéaire 1s/2s/3s */
async function sendEmailWithRetry(
  options: EmailOptions,
  maxRetries = 3
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendEmail(options);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// ============================================================
// TEMPLATES EMAIL — Permis de conduire
// ============================================================

function buildLicenseEmail(
  alertLevel: AlertLevel,
  driver: { first_name: string; last_name: string },
  daysLeft: number,
  expiryDate: string,
  isDriverRecipient: boolean
): { subject: string; html: string } {
  const driverName = `${driver.first_name} ${driver.last_name}`;
  const formattedExpiry = formatDate(expiryDate);
  const overdue = Math.abs(daysLeft);

  const subject = `[FleetMaster] Alertes documents conducteur — ${driverName}`;

  const personalNote = isDriverRecipient
    ? `<p>Bonjour <strong>${driver.first_name}</strong>,</p>`
    : `<p>Alerte concernant le conducteur <strong>${driverName}</strong> :</p>`;

  if (alertLevel === 'J0') {
    const driverMessage = isDriverRecipient
      ? `Votre permis de conduire est <strong style="color:#dc2626;">EXPIRÉ</strong>. Vous ne pouvez plus conduire légalement. Arrêt immédiat. Renouvellement obligatoire avant reprise.`
      : `Le permis de conduire de <strong>${driverName}</strong> est <strong style="color:#dc2626;">EXPIRÉ depuis ${overdue} jour(s)</strong>. Ce conducteur ne peut plus conduire légalement.`;

    return {
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #dc2626;">
          <div style="background:#fef2f2;padding:20px;">
            <h2 style="color:#dc2626;margin:0;">🚨 PERMIS EXPIRÉ — ARRÊT IMMÉDIAT</h2>
          </div>
          <div style="padding:24px;">
            ${personalNote}
            <p>${driverMessage}</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#dc2626;font-weight:bold;">
                ⛔ Immobilisation obligatoire jusqu'au renouvellement du permis.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">Permis de conduire</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Date d'expiration</td><td style="padding:8px;color:#dc2626;font-weight:bold;">${formattedExpiry}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Statut</td><td style="padding:8px;color:#dc2626;font-weight:bold;">EXPIRÉ (${overdue} j)</td></tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents conducteurs
          </div>
        </div>
      `,
    };
  }

  if (alertLevel === 'J30') {
    const driverMessage = isDriverRecipient
      ? `⚠️ Votre permis de conduire expire dans <strong style="color:#d97706;">${daysLeft} jours</strong>. Action urgente : Visite médicale et demande de renouvellement immédiate.`
      : `⚠️ Le permis de conduire de <strong>${driverName}</strong> expire dans <strong style="color:#d97706;">${daysLeft} jours</strong>. Action requise.`;

    return {
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #f59e0b;">
          <div style="background:#fffbeb;padding:20px;">
            <h2 style="color:#d97706;margin:0;">⚠️ PERMIS — Échéance dans ${daysLeft} jours</h2>
          </div>
          <div style="padding:24px;">
            ${personalNote}
            <p>${driverMessage}</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#92400e;">
                Actions requises : Prenez rendez-vous chez un médecin spécialisé pour la visite médicale et effectuez une demande de renouvellement immédiatement.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">Permis de conduire</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;color:#d97706;font-weight:bold;">${formattedExpiry}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td><td style="padding:8px;color:#d97706;font-weight:bold;">${daysLeft} jours</td></tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents conducteurs
          </div>
        </div>
      `,
    };
  }

  // J60
  const driverMessage = isDriverRecipient
    ? `Votre permis de conduire arrive à échéance dans <strong>${daysLeft} jours</strong>. Prenez rendez-vous chez un médecin spécialisé pour la visite médicale et effectuez une demande de renouvellement.`
    : `Le permis de conduire de <strong>${driverName}</strong> arrive à échéance dans <strong>${daysLeft} jours</strong>.`;

  return {
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #3b82f6;">
        <div style="background:#eff6ff;padding:20px;">
          <h2 style="color:#1d4ed8;margin:0;">📅 Rappel — Permis de conduire dans ${daysLeft} jours</h2>
        </div>
        <div style="padding:24px;">
          ${personalNote}
          <p>${driverMessage}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">Permis de conduire</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;">${formattedExpiry}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td><td style="padding:8px;">${daysLeft} jours</td></tr>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
          FleetMaster Pro — Alerte automatique documents conducteurs
        </div>
      </div>
    `,
  };
}

// ============================================================
// TEMPLATES EMAIL — CQC
// ============================================================

function buildCqcEmail(
  alertLevel: AlertLevel,
  driver: { first_name: string; last_name: string },
  daysLeft: number,
  expiryDate: string,
  isDriverRecipient: boolean
): { subject: string; html: string } {
  const driverName = `${driver.first_name} ${driver.last_name}`;
  const formattedExpiry = formatDate(expiryDate);
  const overdue = Math.abs(daysLeft);

  const subject = `[FleetMaster] Alertes documents conducteur — ${driverName}`;
  const personalNote = isDriverRecipient
    ? `<p>Bonjour <strong>${driver.first_name}</strong>,</p>`
    : `<p>Alerte concernant le conducteur <strong>${driverName}</strong> :</p>`;

  if (alertLevel === 'J0') {
    const driverMessage = isDriverRecipient
      ? `Votre CQC est <strong style="color:#dc2626;">EXPIRÉ</strong>. Vous n'êtes plus qualifié pour le transport de marchandises/personnes. Immobilisation jusqu'à renouvellement.`
      : `Le CQC de <strong>${driverName}</strong> est <strong style="color:#dc2626;">EXPIRÉ depuis ${overdue} jour(s)</strong>. Ce conducteur n'est plus qualifié.`;

    return {
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #dc2626;">
          <div style="background:#fef2f2;padding:20px;">
            <h2 style="color:#dc2626;margin:0;">🚨 CQC EXPIRÉ — IMMOBILISATION</h2>
          </div>
          <div style="padding:24px;">
            ${personalNote}
            <p>${driverMessage}</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#dc2626;font-weight:bold;">
                ⛔ Immobilisation obligatoire jusqu'au renouvellement du CQC.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">CQC</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;color:#dc2626;font-weight:bold;">${formattedExpiry}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Statut</td><td style="padding:8px;color:#dc2626;font-weight:bold;">EXPIRÉ (${overdue} j)</td></tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents conducteurs
          </div>
        </div>
      `,
    };
  }

  if (alertLevel === 'J30') {
    const driverMessage = isDriverRecipient
      ? `⚠️ Votre CQC expire dans <strong style="color:#d97706;">${daysLeft} jours</strong>. Action requise : Inscription formation ou évaluation obligatoire.`
      : `⚠️ Le CQC de <strong>${driverName}</strong> expire dans <strong style="color:#d97706;">${daysLeft} jours</strong>.`;

    return {
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #f59e0b;">
          <div style="background:#fffbeb;padding:20px;">
            <h2 style="color:#d97706;margin:0;">⚠️ CQC — Échéance dans ${daysLeft} jours</h2>
          </div>
          <div style="padding:24px;">
            ${personalNote}
            <p>${driverMessage}</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;color:#92400e;">
                Inscrivez-vous dès maintenant à une session de formation continue ou planifiez l'évaluation de renouvellement.
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">CQC</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;color:#d97706;font-weight:bold;">${formattedExpiry}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td><td style="padding:8px;color:#d97706;font-weight:bold;">${daysLeft} jours</td></tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
            FleetMaster Pro — Alerte automatique documents conducteurs
          </div>
        </div>
      `,
    };
  }

  // J60
  const driverMessage = isDriverRecipient
    ? `Votre CQC arrive à échéance dans <strong>${daysLeft} jours</strong>. Planifiez votre session de formation continue ou passez l'évaluation de renouvellement.`
    : `Le CQC de <strong>${driverName}</strong> arrive à échéance dans <strong>${daysLeft} jours</strong>.`;

  return {
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid #3b82f6;">
        <div style="background:#eff6ff;padding:20px;">
          <h2 style="color:#1d4ed8;margin:0;">📅 Rappel — CQC dans ${daysLeft} jours</h2>
        </div>
        <div style="padding:24px;">
          ${personalNote}
          <p>${driverMessage}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${`${driver.first_name} ${driver.last_name}`}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">CQC</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;">${formattedExpiry}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Jours restants</td><td style="padding:8px;">${daysLeft} jours</td></tr>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
          FleetMaster Pro — Alerte automatique documents conducteurs
        </div>
      </div>
    `,
  };
}

function buildEmailContent(
  docType: DocumentType,
  alertLevel: AlertLevel,
  driver: { first_name: string; last_name: string },
  daysLeft: number,
  expiryDate: string,
  isDriverRecipient: boolean
): { subject: string; html: string } {
  if (docType === 'LICENSE') {
    return buildLicenseEmail(alertLevel, driver, daysLeft, expiryDate, isDriverRecipient);
  }
  return buildCqcEmail(alertLevel, driver, daysLeft, expiryDate, isDriverRecipient);
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
    drivers_scanned: 0,
    alerts_sent: 0,
    skipped_no_date: 0,
    skipped_already_sent: 0,
    skipped_no_threshold: 0,
    driver_unreachable: 0,
    errors: 0,
  };

  try {
    // 1. Récupérer tous les conducteurs actifs
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, company_id, first_name, last_name, email, license_expiry, cqc_expiry_date')
      .eq('status', 'active');

    if (driversError || !drivers) {
      console.error('Cron driver-documents: échec récupération conducteurs', driversError);
      return NextResponse.json(
        { error: 'Failed to fetch drivers', details: driversError?.message },
        { status: 500 }
      );
    }

    stats.drivers_scanned = drivers.length;

    // 2. Pré-charger ADMIN+DIRECTEUR par company (éviter N+1)
    const companyIds = [...new Set(drivers.map((d) => d.company_id))];
    const managersByCompany = new Map<string, string[]>();

    for (const companyId of companyIds) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', companyId)
        .in('role', ['ADMIN', 'DIRECTEUR'])
        .not('email', 'is', null);

      const emails = (profiles || [])
        .map((p) => p.email)
        .filter((e): e is string => !!e);

      managersByCompany.set(companyId, emails);
    }

    // 3. Scanner chaque conducteur × chaque document
    for (const driver of drivers) {
      const managerEmails = managersByCompany.get(driver.company_id) ?? [];
      const driverEmail = driver.email?.trim() || null;
      const driverHasEmail = !!driverEmail;

      if (!driverHasEmail) {
        stats.driver_unreachable++;
      }

      for (const doc of DRIVER_DOCUMENTS) {
        const expiryDate = driver[doc.field] as string | null;

        // Règle : date null → pas d'alerte (CQC non renseigné = normal)
        if (!expiryDate) {
          stats.skipped_no_date++;
          continue;
        }

        const daysLeft = getDaysLeft(expiryDate);
        const alertLevel = getAlertLevel(daysLeft);

        // Hors seuil → pas d'alerte
        if (!alertLevel) {
          stats.skipped_no_threshold++;
          continue;
        }

        // 4. Anti-doublon : alerte déjà envoyée pour ce cycle d'expiration ?
        const { data: existing } = await supabase
          .from('driver_alert_logs' as any)
          .select('id')
          .eq('driver_id', driver.id)
          .eq('document_type', doc.type)
          .eq('alert_level', alertLevel)
          .eq('expiry_date', expiryDate)
          .maybeSingle();

        if (existing) {
          stats.skipped_already_sent++;
          continue;
        }

        // 5. Construire et envoyer les emails
        try {
          // Email personnalisé pour le conducteur (si email disponible)
          if (driverHasEmail) {
            const driverContent = buildEmailContent(
              doc.type,
              alertLevel,
              driver,
              daysLeft,
              expiryDate,
              true // isDriverRecipient
            );
            await sendEmailWithRetry({ to: driverEmail!, ...driverContent });
          }

          // Email pour ADMIN + DIRECTEUR
          for (const managerEmail of managerEmails) {
            // Si conducteur injoignable, mentionner dans le message manager
            const managerContent = driverHasEmail
              ? buildEmailContent(doc.type, alertLevel, driver, daysLeft, expiryDate, false)
              : buildNoEmailWarningContent(doc.type, alertLevel, driver, daysLeft, expiryDate);

            await sendEmailWithRetry({ to: managerEmail, ...managerContent });
          }

          // 6. Logger l'alerte pour éviter les doublons futurs
          await supabase
            .from('driver_alert_logs' as any)
            .insert({
              driver_id: driver.id,
              company_id: driver.company_id,
              document_type: doc.type,
              alert_level: alertLevel,
              expiry_date: expiryDate,
            });

          stats.alerts_sent++;
          console.log(
            `✅ Driver alert ${alertLevel}: ${driver.first_name} ${driver.last_name} / ${doc.type} / expires ${expiryDate}`
          );
        } catch (err: any) {
          stats.errors++;
          console.error(
            `❌ Driver alert error: ${driver.first_name} ${driver.last_name} / ${doc.type}`,
            err.message
          );
          // Log Sentry si disponible
          if (typeof (globalThis as any).Sentry?.captureException === 'function') {
            (globalThis as any).Sentry.captureException(err, {
              tags: { cron: 'driver-documents', driver_id: driver.id, doc_type: doc.type },
            });
          }
        }
      }
    }

    console.log('Cron driver-documents-check completed:', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (err: any) {
    console.error('Cron driver-documents fatal error:', err);
    return NextResponse.json(
      { error: 'Cron job failed', details: err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// EMAIL SPÉCIAL — Conducteur injoignable par email
// ============================================================

function buildNoEmailWarningContent(
  docType: DocumentType,
  alertLevel: AlertLevel,
  driver: { first_name: string; last_name: string },
  daysLeft: number,
  expiryDate: string
): { subject: string; html: string } {
  const driverName = `${driver.first_name} ${driver.last_name}`;
  const formattedExpiry = formatDate(expiryDate);
  const docLabel = docType === 'LICENSE' ? 'Permis de conduire' : 'CQC';
  const levelLabel = alertLevel === 'J0' ? 'EXPIRÉ' : `dans ${daysLeft} jours`;
  const levelColor = alertLevel === 'J0' ? '#dc2626' : alertLevel === 'J30' ? '#d97706' : '#1d4ed8';

  return {
    subject: `[FleetMaster] ⚠️ Conducteur non joignable — Alerte documents — ${driverName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-left:4px solid ${levelColor};">
        <div style="background:#f9fafb;padding:20px;">
          <h2 style="color:${levelColor};margin:0;">⚠️ Alerte document conducteur — Non joignable</h2>
        </div>
        <div style="padding:24px;">
          <p>Le conducteur <strong>${driverName}</strong> ne dispose pas d'adresse email dans le système.</p>
          <div style="background:#fef3c7;border:1px solid #fde68a;padding:16px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;color:#92400e;">
              ⚠️ Ce conducteur ne peut pas être notifié directement. Veuillez le contacter manuellement.
            </p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Conducteur</td><td style="padding:8px;">${driverName}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Document</td><td style="padding:8px;">${docLabel}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Expiration</td><td style="padding:8px;color:${levelColor};font-weight:bold;">${formattedExpiry}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Statut</td><td style="padding:8px;color:${levelColor};font-weight:bold;">${levelLabel}</td></tr>
            <tr><td style="padding:8px;background:#fef3c7;font-weight:bold;">Email conducteur</td><td style="padding:8px;color:#92400e;">Non renseigné</td></tr>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px;font-size:12px;color:#6b7280;">
          FleetMaster Pro — Alerte automatique documents conducteurs
        </div>
      </div>
    `,
  };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
