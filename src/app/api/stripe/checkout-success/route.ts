/**
 * API Route : Succès du checkout Stripe
 * 
 * Cette route est appelée après un paiement réussi sur Stripe.
 * Elle vérifie la session et crée l'utilisateur si le webhook n'a pas encore été appelé.
 * 
 * DUAL PATH :
 * 1. Vérifie si le webhook a déjà créé l'utilisateur (via profiles)
 * 2. Si non, utilise pending_registrations pour créer l'utilisateur immédiatement (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_LIMITS, PlanType } from '@/lib/plans';

// Mapping local pour compatibilité
const CHECKOUT_PLAN_LIMITS: Record<PlanType, { maxVehicles: number; maxDrivers: number }> = {
  ESSENTIAL: { maxVehicles: PLAN_LIMITS.ESSENTIAL.vehicleLimit, maxDrivers: PLAN_LIMITS.ESSENTIAL.userLimit },
  PRO: { maxVehicles: PLAN_LIMITS.PRO.vehicleLimit, maxDrivers: PLAN_LIMITS.PRO.userLimit },
  UNLIMITED: { maxVehicles: PLAN_LIMITS.UNLIMITED.vehicleLimit, maxDrivers: PLAN_LIMITS.UNLIMITED.userLimit },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/register?error=missing_session', request.url));
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const validStatuses = ['paid', 'no_payment_required'];
    if (!validStatuses.includes(session.payment_status)) {
      return NextResponse.redirect(new URL('/register?error=payment_not_completed', request.url));
    }

    const supabase = createAdminClient();
    const email = session.customer_details?.email || (session as any).customer?.email;

    if (!email) {
      console.error('Pas d\'email dans la session Stripe');
      return NextResponse.redirect(new URL('/register?error=no_email', request.url));
    }

    // Vérification utilisateur

    // ATTENDRE QUE LE WEBHOOK AIT CRÉÉ L'UTILISATEUR (max 5 secondes)
    let attempts = 0;
    let userProfile = null;

    while (attempts < 10) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, company_id')
        .eq('email', email)
        .single();

      if (profile) {
        userProfile = profile;
        // Utilisateur trouvé (créé par webhook)
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    // SI PAS D'UTILISATEUR = FALLBACK : CRÉER DIRECTEMENT
    if (!userProfile) {
      console.log('⏳ Webhook pas encore appelé ou échoué - Création directe (fallback)');
      
      // Récupérer le setup_token depuis les metadata Stripe
      const setupToken = (session as any).subscription?.metadata?.setup_token || session.metadata?.setup_token;
      
      if (!setupToken) {
        console.error('Pas de setup_token dans les metadata Stripe');
        return NextResponse.redirect(new URL('/register?error=missing_token', request.url));
      }

      // Setup token trouvé

      // Récupérer les données de pending_registrations
      interface PendingRegistration {
        id: string;
        email: string;
        password_hash: string;
        company_name: string;
        first_name?: string;
        last_name?: string;
        siret?: string;
        phone?: string;
        metadata?: { plan_type?: string };
      }
      const { data: pending, error: pendingError } = await supabase
        .from('pending_registrations' as any)
        .select('*')
        .eq('setup_token', setupToken)
        .eq('used', false)
        .single() as { data: PendingRegistration | null; error: any };

      if (pendingError || !pending) {
        console.error('Token invalide ou expiré:', pendingError?.message);
        return NextResponse.redirect(new URL('/register?error=token_invalid', request.url));
      }

      // Données pending_registrations trouvées

      // CRÉER L'UTILISATEUR SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: pending.email,
        password: pending.password_hash,
        email_confirm: true,
        user_metadata: {
          first_name: pending.first_name,
          last_name: pending.last_name,
          company_name: pending.company_name,
        },
      });

      if (authError || !authData.user) {
        // Si l'utilisateur existe déjà (conflit)
        if (authError?.message?.includes('already been registered')) {
          console.log('⚠️ Utilisateur existe déjà, récupération...');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, email, company_id')
            .eq('email', pending.email)
            .single();
          
          if (existingProfile) {
            userProfile = existingProfile;
          }
        } else {
          console.error('Erreur création utilisateur:', authError?.message);
          return NextResponse.redirect(new URL('/register?error=creation_failed', request.url));
        }
      } else {
        const userId = authData.user.id;
        // Utilisateur créé

        // CRÉER L'ENTREPRISE
        const planType = (pending.metadata as any)?.plan_type || 'essential';
        const plan = planType.toUpperCase();
        
        // Extraction sécurisée du customer ID
        let stripeCustomerId = '';
        if (typeof session.customer === 'string') {
          stripeCustomerId = session.customer;
        } else if (session.customer && typeof session.customer === 'object') {
          stripeCustomerId = (session.customer as any).id || '';
        }
        
        // Si toujours pas d'ID, essayer de le récupérer depuis la session
        if (!stripeCustomerId && (session as any).customer_id) {
          stripeCustomerId = (session as any).customer_id;
        }
        
        console.log('📊 Données entreprise:', {
          name: pending.company_name?.substring(0, 30),
          nameLength: pending.company_name?.length,
          email: pending.email?.substring(0, 30),
          emailLength: pending.email?.length,
          stripeCustomerId: stripeCustomerId?.substring(0, 30),
          stripeCustomerIdLength: stripeCustomerId?.length,
          planType,
        });
        
        const companyData = {
          name: pending.company_name?.substring(0, 100),
          siret: (pending.siret || '')?.substring(0, 20),
          address: '',
          postal_code: '',
          city: '',
          country: 'France',
          phone: (pending.phone || '')?.substring(0, 20),
          email: pending.email?.substring(0, 100),
          subscription_plan: planType.toUpperCase().substring(0, 20), // ESSENTIAL, PRO, ou UNLIMITED
          subscription_status: 'active',
          max_vehicles: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxVehicles || 3,
          max_drivers: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxDrivers || 2,
          stripe_customer_id: stripeCustomerId?.substring(0, 100),
        };
        
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert(companyData)
          .select()
          .single();

        if (companyError) {
          // Rollback
          await supabase.auth.admin.deleteUser(userId);
          console.error('❌ Erreur création entreprise:', companyError);
          return NextResponse.redirect(new URL('/register?error=company_failed', request.url));
        }

        // CRÉER LE PROFIL
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          email: pending.email,
          first_name: pending.first_name || '',
          last_name: pending.last_name || '',
          role: 'ADMIN',
          company_id: company.id,
        });

        if (profileError) {
          // Rollback
          await supabase.auth.admin.deleteUser(userId);
          await supabase.from('companies').delete().eq('id', company.id);
          console.error('❌ Erreur création profil:', profileError);
          return NextResponse.redirect(new URL('/register?error=profile_failed', request.url));
        }

        // CRÉER L'ABONNEMENT
        // session.subscription peut être un objet (expand) ou une string
        let stripeSubscriptionId: string | null = null;
        let subscriptionData: any = null;
        
        if (session.subscription) {
          if (typeof session.subscription === 'string') {
            stripeSubscriptionId = session.subscription;
          } else {
            // C'est un objet (expand)
            stripeSubscriptionId = (session.subscription as any).id;
            subscriptionData = session.subscription;
          }
        }
        
        if (stripeSubscriptionId && subscriptionData) {
          await supabase.from('subscriptions').insert({
            company_id: company.id,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_price_id: subscriptionData.items?.data?.[0]?.price?.id || '',
            plan: plan,
            status: 'ACTIVE',
            current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            vehicle_limit: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxVehicles || 3,
            user_limit: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxDrivers || 2,
            features: [],
          });
        }

        // MARQUER LE TOKEN COMME UTILISÉ
        await supabase
          .from('pending_registrations' as any)
          .update({ 
            used: true, 
            user_id: userId,
            used_at: new Date().toISOString()
          })
          .eq('id', pending.id);

        userProfile = { id: userId, email: pending.email, company_id: company.id };
        console.log('✅ Utilisateur créé avec succès (fallback)');
      }
    }

    if (!userProfile) {
      return NextResponse.redirect(new URL('/register?error=creation_failed', request.url));
    }

    // REDIRECTION VERS PAGE DE SUCCÈS
    // Redirection vers page de succès
    return NextResponse.redirect(
      new URL(`/register/success?email=${encodeURIComponent(userProfile.email)}`, request.url)
    );

  } catch (error: any) {
    console.error('Checkout success error:', error?.message);
    return NextResponse.redirect(
      new URL('/register?error=checkout_error', request.url)
    );
  }
}

export const dynamic = 'force-dynamic';
