/**
 * API Route : Succès du checkout Stripe
 * 
 * Cette route est appelée après un paiement réussi sur Stripe.
 * Elle vérifie la session et redirige vers le dashboard.
 * La création réelle de l'utilisateur est faite par le webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/register?error=missing_session', request.url));
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/register?error=payment_not_completed', request.url));
    }

    // Vérifier si l'utilisateur a été créé par le webhook
    const supabase = createAdminClient();
    const email = session.customer_details?.email;

    if (!email) {
      return NextResponse.redirect(new URL('/register?error=no_email', request.url));
    }

    // Attendre que le webhook ait créé l'utilisateur (max 5 secondes)
    let attempts = 0;
    let user = null;

    while (attempts < 10) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        user = profile;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!user) {
      // Le webhook n'a pas encore créé l'utilisateur, rediriger vers une page d'attente
      return NextResponse.redirect(
        new URL(`/register/confirm?pending=true&session_id=${sessionId}`, request.url)
      );
    }

    // Rediriger vers le dashboard avec un message de succès
    return NextResponse.redirect(
      new URL('/dashboard?welcome=true&payment=success', request.url)
    );

  } catch (error: any) {
    console.error('Checkout success error:', error);
    return NextResponse.redirect(
      new URL('/register?error=checkout_error', request.url)
    );
  }
}

export const dynamic = 'force-dynamic';
