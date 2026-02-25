/**
 * Server Action: Suppression de compte utilisateur (Article 17 RGPD)
 * 
 * Implémente le droit à l'effacement avec :
 * - Suppression cascadée de toutes les données
 * - Annulation de l'abonnement Stripe
 * - Nettoyage complet auth.users via Admin API
 * 
 * SECURITY: Cette action utilise le service role key pour bypass RLS
 * et effectuer des opérations administratives (suppression auth.users)
 */

'use server';

import { revalidatePath } from 'next/cache';

import { stripe } from '@/lib/stripe/stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface DeleteAccountInput {
  confirmation: string;
  reason?: string;
}

/**
 * Supprime définitivement un compte utilisateur et toutes ses données
 * Conforme Article 17 RGPD - Droit à l'effacement
 */
export async function deleteAccount(input: DeleteAccountInput) {
  try {
    // Validation des entrées
    if (input.confirmation !== 'SUPPRIMER') {
      return { error: 'Vous devez saisir SUPPRIMER pour confirmer', success: false };
    }
    
    const reason = input.reason;

    // Authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Non authentifié', success: false };
    }

    const userId = user.id;
    
    // Récupérer le profil pour avoir le company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      return { error: 'Profil non trouvé', success: false };
    }

    const companyId = profile.company_id;

    console.info(`[RGPD] Début suppression compte user=${userId}, company=${companyId}`);

    const supabaseAdmin = createAdminClient();

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Récupérer l'abonnement Stripe s'il existe
    // ═══════════════════════════════════════════════════════════════
    
    let stripeSubscriptionId: string | undefined;
    if (companyId) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('company_id', companyId)
        .maybeSingle();
      stripeSubscriptionId = sub?.stripe_subscription_id || undefined;
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Annuler l'abonnement Stripe actif
    // ═══════════════════════════════════════════════════════════════
    
    if (stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId, {
          cancellation_details: {
            comment: reason || 'Suppression du compte utilisateur (RGPD Article 17)',
          },
        });
        console.info(`[RGPD] Abonnement Stripe annulé: ${stripeSubscriptionId}`);
      } catch (stripeError) {
        console.warn(`[RGPD] Erreur annulation Stripe:`, stripeError);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 3: Suppression cascadée des données métier
    // ═══════════════════════════════════════════════════════════════

    if (companyId) {
      // Supprimer les inspections
      await supabaseAdmin.from('vehicle_inspections').delete().eq('company_id', companyId);
      
      // Supprimer les maintenances
      await supabaseAdmin.from('maintenance_records').delete().eq('company_id', companyId);
      await supabaseAdmin.from('maintenance_agenda').delete().eq('company_id', companyId);
      await supabaseAdmin.from('maintenance_status_history').delete().eq('company_id', companyId);
      
      // Supprimer les documents
      await supabaseAdmin.from('vehicle_documents').delete().eq('company_id', companyId);
      
      // Supprimer les véhicules
      await supabaseAdmin.from('vehicles').delete().eq('company_id', companyId);
      
      // Supprimer les chauffeurs
      await supabaseAdmin.from('drivers').delete().eq('company_id', companyId);
      
      // Supprimer les notifications
      await supabaseAdmin.from('notifications').delete().eq('company_id', companyId);
      
      // Supprimer l'abonnement
      await supabaseAdmin.from('subscriptions').delete().eq('company_id', companyId);
      
      // Supprimer les profils de l'entreprise
      await supabaseAdmin.from('profiles').delete().eq('company_id', companyId);
      
      // Supprimer l'entreprise
      await supabaseAdmin.from('companies').delete().eq('id', companyId);

      console.info(`[RGPD] Données métier supprimées pour company=${companyId}`);
    } else {
      // Si pas de company_id, supprimer uniquement le profil de l'utilisateur
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 4: Suppression définitive de l'utilisateur (auth.users)
    // ═══════════════════════════════════════════════════════════════
    
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error(`[RGPD] Erreur suppression auth user:`, deleteAuthError);
      return { error: 'Erreur lors de la suppression du compte utilisateur', success: false };
    }

    console.info(`[RGPD] Utilisateur auth supprimé: ${userId}`);

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 5: Journalisation RGPD
    // ═══════════════════════════════════════════════════════════════
    
    console.info('[RGPD] Audit log - Compte supprimé:', {
      user_id: userId,
      company_id: companyId,
      reason: reason || 'Demande utilisateur (Article 17 RGPD)',
      deleted_at: new Date().toISOString(),
    });

    // Revalidation des chemins
    revalidatePath('/settings/profile');
    revalidatePath('/login');

    return {
      success: true,
      message: 'Votre compte et toutes vos données ont été définitivement supprimés.',
    };

  } catch (error) {
    console.error('[RGPD] Erreur lors de la suppression du compte:', error);
    
    if (error instanceof Error) {
      return { 
        error: process.env.NODE_ENV === 'production'
          ? 'Une erreur est survenue lors de la suppression. Veuillez contacter le support.'
          : error.message,
        success: false 
      };
    }
    
    return { error: 'Erreur lors de la suppression du compte', success: false };
  }
}
