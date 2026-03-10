/**
 * API Route : Vérifier le statut d'une session Stripe
 * Utilisé par la page payment-pending pour vérifier si le paiement a été complété
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/stripe';

export async function GET(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.status, // 'open' | 'complete' | 'expired'
      paymentStatus: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
      customerEmail: session.customer_details?.email,
      metadata: session.metadata,
    });

  } catch (error: any) {
    console.error('Check session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check session' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
