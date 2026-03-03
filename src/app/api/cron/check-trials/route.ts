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
import { PLAN_LIMITS } from '@/lib/plans';

// Configuration
const ESSENTIAL_VEHICLE_LIMIT = 1; // Limite après expiration de l'essai
const ESSENTIAL_USER_LIMIT = 1;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Vérifier le secret Vercel Cron
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;

    if (!isVercelCron && process.env.NODE_ENV === 'production') {
      console.warn('[check-trials] Tentative d\'accès non autorisée');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    console.log(`[check-trials] Début vérification à ${new Date().toISOString()}`);

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
      console.error('[check-trials] Erreur récupération essais expirés:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired trials', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log('[check-trials] Aucun essai expiré trouvé');
      return NextResponse.json({
        success: true,
        message: 'No expired trials found',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[check-trials] ${expiredTrials.length} essai(s) expiré(s) trouvé(s)`);

    // 2. DOWNGRADER CHAQUE ESSAI EXPIRÉ
    const results = [];
    const errors = [];

    for (const trial of expiredTrials) {
      try {
        console.log(`[check-trials] Traitement company ${trial.company_id}...`);

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
          description: `Essai expiré - Downgrade vers ESSENTIAL (1 véhicule)`,
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

        console.log(`[check-trials] ✓ Company ${trial.company_id} downgradée avec succès`);

      } catch (error: any) {
        console.error(`[check-trials] ✗ Erreur company ${trial.company_id}:`, error);
        errors.push({
          companyId: trial.company_id,
          error: error.message,
        });
      }
    }

    // 3. ENVOYER LES NOTIFICATIONS (optionnel - peut être fait via email service)
    // Pour l'instant, on se contente de logger
    if (results.length > 0) {
      console.log(`[check-trials] ${results.length} downgrades effectués`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredTrials.length} expired trials`,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      duration,
      timestamp: now,
    });

  } catch (error: any) {
    console.error('[check-trials] Erreur critique:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST handler (pour tests manuels)
export const POST = GET;

export const dynamic = 'force-dynamic';
