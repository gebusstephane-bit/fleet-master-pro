/**
 * CRON : Rapport hebdomadaire flotte IA — lundi 08h00
 * Auth : x-cron-secret header ou ?secret= query param
 *
 * 1. Récupérer les tenants éligibles (PRO/UNLIMITED, pas unsubscribed, pas envoyé <6j)
 * 2. Pour chaque tenant : agrégation SQL des scores → template email → Resend
 * 3. Tracker l'envoi dans ai_report_sends
 *
 * Zéro appel OpenAI — lecture BDD uniquement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { weeklyFleetReportTemplate, weeklyFleetReportText, type WeeklyFleetReportData } from '@/lib/email/templates/weekly-fleet-report';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SIX_DAYS_AGO_MS = 6 * 24 * 60 * 60 * 1000;
const DELAY_BETWEEN_SENDS_MS = 100;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fleetmaster.pro';

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-vercel-cron-secret') ||
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const sixDaysAgo = new Date(now.getTime() - SIX_DAYS_AGO_MS).toISOString();
  const reportDate = format(now, 'd MMMM yyyy', { locale: fr });

  let totalSent = 0;
  let totalSkipped = 0;

  try {
    // 1. Récupérer les tenants éligibles :
    //    - Plan PRO ou UNLIMITED (via subscriptions)
    //    - Pas unsubscribed
    //    - Au moins 1 véhicule avec ai_global_score
    const { data: companies, error: compErr } = await admin
      .from('companies')
      .select('id, name')
      .or('subscription_plan.eq.PRO,subscription_plan.eq.UNLIMITED,subscription_plan.eq.pro,subscription_plan.eq.unlimited')
      .or('report_unsubscribed.is.null,report_unsubscribed.eq.false');

    if (compErr || !companies || companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No eligible companies',
        sent: 0,
      });
    }

    for (const company of companies as any[]) {
      try {
        // 2. Vérifier si déjà envoyé dans les 6 derniers jours
        const { data: recentSend } = await (admin as any)
          .from('ai_report_sends')
          .select('id')
          .eq('company_id', company.id)
          .eq('report_type', 'weekly_fleet')
          .gte('sent_at', sixDaysAgo)
          .limit(1);

        if (recentSend && recentSend.length > 0) {
          totalSkipped++;
          continue;
        }

        // 3. Agrégation des scores véhicules
        const { data: vehicles } = await (admin as any)
          .from('vehicles')
          .select('id, registration_number, type, ai_global_score, ai_score_summary')
          .eq('company_id', company.id)
          .eq('status', 'ACTIF')
          .is('deleted_at', null)
          .not('ai_global_score', 'is', null)
          .order('ai_global_score', { ascending: true });

        if (!vehicles || vehicles.length === 0) {
          totalSkipped++;
          continue;
        }

        // Calcul des stats
        const scores = (vehicles as any[]).map((v: any) => v.ai_global_score as number);
        const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        const criticalCount = scores.filter((s: number) => s < 40).length;
        const warningCount = scores.filter((s: number) => s >= 40 && s < 75).length;
        const goodCount = scores.filter((s: number) => s >= 75).length;

        // Top 3 véhicules critiques (score < 75)
        const criticalVehicles = (vehicles as any[])
          .filter((v: any) => v.ai_global_score < 75)
          .slice(0, 3)
          .map((v: any) => ({
            registration_number: v.registration_number,
            type: v.type,
            score: v.ai_global_score,
            summary: v.ai_score_summary,
          }));

        // 4. Récupérer les admins de ce tenant
        const { data: admins } = await admin
          .from('profiles')
          .select('email, first_name')
          .eq('company_id', company.id)
          .in('role', ['ADMIN', 'DIRECTEUR'])
          .eq('is_active', true)
          .not('email', 'is', null);

        if (!admins || admins.length === 0) {
          totalSkipped++;
          continue;
        }

        // 5. Envoyer à chaque admin
        const recipients = (admins as any[]).map((a: any) => a.email).filter(Boolean);
        const firstName = (admins as any[])[0]?.first_name || 'Gestionnaire';

        const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe-reports?company_id=${company.id}`;

        const templateData: WeeklyFleetReportData = {
          companyName: company.name,
          recipientFirstName: firstName,
          totalVehicles: vehicles.length,
          avgScore,
          criticalCount,
          warningCount,
          goodCount,
          criticalVehicles,
          reportDate,
          unsubscribeUrl,
          dashboardUrl: APP_URL,
        };

        const html = weeklyFleetReportTemplate(templateData);
        const text = weeklyFleetReportText(templateData);

        await sendEmail({
          to: recipients,
          subject: `📊 Rapport IA Flotte — ${company.name} (${reportDate})`,
          html,
          text,
        });

        // 6. Tracker l'envoi
        await (admin as any)
          .from('ai_report_sends')
          .insert({
            company_id: company.id,
            report_type: 'weekly_fleet',
            vehicles_count: vehicles.length,
            critical_count: criticalCount,
          });

        totalSent++;

        // Rate limit : 100ms entre chaque tenant
        if (totalSent < companies.length) {
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SENDS_MS));
        }
      } catch (err) {
        logger.error('[Weekly Report] Failed for company', {
          companyId: company.id?.substring(0, 8),
          error: err instanceof Error ? err.message : String(err),
        });
        totalSkipped++;
      }
    }

    logger.info('[Weekly Report] Completed', {
      sent: totalSent,
      skipped: totalSkipped,
      totalCompanies: companies.length,
    });

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      skipped: totalSkipped,
      totalCompanies: companies.length,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { module: 'cron_weekly_fleet_report' },
    });
    logger.error('[Weekly Report] Cron failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Weekly fleet report failed' },
      { status: 500 }
    );
  }
}
