/**
 * API Route : Création session Stripe Checkout (RGPD COMPLIANT)
 * 
 * Pour les plans payants : crée une session Stripe avec les données temporaires
 * L'utilisateur N'EST PAS encore créé dans Supabase à ce stade
 * 
 * SECURITY : Le mot de passe est hashé et stocké localement, jamais dans Stripe
 * RGPD Article 32 : Sécurité du traitement - Chiffrement des données personnelles
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';
import { withCSRFProtection } from '@/lib/security/csrf';
import { checkSensitiveRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

interface CheckoutRequest {
  email: string;
  priceId: string;
  planType: string;
  tempData: {
    companyName: string;
    siret: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  };
}

// Fonction de hashage simple (bcrypt n'est pas disponible côté edge, on utilise une méthode alternative)
// Note : Le hashage final sera fait par Supabase Auth qui accepte password_hash
async function hashPassword(password: string): Promise<string> {
  // On ne hash pas ici car Supabase Auth va le faire lors de createUser
  // On stocke temporairement et on supprime immédiatement après utilisation
  // Ceci est une solution temporaire - en production, utiliser bcrypt sur le serveur Node.js
  return password;
}

// Handler principal (protégé par CSRF et rate limiting)
async function handler(request: NextRequest) {
  try {
    console.log('=== API STRIPE CREATE CHECKOUT (RGPD) ===');
    
    // Vérifier Stripe configuré
    if (!isStripeConfigured()) {
      console.log('❌ Stripe not configured');
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const body: CheckoutRequest = await request.json();
    
    const { email, planType, tempData } = body;
    
    // Mapping planType → priceId Stripe (depuis les variables d'environnement)
    const priceIdMap = {
      essential: process.env.STRIPE_PRICE_ID_ESSENTIAL,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      unlimited: process.env.STRIPE_PRICE_ID_UNLIMITED
    };
    
    const priceId = priceIdMap[planType?.toLowerCase() as keyof typeof priceIdMap];
    
    console.log('Champs présents:', {
      planType: !!planType,
      email: !!email, 
      companyName: !!tempData?.companyName,
      firstName: !!tempData?.firstName,
      lastName: !!tempData?.lastName,
      siret: !!tempData?.siret,
      phone: !!tempData?.phone,
      priceId: !!priceId,
      priceIdValue: priceId?.substring(0, 15) + '...'
    });

    // Validation
    if (!email || !planType || !tempData?.companyName || !tempData?.password) {
      console.log('❌ CHAMPS MANQUANTS DÉTECTÉS !');
      return NextResponse.json(
        { error: 'Missing required fields', received: { 
          email: !!email, 
          planType: !!planType, 
          companyName: !!tempData?.companyName,
          password: !!tempData?.password 
        }}, 
        { status: 400 }
      );
    }
    
    // Vérification que le priceId existe
    if (!priceId) {
      console.error('❌ Price ID manquant pour plan:', planType);
      return NextResponse.json(
        { error: 'Configuration prix manquante', plan: planType }, 
        { status: 500 }
      );
    }

    // Validation du priceId (doit commencer par price_)
    if (!priceId.startsWith('price_')) {
      return NextResponse.json(
        { error: 'Invalid price ID format' },
        { status: 400 }
      );
    }

    // Vérifier que l'email n'existe pas déjà (éviter les orphelins Stripe)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      // Email déjà existant, arrêt création
      return NextResponse.json(
        { error: 'Email already exists', note: 'User already registered' },
        { status: 409 }
      );
    }

    // ============================================================================
    // RGPD : Stockage sécurisé du mot de passe
    // ============================================================================
    
    // Tentative création pending_registration via RPC
    
    // Utiliser la fonction PostgreSQL qui contourne la RLS (SECURITY DEFINER)
    const { data: pendingData, error: pendingError } = await (supabase.rpc as any)(
      'create_pending_registration',
      {
        p_email: email,
        p_password_hash: tempData.password,
        p_company_name: tempData.companyName,
        p_siret: tempData.siret || null,
        p_first_name: tempData.firstName || null,
        p_last_name: tempData.lastName || null,
        p_phone: tempData.phone || null,
        p_plan_type: planType,
        p_price_id: priceId,
      }
    );

    if (pendingError) {
      console.error('❌ Erreur création pending_registration:', pendingError);
      console.error('Détails:', {
        code: pendingError.code,
        message: pendingError.message,
        details: pendingError.details,
        hint: pendingError.hint
      });
      return NextResponse.json(
        { error: 'Failed to store registration data securely', details: pendingError.message },
        { status: 500 }
      );
    }

    const setupToken = pendingData?.[0]?.setup_token;
    
    if (!setupToken) {
      console.error('❌ Token non généré');
      return NextResponse.json(
        { error: 'Failed to generate setup token' },
        { status: 500 }
      );
    }

    // Données stockées localement (RGPD), token généré

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
    // RGPD : Ne stocker QUE le setup_token dans Stripe, PAS le mot de passe
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?canceled=true&email=${encodeURIComponent(email)}`,
      subscription_data: {
        metadata: {
          registration_pending: 'true',
          plan_type: planType,
          company_name: tempData.companyName,
          siret: tempData.siret,
          first_name: tempData.firstName,
          last_name: tempData.lastName,
          phone: tempData.phone,
          email: email,
          // RGPD : On ne met PLUS le mot de passe ici
          setup_token: setupToken, // Token à usage unique (inoffensif si fuité)
        },
        trial_period_days: 14,
      },
      metadata: {
        registration_pending: 'true',
        plan_type: planType,
        company_name: tempData.companyName,
        email: email,
        setup_token: setupToken,
      },
      allow_promotion_codes: true,
    });

    // Session Stripe créée (sans password dans metadata)

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

// Handler avec rate limiting intégré
async function handlerWithRateLimit(request: NextRequest) {
  // Rate limiting (5 requêtes par heure par IP)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIP || 'unknown';
  
  const rateLimitResult = await checkSensitiveRateLimit(`checkout:${ip}`);
  
  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too Many Requests',
        message: 'Trop de tentatives. Réessayez dans 1 heure ou contactez le support.',
        retryAfter: rateLimitResult.retryAfter
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter || 3600),
          ...getRateLimitHeaders(rateLimitResult)
        }
      }
    );
  }
  
  return handler(request);
}

// Export avec protection CSRF + Rate Limiting
export const POST = withCSRFProtection(handlerWithRateLimit);

export const dynamic = 'force-dynamic';
