/**
 * API Route : Création session Stripe Checkout (NOUVEAU FLUX)
 * 
 * Pour les plans payants : crée une session Stripe avec les données temporaires
 * L'utilisateur N'EST PAS encore créé dans Supabase à ce stade
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/stripe';
import { STRIPE_PLANS, PlanType } from '@/lib/stripe/config';

interface CheckoutRequest {
  email: string;
  plan: string;
  tempData: {
    companyName: string;
    siret: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier Stripe configuré
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const body: CheckoutRequest = await request.json();
    const { email, plan, tempData } = body;

    // Validation
    if (!email || !plan || !tempData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const normalizedPlan = plan.toUpperCase() as PlanType;
    const planConfig = STRIPE_PLANS[normalizedPlan];

    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid plan or Stripe not configured for this plan' },
        { status: 400 }
      );
    }

    // Créer un customer Stripe (temporaire, sera lié au user après création)
    const customer = await stripe.customers.create({
      email,
      name: `${tempData.firstName} ${tempData.lastName}`,
      phone: tempData.phone,
      metadata: {
        temp_registration: 'true',
        company_name: tempData.companyName,
      },
    });

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?canceled=true&email=${encodeURIComponent(email)}`,
      subscription_data: {
        metadata: {
          registration_pending: 'true',
          plan: normalizedPlan,
          company_name: tempData.companyName,
          siret: tempData.siret,
          first_name: tempData.firstName,
          last_name: tempData.lastName,
          phone: tempData.phone,
          email: email,
        },
        trial_period_days: 14,
      },
      metadata: {
        registration_pending: 'true',
        plan: normalizedPlan,
        company_name: tempData.companyName,
        email: email,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
