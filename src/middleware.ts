/**
 * Middleware Next.js - SÉCURITÉ + VÉRIFICATION SUBSCRIPTION
 * 
 * 1. RATE LIMITING - Protection contre brute-force et abuse
 * 2. AUTHENTIFICATION - Vérification des sessions
 * 3. SUBSCRIPTION STATUS - Contrôle des accès selon abonnement
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSuperadminEmail, isSuperadminEmail } from '@/lib/superadmin';
import { 
  getClientIP, 
  checkRateLimit, 
  createRateLimitResponse, 
  RateLimits 
} from '@/lib/security/rate-limit';

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

// Routes API publiques (rate limit appliqué mais pas d'auth)
const publicApiRoutes = [
  '/api/auth', 
  '/api/stripe/webhook', 
  '/api/stripe/create-checkout-session',
  '/api/stripe/checkout-success',
  '/api/admin/reset-user-password', 
  '/api/cron'
];

// Routes autorisées pendant un paiement en attente
const pendingPaymentAllowedRoutes = [
  '/register/confirm',
  '/settings/billing',
  '/api/stripe',
  '/payment-pending',
];

/**
 * Vérifie si une route est une API route publique
 */
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some(route => pathname.startsWith(route));
}

/**
 * Applique le rate limiting aux routes API
 * Retourne une réponse 429 si la limite est dépassée, null sinon
 */
function applyRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  if (!pathname.startsWith('/api/')) return null;
  
  const ip = getClientIP(request);
  
  // Rate limiting spécifique par type de route
  let rateLimitConfig: { requests: number; windowMs: number } = RateLimits.general;
  let routeType = 'general';
  
  if (pathname.includes('/api/stripe/create-checkout-session')) {
    rateLimitConfig = RateLimits.checkout;
    routeType = 'checkout';
  } else if (pathname.includes('/api/stripe/webhook')) {
    rateLimitConfig = RateLimits.webhook;
    routeType = 'webhook';
  } else if (pathname.includes('/api/auth')) {
    rateLimitConfig = RateLimits.auth;
    routeType = 'auth';
  } else if (pathname.includes('/api/sos/smart-search')) {
    rateLimitConfig = RateLimits.sosAuthenticated;
    routeType = 'sos';
  } else if (pathname.includes('/api/cron')) {
    // Les cron jobs doivent avoir un header spécial de Vercel
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;
    
    if (!isVercelCron && process.env.NODE_ENV === 'production') {
      console.warn(`🚫 Rate limit: Tentative d'accès au cron sans secret Vercel: ${ip}`);
      return createRateLimitResponse(
        'Accès non autorisé aux endpoints cron',
        Date.now() + 60 * 60 * 1000
      );
    }
    // Pas de rate limit pour les cron légitimes
    return null;
  }
  
  // Vérifier le rate limit
  const result = checkRateLimit(`${ip}:${routeType}`, rateLimitConfig);
  
  if (!result.success) {
    console.warn(`🚫 Rate limit dépassé pour ${ip} sur ${pathname}`);
    return createRateLimitResponse(
      routeType === 'checkout' 
        ? 'Trop de tentatives. Réessayez dans 1 heure ou contactez le support.'
        : 'Trop de requêtes. Veuillez réessayer plus tard.',
      result.resetAt
    );
  }
  
  // Pour les routes API publiques, retourner une réponse avec les headers
  if (isPublicApiRoute(pathname)) {
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.requests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    return response;
  }
  
  return null;
}

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

  // ============================================
  // 🛡️ RATE LIMITING - Toutes les routes API
  // ============================================
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = applyRateLimit(request, pathname);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    // Si pas de réponse, continuer avec les vérifications suivantes
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
