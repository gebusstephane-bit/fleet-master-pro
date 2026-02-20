/**
 * API Checkout Stripe
 * Crée une session de paiement pour upgrader l'abonnement (utilisateurs existants)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, isStripeConfigured } from '@/lib/stripe/stripe';

// Mapping des plans vers les variables d'environnement Stripe
const PLAN_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  ESSENTIAL: {
    monthly: process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    yearly: process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY || process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
  },
  PRO: {
    monthly: process.env.STRIPE_PRICE_ID_PRO || '',
    yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || process.env.STRIPE_PRICE_ID_PRO || '',
  },
  UNLIMITED: {
    monthly: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    yearly: process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || process.env.STRIPE_PRICE_ID_UNLIMITED || '',
  },
};

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

    const normalizedPlan = plan.toUpperCase();
    if (!['ESSENTIAL', 'PRO', 'UNLIMITED'].includes(normalizedPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Only ESSENTIAL, PRO and UNLIMITED are allowed' },
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
        email: company.email || '',
        name: company.name || '',
        metadata: {
          company_id: companyId,
        },
      } as any);

      customerId = customer.id;

      // Sauvegarder le customer_id
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', companyId);
    }

    // Déterminer le price_id
    const planConfig = PLAN_PRICE_IDS[normalizedPlan];
    const priceId = yearly ? planConfig.yearly : planConfig.monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this plan' },
        { status: 500 }
      );
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId as any,
      line_items: [
        {
          price: priceId as any,
          quantity: 1,
        },
      ],
      mode: 'subscription' as any,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true&plan=${normalizedPlan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          company_id: companyId,
          plan_type: normalizedPlan,
        } as any,
        trial_period_days: 14,
      } as any,
      allow_promotion_codes: true,
    } as any);

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
