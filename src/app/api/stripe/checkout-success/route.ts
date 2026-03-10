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
import { logger } from '@/lib/logger';

// Type local pour la table pending_registrations (table temporaire non dans Database types)
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
  setup_token: string;
  used: boolean;
}

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
    
    // @ts-expect-error Stripe API customer peut être string ou objet étendu
    const email = session.customer_details?.email || session.customer?.email;

    if (!email) {
      logger.error('Pas d\'email dans la session Stripe');
      return NextResponse.redirect(new URL('/register?error=no_email', request.url));
    }

    // Vérification utilisateur

    // ATTENDRE QUE LE WEBHOOK AIT CRÉÉ L'UTILISATEUR (max 5 secondes)
    let attempts = 0;
    let userProfile: { id: string; email: string; company_id: string | null } | null = null;

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
      logger.info('Webhook pas encore appelé ou échoué - Création directe (fallback)');
      
      // Récupérer le setup_token depuis les metadata Stripe
      // Stripe API: subscription peut être string ou objet étendu avec metadata
      const setupToken = (session.subscription && typeof session.subscription === 'object' ? 
        (session.subscription as { metadata?: { setup_token?: string } }).metadata?.setup_token : undefined) 
        || session.metadata?.setup_token;
      
      if (!setupToken) {
        logger.error('Pas de setup_token dans les metadata Stripe');
        return NextResponse.redirect(new URL('/register?error=missing_token', request.url));
      }

      // Setup token trouvé

      // Récupérer les données de pending_registrations
      // Table pending_registrations non définie dans Database types (table temporaire)
      // @ts-ignore - Table temporaire non typée
      const { data: pending, error: pendingError } = await supabase
        .from('pending_registrations' as never)
        .select('*')
        .eq('setup_token', setupToken)
        .eq('used', false)
        .single();

      if (pendingError || !pending) {
        logger.error('Token invalide ou expiré:', pendingError?.message);
        return NextResponse.redirect(new URL('/register?error=token_invalid', request.url));
      }

      // Typage explicite après vérification (cast via unknown pour sécurité)
      const pendingData = pending as unknown as PendingRegistration;

      // Données pending_registrations trouvées

      // CRÉER L'UTILISATEUR SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: pendingData.email,
        password: pendingData.password_hash,
        email_confirm: true,
        user_metadata: {
          first_name: pendingData.first_name,
          last_name: pendingData.last_name,
          company_name: pendingData.company_name,
        },
      });

      if (authError || !authData.user) {
        // Si l'utilisateur existe déjà (conflit)
        if (authError?.message?.includes('already been registered')) {
          logger.warn('Utilisateur existe déjà, récupération...');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, email, company_id')
            .eq('email', pendingData.email)
            .single();
          
          if (existingProfile) {
            userProfile = existingProfile;
          }
        } else {
          logger.error('Erreur création utilisateur:', authError?.message);
          return NextResponse.redirect(new URL('/register?error=creation_failed', request.url));
        }
      } else {
        const userId = authData.user.id;
        // Utilisateur créé

        // CRÉER L'ENTREPRISE
        const planType = pendingData.metadata?.plan_type || 'essential';
        const plan = planType.toUpperCase();
        
        // Extraction sécurisée du customer ID
        let stripeCustomerId = '';
        if (typeof session.customer === 'string') {
          stripeCustomerId = session.customer;
        } else if (session.customer && typeof session.customer === 'object') {
          // Stripe API: customer peut être objet avec id
          stripeCustomerId = (session.customer as { id?: string }).id || '';
        }
        
        // Si toujours pas d'ID, essayer de le récupérer depuis la session
        if (!stripeCustomerId && 'customer_id' in session) {
          stripeCustomerId = (session as { customer_id?: string }).customer_id || '';
        }
        
        logger.debug('Données entreprise:', {
          name: pendingData.company_name?.substring(0, 30),
          nameLength: pendingData.company_name?.length,
          email: pendingData.email?.substring(0, 30),
          emailLength: pendingData.email?.length,
          stripeCustomerId: stripeCustomerId?.substring(0, 30),
          stripeCustomerIdLength: stripeCustomerId?.length,
          planType,
        });
        
        const companyData = {
          name: pendingData.company_name?.substring(0, 100),
          siret: (pendingData.siret || '')?.substring(0, 20),
          address: '',
          postal_code: '',
          city: '',
          country: 'France',
          phone: (pendingData.phone || '')?.substring(0, 20),
          email: pendingData.email?.substring(0, 100),
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
          logger.error('Erreur création entreprise:', companyError);
          return NextResponse.redirect(new URL('/register?error=company_failed', request.url));
        }

        // CRÉER LE PROFIL
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          email: pendingData.email,
          first_name: pendingData.first_name || '',
          last_name: pendingData.last_name || '',
          role: 'ADMIN',
          company_id: company.id,
        });

        if (profileError) {
          // Rollback
          await supabase.auth.admin.deleteUser(userId);
          await supabase.from('companies').delete().eq('id', company.id);
          logger.error('Erreur création profil:', profileError);
          return NextResponse.redirect(new URL('/register?error=profile_failed', request.url));
        }

        // CRÉER L'ABONNEMENT
        // session.subscription peut être un objet (expand) ou une string
        let stripeSubscriptionId: string | null = null;
        let subscriptionData: { items?: { data?: { price?: { id?: string } }[] }; current_period_start?: number; current_period_end?: number } | null = null;
        
        if (session.subscription) {
          if (typeof session.subscription === 'string') {
            stripeSubscriptionId = session.subscription;
          } else {
            // C'est un objet (expand)
            stripeSubscriptionId = (session.subscription as { id?: string }).id || null;
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
            current_period_start: new Date((subscriptionData.current_period_start || 0) * 1000).toISOString(),
            current_period_end: new Date((subscriptionData.current_period_end || 0) * 1000).toISOString(),
            vehicle_limit: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxVehicles || 3,
            user_limit: CHECKOUT_PLAN_LIMITS[plan as PlanType]?.maxDrivers || 2,
            features: [],
          });
        }

        // MARQUER LE TOKEN COMME UTILISÉ
        const updateData: { used: boolean; user_id: string; used_at: string } = { 
          used: true, 
          user_id: userId,
          used_at: new Date().toISOString()
        };
        // @ts-ignore - Table temporaire non typée
        await supabase
          .from('pending_registrations' as never)
          .update(updateData as never)
          .eq('id', pendingData.id);

        userProfile = { id: userId, email: pendingData.email, company_id: company.id };
        logger.info('Utilisateur créé avec succès (fallback)');
      }
    }

    if (!userProfile) {
      return NextResponse.redirect(new URL('/register?error=creation_failed', request.url));
    }

    // REDIRECTION VERS LE DASHBOARD
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('registered', 'true');
    redirectUrl.searchParams.set('email', encodeURIComponent(userProfile.email));
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    logger.error('Erreur checkout-success:', error);
    return NextResponse.redirect(new URL('/register?error=server_error', request.url));
  }
}
