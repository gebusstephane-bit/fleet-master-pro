/**
 * Middleware Next.js - VÉRIFICATION SUBSCRIPTION STATUS
 * 
 * Bloque l'accès aux routes protégées si :
 * - subscription_status === 'pending_payment' (inscription non finalisée)
 * - subscription_status === 'unpaid' (paiement échoué)
 * - subscription_status === 'canceled' (abonnement annulé)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSuperadminEmail, isSuperadminEmail } from '@/lib/superadmin';

// Routes publiques (pas de vérification)
const publicRoutes = [
  '/', 
  '/login', 
  '/register', 
  '/forgot-password', 
  '/auth/callback', 
  '/unauthorized', 
  '/pricing',
  '/terms',
  '/privacy',
];

// Routes API publiques
const publicApiRoutes = ['/api/auth', '/api/stripe/webhook', '/api/stripe/create-checkout-session'];

// Routes autorisées pendant un paiement en attente
const pendingPaymentAllowedRoutes = [
  '/register/confirm',
  '/settings/billing',
  '/api/stripe',
  '/payment-pending',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // 🔐 SUPERADMIN
  // ============================================
  if (pathname.startsWith('/superadmin')) {
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: any) { response.cookies.set({ name, value, ...options }); },
          remove(name: string, options: any) { response.cookies.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    // Utiliser l'utilitaire centralisé pour la vérification
    if (!user || !isSuperadminEmail(user.email)) {
      console.log('❌ Middleware: Accès SuperAdmin refusé pour', user?.email);
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    console.log('✅ Middleware: Accès SuperAdmin accordé à', user.email);
    return response;
  }

  // Routes publiques
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next();
  }

  // API routes publiques
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ============================================
  // 🔍 VÉRIFICATION AUTH + SUBSCRIPTION
  // ============================================
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: any) { response.cookies.set({ name, value, ...options }); },
        remove(name: string, options: any) { response.cookies.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  // Pas authentifié → login
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Récupérer le profil et l'entreprise
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  // Si pas de company_id (cas rare), autoriser l'accès pour création
  if (!profile?.company_id) {
    return response;
  }

  // Vérifier le statut de l'entreprise (onboarding + abonnement)
  const { data: company } = await supabase
    .from('companies')
    .select('subscription_status, subscription_plan, trial_ends_at, onboarding_completed')
    .eq('id', profile.company_id)
    .single();

  if (!company) {
    return response;
  }

  const subscriptionStatus = company.subscription_status;

  // ============================================
  // 🚫 BLOCAGES SELON STATUT
  // ============================================

  // 1. PAIEMENT EN ATTENTE
  if (subscriptionStatus === 'pending_payment') {
    const isAllowedRoute = pendingPaymentAllowedRoutes.some(route => pathname.startsWith(route));
    
    if (!isAllowedRoute) {
      console.log('🚫 Access denied - pending payment:', pathname);
      return NextResponse.redirect(new URL('/payment-pending', request.url));
    }
  }

  // 2. PAIEMENT ÉCHOUÉ / NON PAYÉ
  if (subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
    // Autoriser uniquement la page de facturation
    if (!pathname.startsWith('/settings/billing') && !pathname.startsWith('/api/')) {
      console.log('🚫 Access denied - unpaid:', pathname);
      return NextResponse.redirect(new URL('/settings/billing?status=payment_required', request.url));
    }
  }

  // 3. ABONNEMENT ANNULÉ
  if (subscriptionStatus === 'canceled') {
    // Rediriger vers pricing pour réactiver
    if (!pathname.startsWith('/settings/billing') && !pathname.startsWith('/pricing')) {
      console.log('🚫 Access denied - canceled:', pathname);
      return NextResponse.redirect(new URL('/pricing?status=reactivate_required', request.url));
    }
  }

  // 4. TRIAL EXPIRÉ
  if (subscriptionStatus === 'trialing' && company.trial_ends_at) {
    if (new Date(company.trial_ends_at) < new Date()) {
      if (!pathname.startsWith('/settings/billing') && !pathname.startsWith('/pricing')) {
        console.log('🚫 Trial expired');
        return NextResponse.redirect(new URL('/settings/billing?trial_ended=true', request.url));
      }
    }
  }

  // ============================================
  // 📋 VÉRIFICATION ONBOARDING
  // ============================================
  if (company.onboarding_completed === false) {
    // Autoriser uniquement les routes onboarding et API onboarding
    const isOnboardingRoute = pathname.startsWith('/onboarding') || pathname.startsWith('/api/onboarding');
    
    if (!isOnboardingRoute) {
      console.log('📋 Redirect to onboarding:', pathname);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
