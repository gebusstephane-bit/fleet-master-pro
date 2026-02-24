/**
 * Webhook Stripe - FLUX TRANSACTIONNEL RGPD COMPLIANT
 * 
 * Gère les événements de paiement et crée les comptes utilisateurs pour les nouvelles inscriptions
 * SECURITY : Utilise setup_token pour récupérer les données sensibles (jamais dans Stripe)
 * RGPD Article 32 : Les données sensibles ne transitent pas par des tiers (Stripe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';
import { withRateLimit, RateLimits, getClientIP } from '@/lib/security/rate-limit';
// PlanType: 'ESSENTIAL' | 'PRO' | 'UNLIMITED'
type PlanType = 'ESSENTIAL' | 'PRO' | 'UNLIMITED';

// Mapping des plans vers les limites
const PLAN_LIMITS: Record<PlanType, { maxVehicles: number; maxDrivers: number; features: string[] }> = {
  ESSENTIAL: {
    maxVehicles: 3,
    maxDrivers: 2,
    features: ['3 véhicules maximum', '2 utilisateurs', 'Support email (48h)', 'Tableau de bord'],
  },
  PRO: {
    maxVehicles: 15,
    maxDrivers: 5,
    features: ['15 véhicules maximum', '5 utilisateurs', 'Support prioritaire (24h)', 'API d\'accès'],
  },
  UNLIMITED: {
    maxVehicles: 999,
    maxDrivers: 999,
    features: ['Véhicules illimités', 'Utilisateurs illimités', 'Support dédié 24/7', 'Personnalisation complète'],
  },
};
import { stripe, isStripeConfigured, isWebhookConfigured } from '@/lib/stripe/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Handler principal (protégé par rate limiting)
async function handler(request: NextRequest) {
  try {
    // Vérifier Stripe configuré
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    if (!isWebhookConfigured()) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    let event: import('stripe').Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid signature';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (event.type) {
      // ============================================
      // CRITIQUE : Création du compte après paiement
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        
        // Vérification d'idempotence : déjà traité ?
        const stripeCustomerId = session.customer as string;
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, company_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();
          
        if (existingSub) {
          // Webhook déjà traité pour ce customer, ignoré
          break;
        }
        
        // Vérifier si c'est une inscription (pas un upgrade)
        // Utiliser les métadonnées de la session ou de la subscription
        const sessionMetadata: Record<string, string | null | undefined> = session.metadata || {};
        const isRegistration = sessionMetadata.registration_pending === 'true';
        
        if (!isRegistration) {
          // C'est un upgrade existant, gérer normalement
          await handleSubscriptionUpdate(supabase, session);
          break;
        }

        // NOUVELLE INSCRIPTION : Créer l'utilisateur
        await handleNewRegistration(supabase, session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        await handlePaymentSuccess(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as import('stripe').Stripe.Invoice;
        await handlePaymentFailed(supabase, failedInvoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as import('stripe').Stripe.Subscription;
        await handleSubscriptionCanceled(supabase, deletedSub);
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object as import('stripe').Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, updatedSub);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// Export avec rate limiting (50 requêtes par minute par IP)
// Note: Le webhook utilise déjà la vérification de signature Stripe comme protection
export const POST = withRateLimit(handler, RateLimits.webhook, {
  getIdentifier: (req) => getClientIP(req),
});

// ============================================
// FONCTIONS HELPER
// ============================================

async function handleNewRegistration(
  supabase: ReturnType<typeof createAdminClient>,
  session: import('stripe').Stripe.Checkout.Session
) {
  let planType: PlanType = 'ESSENTIAL'; // défaut en dehors du try pour être accessible dans le catch
  
  try {
    // Récupérer la subscription pour avoir les métadonnées complètes
    const stripeSubscriptionId = session.subscription as string;
    let subscriptionMetadata: Record<string, string | null | undefined> = {};
    planType = 'ESSENTIAL'; // Reset à la valeur par défaut

    if (stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        subscriptionMetadata = subscription.metadata || {};
        planType = ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) || 'ESSENTIAL';
      } catch (e) {
        console.error('Erreur récupération subscription:', e);
        // Fallback sur session.metadata
        subscriptionMetadata = session.metadata || {};
        planType = ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) || 'ESSENTIAL';
      }
    } else {
      subscriptionMetadata = session.metadata || {};
      planType = ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) || 'ESSENTIAL';
    }

    const email = subscriptionMetadata.email || session.customer_details?.email;
    const companyName = subscriptionMetadata.company_name;
    const siret = subscriptionMetadata.siret || '';
    const firstName = subscriptionMetadata.first_name || '';
    const lastName = subscriptionMetadata.last_name || '';
    const phone = subscriptionMetadata.phone || '';
    
    // RGPD : Récupérer le setup_token (pas le mot de passe!)
    const setupToken = subscriptionMetadata.setup_token;
    
    // Utiliser planType (qui est maintenant en majuscule) pour PLAN_LIMITS
    const plan = planType;

    if (!email || !companyName) {
      console.error('Missing required metadata for registration');
      console.error('Metadata reçues:', { email: !!email, companyName: !!companyName, setupToken: !!setupToken });
      return;
    }

    // Vérifier si l'utilisateur existe déjà (éviter les doublons)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      console.log('User already exists, skipping creation');
      return;
    }

    // ============================================================================
    // RGPD : Récupération sécurisée via setup_token
    // ============================================================================
    
    let passwordToUse = randomBytes(32).toString('hex'); // Valeur par défaut
    let tokenValid = false;
    let pendingReg: any = null;
    
    if (setupToken) {
      // Chercher le token dans pending_registrations
      const { data: pending, error: findError } = await (supabase
        .from('pending_registrations' as any) as any)
        .select('*')
        .eq('setup_token', setupToken)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (findError || !pending) {
        console.error('❌ Token invalide, expiré ou déjà utilisé:', setupToken);
        console.error('Détails:', findError?.message);
        // Token invalide - on continue avec un mot de passe aléatoire (voir ci-dessous)
      } else {
        tokenValid = true;
        pendingReg = pending;
        passwordToUse = pending.password_hash;
        // Token valide trouvé, données récupérées localement
      }
    }
    
    // Si token invalide ou manquant, on garde le mot de passe aléatoire généré ci-dessus

    // 1. CRÉER L'UTILISATEUR SUPABASE AUTH
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: passwordToUse,
      email_confirm: true, // Email déjà vérifié par Stripe
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        plan: plan,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    const userId = authData.user.id;
    
    // Si token valide, marquer comme utilisé
    if (tokenValid && pendingReg) {
      const { error: updateError } = await supabase
        .from('pending_registrations' as any)
        .update({ 
          used: true, 
          user_id: userId,
          used_at: new Date().toISOString()
        })
        .eq('id', pendingReg.id);
      
      if (updateError) {
        // Erreur mise à jour token (non bloquant)
        console.error('Erreur mise à jour token:', updateError.message);
      }
    }

    // 2. CRÉER L'ENTREPRISE AVEC STATUT ACTIF
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        siret,
        address: '',
        postal_code: '',
        city: '',
        country: 'France',
        phone,
        email,
        subscription_plan: plan.toLowerCase(),
        subscription_status: 'active', // ✅ ACTIF car paiement réussi
        max_vehicles: PLAN_LIMITS[plan]?.maxVehicles || 3,
        max_drivers: PLAN_LIMITS[plan]?.maxDrivers || 2,
        stripe_customer_id: session.customer as string,
      })
      .select()
      .single();

    if (companyError) {
      // Rollback : supprimer l'utilisateur
      await supabase.auth.admin.deleteUser(userId);
      console.error('Error creating company:', companyError);
      throw companyError;
    }

    // 3. CRÉER LE PROFIL
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'ADMIN',
      company_id: company.id,
    });

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('companies').delete().eq('id', company.id);
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    // 4. CRÉER L'ABONNEMENT
    if (stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const subData = subscription as unknown as import('stripe').Stripe.Subscription;
      
      await supabase.from('subscriptions').insert({
        company_id: company.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: subData.items.data[0].price.id,
        plan: plan,
        status: 'ACTIVE',
        current_period_start: new Date(((subData as unknown as { current_period_start: number }).current_period_start) * 1000).toISOString(),
        current_period_end: new Date(((subData as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
        vehicle_limit: PLAN_LIMITS[plan]?.maxVehicles || 3,
        user_limit: PLAN_LIMITS[plan]?.maxDrivers || 2,
        features: PLAN_LIMITS[plan]?.features || [],
        trial_ends_at: subData.trial_end 
          ? new Date(subData.trial_end * 1000).toISOString()
          : null,
      });
    }

    // 5. ENVOYER EMAIL DE BIENVENUE (ou récupération si token expiré)
    try {
      if (!tokenValid) {
        // Token expiré : envoyer email avec lien de récupération de mot de passe
        // Envoi email récupération (token expiré)
        
        const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
          }
        });
        
        if (recoveryError) {
          console.error('Erreur génération lien récupération:', recoveryError);
        } else {
          // Envoyer l'email de récupération
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                companyName: companyName,
                recoveryLink: recoveryData.properties.action_link,
                isRecovery: true, // Flag pour template email différent
                reason: 'Votre session de paiement a expiré. Veuillez définir votre mot de passe pour accéder à votre compte.'
              })
            });
            // Email de récupération envoyé
          } catch (emailError) {
            console.error('Erreur envoi email récupération:', emailError instanceof Error ? emailError.message : String(emailError));
          }
        }
      } else {
        // Cas normal : envoyer magic link pour connexion sans mot de passe
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
          }
        });
        
        if (linkError) {
          console.error('Erreur génération magic link:', linkError);
        } else {
          // Envoyer l'email via votre service
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                companyName: companyName,
                magicLink: linkData.properties.action_link
              })
            });
          } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
          }
          
          console.log('Magic link généré:', linkData.properties.action_link);
        }
      }
    } catch (magicLinkError) {
      console.error('Erreur lors de la génération du magic link:', magicLinkError);
    }
    
    // User created after payment successfully

    // 6. LOGGING SÉCURISÉ (sans données sensibles)
    if (!tokenValid) {
      // Log pour suivi des cas où le token était expiré
      await supabase.from('webhook_errors').insert({
        event_type: 'checkout.session.completed',
        error: JSON.stringify({ 
          warning: 'Token expired or invalid - Recovery email sent',
          email_domain: email.split('@')[1] // uniquement le domaine pour privacy
        }),
        metadata: { 
          setup_token_present: !!setupToken,
          plan: plan 
        },
      });
    }

  } catch (error) {
    console.error('Failed to create user after payment:', error);
    // Logger l'erreur pour intervention manuelle (sans données sensibles)
    await supabase.from('webhook_errors').insert({
      event_type: 'checkout.session.completed',
      error: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'handleNewRegistration'
      }),
      metadata: { 
        plan_type: planType 
      },
    });
  }
}

async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  session: import('stripe').Stripe.Checkout.Session
) {
  // Logique pour les upgrades existants
  const companyId = session.metadata?.company_id;
  const plan = session.metadata?.plan as PlanType;
  
  if (!companyId || !plan) {
    console.error('Missing metadata for subscription update');
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const subData = subscription as unknown as import('stripe').Stripe.Subscription;

  await supabase.from('subscriptions').upsert({
    company_id: companyId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: subData.items.data[0].price.id,
    plan: plan,
    status: 'ACTIVE',
    current_period_start: new Date(((subData as unknown as { current_period_start: number }).current_period_start) * 1000).toISOString(),
    current_period_end: new Date(((subData as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
    vehicle_limit: PLAN_LIMITS[plan]?.maxVehicles || 3,
    user_limit: PLAN_LIMITS[plan]?.maxDrivers || 2,
    features: PLAN_LIMITS[plan]?.features || [],
  }, {
    onConflict: 'company_id'
  });

  // Mettre à jour le statut de l'entreprise
  await supabase.from('companies').update({
    subscription_plan: plan.toLowerCase(),
    subscription_status: 'active',
    max_vehicles: PLAN_LIMITS[plan]?.maxVehicles || 3,
    max_drivers: PLAN_LIMITS[plan]?.maxDrivers || 2,
  }).eq('id', companyId);

  // Subscription updated
}

async function handlePaymentSuccess(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import('stripe').Stripe.Invoice
) {
  const subscriptionId = typeof (invoice as unknown as { subscription?: string }).subscription === 'string' 
    ? (invoice as unknown as { subscription: string }).subscription 
    : null;
  if (!subscriptionId) return;
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subData = subscription as unknown as import('stripe').Stripe.Subscription;
  
  await supabase.from('subscriptions').update({
    status: 'ACTIVE',
    current_period_start: new Date(((subData as unknown as { current_period_start: number }).current_period_start) * 1000).toISOString(),
    current_period_end: new Date(((subData as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
  }).eq('stripe_subscription_id', subscriptionId);

  // Mettre à jour companies aussi
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (sub?.company_id) {
    await supabase.from('companies').update({
      subscription_status: 'active',
    }).eq('id', sub.company_id);
  }

  // Payment succeeded
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import('stripe').Stripe.Invoice
) {
  const subscriptionId = typeof (invoice as unknown as { subscription?: string }).subscription === 'string' 
    ? (invoice as unknown as { subscription: string }).subscription 
    : null;
  if (!subscriptionId) return;
  
  await supabase.from('subscriptions').update({
    status: 'PAST_DUE',
  }).eq('stripe_subscription_id', subscriptionId);

  // Mettre à jour companies
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (sub?.company_id) {
    await supabase.from('companies').update({
      subscription_status: 'unpaid',
    }).eq('id', sub.company_id);
  }

  // Payment failed
}

async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof createAdminClient>,
  deletedSub: import('stripe').Stripe.Subscription
) {
  // L'abonnement est annulé - L'accès est bloqué jusqu'à réabonnement
  await supabase.from('subscriptions').update({
    status: 'CANCELED',
    stripe_subscription_id: null,
    stripe_price_id: null,
    current_period_end: new Date().toISOString(),
  }).eq('stripe_subscription_id', deletedSub.id);

  // Mettre à jour companies - bloquer l'accès
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', deletedSub.id)
    .single();

  if (sub?.company_id) {
    await supabase.from('companies').update({
      subscription_status: 'canceled', // Bloque l'accès au dashboard
    }).eq('id', sub.company_id);
  }

  console.log(`👋 Subscription canceled, access blocked`);
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  updatedSub: import('stripe').Stripe.Subscription
) {
  const priceId = updatedSub.items.data[0].price.id;
  let plan: PlanType = 'ESSENTIAL';
  
  // Mapping des price IDs vers les plans
  const essentialPriceId = process.env.STRIPE_PRICE_ID_ESSENTIAL;
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
  const unlimitedPriceId = process.env.STRIPE_PRICE_ID_UNLIMITED;
  
  if (priceId === essentialPriceId || priceId.includes('essential')) plan = 'ESSENTIAL';
  else if (priceId === proPriceId || priceId.includes('pro')) plan = 'PRO';
  else if (priceId === unlimitedPriceId || priceId.includes('unlimited')) plan = 'UNLIMITED';
  
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', updatedSub.id)
    .single();

  if (sub?.company_id) {
    await supabase.from('subscriptions').update({
      plan: plan,
      vehicle_limit: PLAN_LIMITS[plan].maxVehicles,
      user_limit: PLAN_LIMITS[plan].maxDrivers,
      features: PLAN_LIMITS[plan].features,
      current_period_start: new Date(((updatedSub as unknown as { current_period_start: number }).current_period_start) * 1000).toISOString(),
      current_period_end: new Date(((updatedSub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
    }).eq('stripe_subscription_id', updatedSub.id);

    await supabase.from('companies').update({
      subscription_plan: plan.toLowerCase(),
      max_vehicles: PLAN_LIMITS[plan].maxVehicles,
      max_drivers: PLAN_LIMITS[plan].maxDrivers,
    }).eq('id', sub.company_id);
  }

  console.log(`📝 Subscription updated to ${plan}`);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
