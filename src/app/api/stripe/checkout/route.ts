/**
 * API Checkout Stripe
 * Crée une session de paiement pour upgrader l'abonnement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STRIPE_PLANS, PlanType } from '@/lib/stripe/config';
import { stripe, isStripeConfigured } from '@/lib/stripe/stripe';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Stripe est configuré
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const { plan, companyId, yearly = false } = await request.json();

    // Validation
    if (!plan || !companyId) {
      return NextResponse.json(
        { error: 'Plan and companyId required' },
        { status: 400 }
      );
    }

    if (!['BASIC', 'PRO'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Only BASIC and PRO are allowed' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Récupérer l'entreprise
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, email')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Récupérer ou créer le customer Stripe
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', companyId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Créer un customer Stripe
      const customer = await stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: {
          company_id: companyId,
        },
      });

      customerId = customer.id;

      // Sauvegarder le customer_id
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', companyId);
    }

    // Déterminer le price_id
    const priceId = yearly
      ? STRIPE_PLANS[plan as PlanType].stripePriceId?.replace('monthly', 'yearly')
      : STRIPE_PLANS[plan as PlanType].stripePriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          company_id: companyId,
          plan: plan,
        },
        trial_period_days: 14, // 14 jours d'essai gratuit
      },
      allow_promotion_codes: true, // Permettre les codes promo
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
