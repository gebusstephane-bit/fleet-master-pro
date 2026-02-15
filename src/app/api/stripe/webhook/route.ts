/**
 * Webhook Stripe - FLUX TRANSACTIONNEL CORRIGÉ
 * 
 * Gère les événements de paiement et crée les comptes utilisateurs pour les nouvelles inscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STRIPE_PLANS, PlanType } from '@/lib/stripe/config';
import { stripe, isStripeConfigured, isWebhookConfigured } from '@/lib/stripe/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
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
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (event.type) {
      // ============================================
      // CRITIQUE : Création du compte après paiement
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        
        // Vérifier si c'est une inscription (pas un upgrade)
        const isRegistration = session.metadata?.registration_pending === 'true' ||
                              session.subscription?.metadata?.registration_pending === 'true';
        
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

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// ============================================
// FONCTIONS HELPER
// ============================================

async function handleNewRegistration(
  supabase: ReturnType<typeof createAdminClient>,
  session: import('stripe').Stripe.Checkout.Session
) {
  try {
    // Récupérer les métadonnées
    const metadata = session.metadata || session.subscription?.metadata || {};
    const plan = (metadata.plan as PlanType) || 'STARTER';
    const email = metadata.email || session.customer_details?.email;
    const companyName = metadata.company_name;
    const siret = metadata.siret || '';
    const firstName = metadata.first_name || '';
    const lastName = metadata.last_name || '';
    const phone = metadata.phone || '';

    if (!email || !companyName) {
      console.error('Missing required metadata for registration');
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

    // 1. CRÉER L'UTILISATEUR SUPABASE AUTH
    // Générer un mot de passe temporaire aléatoire
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
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
        max_vehicles: STRIPE_PLANS[plan]?.maxVehicles || 1,
        max_drivers: STRIPE_PLANS[plan]?.maxDrivers || 1,
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
    const stripeSubscriptionId = session.subscription as string;
    if (stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      await supabase.from('subscriptions').insert({
        company_id: company.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: subscription.items.data[0].price.id,
        plan: plan,
        status: 'ACTIVE',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        vehicle_limit: STRIPE_PLANS[plan]?.maxVehicles || 1,
        user_limit: STRIPE_PLANS[plan]?.maxDrivers || 1,
        features: STRIPE_PLANS[plan]?.features || [],
        trial_ends_at: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      });
    }

    // 5. ENVOYER EMAIL DE BIENVENUE AVEC LIEN DE CONFIGURATION MOT DE PASSE
    // Note : L'utilisateur doit définir son propre mot de passe
    // Pour l'instant, il peut utiliser "Mot de passe oublié" ou on envoie un lien magique
    
    console.log(`✅ User created after payment: ${email} -> ${plan}`);

  } catch (error) {
    console.error('Failed to create user after payment:', error);
    // Logger l'erreur pour intervention manuelle
    await supabase.from('webhook_errors').insert({
      event_type: 'checkout.session.completed',
      error: JSON.stringify(error),
      metadata: session.metadata,
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

  await supabase.from('subscriptions').upsert({
    company_id: companyId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: subscription.items.data[0].price.id,
    plan: plan,
    status: 'ACTIVE',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    vehicle_limit: STRIPE_PLANS[plan]?.maxVehicles || 1,
    user_limit: STRIPE_PLANS[plan]?.maxDrivers || 1,
    features: STRIPE_PLANS[plan]?.features || [],
  }, {
    onConflict: 'company_id'
  });

  // Mettre à jour le statut de l'entreprise
  await supabase.from('companies').update({
    subscription_plan: plan.toLowerCase(),
    subscription_status: 'active',
    max_vehicles: STRIPE_PLANS[plan]?.maxVehicles || 1,
    max_drivers: STRIPE_PLANS[plan]?.maxDrivers || 1,
  }).eq('id', companyId);

  console.log(`✅ Subscription updated for ${companyId} -> ${plan}`);
}

async function handlePaymentSuccess(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import('stripe').Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await supabase.from('subscriptions').update({
    status: 'ACTIVE',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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

  console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import('stripe').Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;
  
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

  console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
}

async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof createAdminClient>,
  deletedSub: import('stripe').Stripe.Subscription
) {
  // Downgrader vers Starter
  await supabase.from('subscriptions').update({
    plan: 'STARTER',
    status: 'CANCELED',
    vehicle_limit: 1,
    user_limit: 1,
    stripe_subscription_id: null,
    stripe_price_id: null,
    current_period_end: new Date().toISOString(),
  }).eq('stripe_subscription_id', deletedSub.id);

  // Mettre à jour companies
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', deletedSub.id)
    .single();

  if (sub?.company_id) {
    await supabase.from('companies').update({
      subscription_plan: 'starter',
      subscription_status: 'active', // Toujours actif mais limité
      max_vehicles: 1,
      max_drivers: 1,
    }).eq('id', sub.company_id);
  }

  console.log(`👋 Subscription canceled, downgraded to STARTER`);
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  updatedSub: import('stripe').Stripe.Subscription
) {
  const priceId = updatedSub.items.data[0].price.id;
  let plan: PlanType = 'STARTER';
  
  if (priceId.includes('basic')) plan = 'BASIC';
  else if (priceId.includes('pro')) plan = 'PRO';
  
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', updatedSub.id)
    .single();

  if (sub?.company_id) {
    await supabase.from('subscriptions').update({
      plan: plan,
      vehicle_limit: STRIPE_PLANS[plan].vehicleLimit,
      user_limit: STRIPE_PLANS[plan].userLimit,
      features: STRIPE_PLANS[plan].features,
      current_period_start: new Date(updatedSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
    }).eq('stripe_subscription_id', updatedSub.id);

    await supabase.from('companies').update({
      subscription_plan: plan.toLowerCase(),
      max_vehicles: STRIPE_PLANS[plan].vehicleLimit,
      max_drivers: STRIPE_PLANS[plan].userLimit,
    }).eq('id', sub.company_id);
  }

  console.log(`📝 Subscription updated to ${plan}`);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
