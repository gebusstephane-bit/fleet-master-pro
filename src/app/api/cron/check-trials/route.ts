/**
 * Cron Job : Vérification et downgrade des essais expirés
 * 
 * Exécuté quotidiennement pour :
 * 1. Identifier les abonnements en essai dont trial_ends_at est dépassé
 * 2. Downgrader vers le plan ESSENTIAL avec limite de 1 véhicule
 * 3. Mettre à jour le statut des entreprises concernées
 * 
 * Schedule : 0 6 * * * (tous les jours à 6h du matin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_LIMITS, PLAN_PRICES } from '@/lib/plans';
import type { PlanType } from '@/lib/plans';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/client';
import { trialEndingEmailTemplate, trialEndingEmailText } from '@/lib/email/templates/trial-ending';

// Limites issues de la source de vérité unique (plans.ts)
const ESSENTIAL_VEHICLE_LIMIT = PLAN_LIMITS.ESSENTIAL.vehicleLimit; // 5
const ESSENTIAL_USER_LIMIT = PLAN_LIMITS.ESSENTIAL.userLimit;       // 10

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Vérifier le secret Vercel Cron
    const authHeader = request.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const secret =
      bearerSecret ||
      request.headers.get('x-vercel-cron-secret') ||
      request.headers.get('x-cron-secret') ||
      request.nextUrl.searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      logger.warn('[check-trials] Tentative d\'accès non autorisée');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    logger.info(`[check-trials] Début vérification à ${new Date().toISOString()}`);

    // 0. RAPPELS J-3 : essais expirant dans 3 jours (flux gratuit sans Stripe)
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const in4Days = new Date();
    in4Days.setDate(in4Days.getDate() + 4);

    const { data: upcomingTrials } = await supabase
      .from('subscriptions')
      .select('id, company_id, plan, trial_ends_at')
      .eq('status', 'TRIALING')
      .is('stripe_customer_id', null) // flux gratuit uniquement (pas de Stripe)
      .gte('trial_ends_at', in3Days.toISOString())
      .lt('trial_ends_at', in4Days.toISOString());

    if (upcomingTrials && upcomingTrials.length > 0) {
      logger.info(`[check-trials] ${upcomingTrials.length} rappel(s) J-3 à envoyer`);

      for (const trial of upcomingTrials) {
        try {
          // Anti-doublon : vérifier si un rappel a déjà été logué
          const { data: existingReminder } = await supabase
            .from('activity_logs')
            .select('id')
            .eq('company_id', trial.company_id)
            .eq('action_type', 'trial_reminder_sent')
            .maybeSingle();

          if (existingReminder) {
            logger.debug(`[check-trials] Rappel déjà envoyé pour company ${trial.company_id}`);
            continue;
          }

          // Récupérer admin + company
          const [{ data: company }, { data: admin }] = await Promise.all([
            supabase.from('companies').select('name, email').eq('id', trial.company_id).single(),
            supabase.from('profiles').select('email, first_name').eq('company_id', trial.company_id).eq('role', 'ADMIN').order('created_at', { ascending: true }).limit(1).single(),
          ]);

          const recipientEmail = admin?.email || company?.email;
          if (!recipientEmail || !company?.name) continue;

          const plan = (trial.plan as PlanType) || 'PRO';
          const planPrice = PLAN_PRICES[plan]?.monthly ?? 49;
          const planName = plan.charAt(0) + plan.slice(1).toLowerCase();
          const trialEndsAt = new Date(trial.trial_ends_at!);
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
          const billingUrl = `${appUrl}/dashboard/settings/billing`;

          await sendEmail({
            to: recipientEmail,
            subject: `Votre essai Fleet-Master se termine dans 3 jours`,
            html: trialEndingEmailTemplate({
              firstName: admin?.first_name ?? undefined,
              companyName: company.name,
              trialEndsAt,
              planName,
              planPrice,
              billingUrl,
            }),
            text: trialEndingEmailText({
              companyName: company.name,
              firstName: admin?.first_name ?? undefined,
              trialEndsAt,
              planName,
              planPrice,
              billingUrl,
            }),
          });

          // Logger pour anti-doublon
          await supabase.from('activity_logs').insert({
            company_id: trial.company_id,
            action_type: 'trial_reminder_sent',
            entity_type: 'subscription',
            entity_id: trial.id,
            description: 'Rappel fin de trial envoyé (J-3)',
            metadata: { trial_ends_at: trial.trial_ends_at, plan },
          });

          logger.info(`[check-trials] Rappel J-3 envoyé à ${recipientEmail} (company: ${trial.company_id})`);
        } catch (reminderError: any) {
          logger.error(`[check-trials] Erreur rappel company ${trial.company_id}:`, reminderError);
        }
      }
    }

    // 1. RÉCUPÉRER LES ESSAIS EXPIRÉS
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        company_id,
        plan,
        status,
        trial_ends_at,
        vehicle_limit,
        user_limit
      `)
      .eq('status', 'TRIALING')
      .lt('trial_ends_at', now);

    if (fetchError) {
      logger.error('[check-trials] Erreur récupération essais expirés:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired trials', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      logger.debug('[check-trials] Aucun essai expiré trouvé');
      return NextResponse.json({
        success: true,
        message: 'No expired trials found',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    logger.info(`[check-trials] ${expiredTrials.length} essai(s) expiré(s) trouvé(s)`);

    // 2. DOWNGRADER CHAQUE ESSAI EXPIRÉ
    const results = [];
    const errors = [];

    for (const trial of expiredTrials) {
      try {
        logger.debug(`[check-trials] Traitement company ${trial.company_id}...`);

        // 2a. Mettre à jour la subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan: 'ESSENTIAL',
            status: 'ACTIVE', // Plus en essai
            vehicle_limit: ESSENTIAL_VEHICLE_LIMIT,
            user_limit: ESSENTIAL_USER_LIMIT,
            trial_ends_at: null, // Réinitialiser
            updated_at: new Date().toISOString(),
          })
          .eq('id', trial.id);

        if (subError) {
          throw new Error(`Erreur mise à jour subscription: ${subError.message}`);
        }

        // 2b. Mettre à jour la company
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            subscription_plan: 'essential',
            subscription_status: 'active',
            max_vehicles: ESSENTIAL_VEHICLE_LIMIT,
            max_drivers: ESSENTIAL_USER_LIMIT,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trial.company_id);

        if (companyError) {
          throw new Error(`Erreur mise à jour company: ${companyError.message}`);
        }

        // 2c. Logger l'activité
        await supabase.from('activity_logs').insert({
          company_id: trial.company_id,
          action_type: 'trial_expired_downgrade',
          entity_type: 'subscription',
          entity_id: trial.id,
          description: `Essai expiré - Downgrade vers ESSENTIAL (${ESSENTIAL_VEHICLE_LIMIT} véhicule(s))`,
          metadata: {
            previous_plan: trial.plan,
            new_plan: 'ESSENTIAL',
            previous_vehicle_limit: trial.vehicle_limit,
            new_vehicle_limit: ESSENTIAL_VEHICLE_LIMIT,
            trial_ended_at: now,
          },
        });

        results.push({
          companyId: trial.company_id,
          previousPlan: trial.plan,
          success: true,
        });

        logger.info(`[check-trials] ✓ Company ${trial.company_id} downgradée avec succès`);

      } catch (error: any) {
        logger.error(`[check-trials] ✗ Erreur company ${trial.company_id}:`, error);
        errors.push({
          companyId: trial.company_id,
          error: error.message,
        });
      }
    }

    // 3. ENVOYER LES NOTIFICATIONS (optionnel - peut être fait via email service)
    // Pour l'instant, on se contente de logger
    if (results.length > 0) {
      logger.info(`[check-trials] ${results.length} downgrades effectués`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredTrials.length} expired trials`,
      processed: results.length,
      reminders_sent: upcomingTrials?.length ?? 0,
      errors: errors.length > 0 ? errors : undefined,
      duration,
      timestamp: now,
    });

  } catch (error: any) {
    logger.error('[check-trials] Erreur critique:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST handler (pour tests manuels)
export const POST = GET;

export const dynamic = 'force-dynamic';
