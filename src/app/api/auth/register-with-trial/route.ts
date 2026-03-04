/**
 * API Route : Inscription avec essai gratuit 14 jours (sans CB)
 * 
 * Crée directement un compte utilisateur avec accès PRO pendant 14 jours
 * sans demander de carte bancaire.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_LIMITS } from '@/lib/plans';
import { checkSensitiveRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { withCSRFProtection } from '@/lib/security/csrf';
import { logger } from '@/lib/logger';

interface RegisterTrialRequest {
  companyName: string;
  siret: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  plan?: 'essential' | 'pro' | 'unlimited';
}

// Durée de l'essai en jours
const TRIAL_DAYS = 14;

// Plan par défaut pour l'essai (PRO)
const DEFAULT_TRIAL_PLAN = 'PRO';

async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: RegisterTrialRequest = await request.json();
    const { 
      companyName, 
      siret, 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      plan = 'pro'
    } = body;

    // Validation
    if (!companyName || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      );
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    // Validation mot de passe (min 8 caractères)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Vérifier si l'email existe déjà
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      );
    }

    // Calcul des dates pour l'essai
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // 1. CRÉER L'UTILISATEUR SUPABASE AUTH
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        plan: DEFAULT_TRIAL_PLAN,
        trial_ends_at: trialEndsAt.toISOString(),
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. CRÉER L'ENTREPRISE
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        siret: siret || null,
        address: '',
        postal_code: '',
        city: '',
        country: 'France',
        phone: phone || null,
        email,
        subscription_plan: DEFAULT_TRIAL_PLAN.toLowerCase(),
        subscription_status: 'trialing',
        max_vehicles: PLAN_LIMITS[DEFAULT_TRIAL_PLAN].vehicleLimit,
        max_drivers: PLAN_LIMITS[DEFAULT_TRIAL_PLAN].userLimit,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (companyError) {
      // Rollback : supprimer l'utilisateur
      await supabase.auth.admin.deleteUser(userId);
      console.error('Error creating company:', companyError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'entreprise' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil' },
        { status: 500 }
      );
    }

    // 4. CRÉER L'ABONNEMENT AVEC ESSAI
    const { error: subscriptionError } = await supabase.from('subscriptions').insert({
      company_id: company.id,
      plan: DEFAULT_TRIAL_PLAN,
      status: 'TRIALING',
      vehicle_limit: PLAN_LIMITS[DEFAULT_TRIAL_PLAN].vehicleLimit,
      user_limit: PLAN_LIMITS[DEFAULT_TRIAL_PLAN].userLimit,
      trial_ends_at: trialEndsAt.toISOString(),
      features: [
        'vehicles',
        'inspections_qr',
        'maintenance_workflow',
        'fuel_tracking',
        'alerts_email',
        'route_optimization',
        'ai_predictions',
        'analytics',
        'webhooks',
        'advanced_reports',
      ],
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndsAt.toISOString(),
    });

    if (subscriptionError) {
      // Rollback
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('companies').delete().eq('id', company.id);
      console.error('Error creating subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'abonnement' },
        { status: 500 }
      );
    }

    // 5. LOGGER L'ACTIVITÉ
    await supabase.from('activity_logs').insert({
      company_id: company.id,
      user_id: userId,
      action_type: 'user_registered',
      entity_type: 'user',
      entity_id: userId,
      description: 'Inscription avec essai gratuit 14 jours',
      metadata: {
        trial_ends_at: trialEndsAt.toISOString(),
        plan: DEFAULT_TRIAL_PLAN,
      },
    });

    logger.info(`User registered with trial: ${email} (Company: ${company.id})`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        userId,
        companyId: company.id,
        trialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: TRIAL_DAYS,
      },
      processingTime: duration,
    });

  } catch (error: any) {
    logger.error('Register with trial error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
}

// Handler avec rate limiting (5 tentatives par heure par IP)
async function handlerWithRateLimit(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIP || 'unknown';

  const rateLimitResult = await checkSensitiveRateLimit(`register:${ip}`);

  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Trop de tentatives. Veuillez patienter quelques minutes.',
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter || 3600),
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  }

  const response = await handler(request);
  
  // Ajouter les headers de rate limit
  Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Export avec protection CSRF + Rate Limiting
export const POST = withCSRFProtection(handlerWithRateLimit);

export const dynamic = 'force-dynamic';
