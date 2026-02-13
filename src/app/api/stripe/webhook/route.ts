/**
 * Webhook Stripe
 * Gère les événements de paiement et met à jour les abonnements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STRIPE_PLANS, PlanType } from '@/lib/stripe/config';
import { stripe, isStripeConfigured, isWebhookConfigured } from '@/lib/stripe/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Stripe est configuré
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    if (!isWebhookConfigured()) {
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 503 }
      );
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: import('stripe').Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Gérer les différents événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        
        // Récupérer les métadonnées
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan as PlanType;
        
        if (!companyId || !plan) {
          console.error('Missing metadata in checkout session');
          break;
        }

        // Récupérer l'abonnement Stripe
        const stripeSubscriptionId = session.subscription as string;
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        // Mettre à jour l'abonnement en base
        const limits = STRIPE_PLANS[plan];
        
        await supabase
          .from('subscriptions')
          .upsert({
            company_id: companyId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_price_id: stripeSubscription.items.data[0].price.id,
            plan: plan,
            status: 'ACTIVE',
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            vehicle_limit: limits.vehicleLimit,
            user_limit: limits.userLimit,
            features: limits.features,
            trial_ends_at: stripeSubscription.trial_end 
              ? new Date(stripeSubscription.trial_end * 1000).toISOString()
              : null,
          }, {
            onConflict: 'company_id'
          });

        console.log(`✅ Subscription activated for ${companyId} -> ${plan}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        // Mettre à jour la période
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as import('stripe').Stripe.Invoice;
        const failedSubscriptionId = failedInvoice.subscription as string;
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'PAST_DUE',
          })
          .eq('stripe_subscription_id', failedSubscriptionId);

        console.log(`⚠️ Payment failed for subscription ${failedSubscriptionId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as import('stripe').Stripe.Subscription;
        
        // Downgrader vers Starter
        await supabase
          .from('subscriptions')
          .update({
            plan: 'STARTER',
            status: 'ACTIVE',
            vehicle_limit: 1,
            user_limit: 1,
            features: ['vehicles', 'inspections_qr', 'basic_profile'],
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', deletedSub.id);

        console.log(`👋 Subscription canceled, downgraded to STARTER`);
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object as import('stripe').Stripe.Subscription;
        
        // Déterminer le plan depuis le price_id
        const priceId = updatedSub.items.data[0].price.id;
        let plan: PlanType = 'STARTER';
        
        if (priceId.includes('basic')) plan = 'BASIC';
        else if (priceId.includes('pro')) plan = 'PRO';
        
        const limits = STRIPE_PLANS[plan];
        
        await supabase
          .from('subscriptions')
          .update({
            plan: plan,
            vehicle_limit: limits.vehicleLimit,
            user_limit: limits.userLimit,
            features: limits.features,
            current_period_start: new Date(updatedSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', updatedSub.id);

        console.log(`📝 Subscription updated to ${plan}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Désactiver le parsing du body pour Stripe (App Router)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
