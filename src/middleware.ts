/**
 * Middleware Next.js - SÉCURITÉ + VÉRIFICATION SUBSCRIPTION
 * 
 * 1. RATE LIMITING - Protection contre brute-force et abuse (REDIS UPSTASH)
 * 2. AUTHENTIFICATION - Vérification des sessions
 * 3. SUBSCRIPTION STATUS - Contrôle des accès selon abonnement
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSuperadminEmail, isSuperadminEmail } from '@/lib/superadmin';
import { 
  checkSensitiveRateLimit,
  checkAnonymousRateLimit,
  getRateLimitHeaders,
  RateLimitResult
} from '@/lib/security/rate-limiter';
import { isRedisConfigured } from '@/lib/security/rate-limiter-redis';

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
 * Extrait l'IP réelle du client
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Applique le rate limiting aux routes API
 * Retourne une réponse 429 si la limite est dépassée, null sinon
 */
async function applyRateLimit(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  if (!pathname.startsWith('/api/')) return null;
  
  const ip = getClientIP(request);
  
  // Déterminer le type de rate limit
  let result: RateLimitResult;
  let routeType = 'general';
  
  if (pathname.includes('/api/stripe/create-checkout-session')) {
    routeType = 'checkout';
    result = await checkSensitiveRateLimit(`checkout:${ip}`);
  } else if (pathname.includes('/api/stripe/webhook')) {
    // Webhooks: pas de rate limit (sécurisé par signature)
    return null;
  } else if (pathname.includes('/api/auth')) {
    routeType = 'auth';
    result = await checkSensitiveRateLimit(`auth:${ip}`);
  } else if (pathname.includes('/api/sos/smart-search')) {
    routeType = 'sos';
    result = await checkAnonymousRateLimit();
  } else if (pathname.includes('/api/cron')) {
    // Les cron jobs doivent avoir un header spécial de Vercel
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;
    
    if (!isVercelCron && process.env.NODE_ENV === 'production') {
      console.warn(`🚫 Rate limit: Tentative d'accès au cron sans secret Vercel: ${ip}`);
      return new NextResponse(
        JSON.stringify({ error: 'Accès non autorisé aux endpoints cron' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Pas de rate limit pour les cron légitimes
    return null;
  } else {
    // API générique
    result = await checkAnonymousRateLimit();
  }
  
  if (!result.success) {
    console.warn(`🚫 Rate limit dépassé pour ${ip} sur ${pathname}`);
    
    const message = routeType === 'checkout' 
      ? 'Trop de tentatives. Réessayez dans 1 heure ou contactez le support.'
      : 'Trop de requêtes. Veuillez réessayer plus tard.';
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too Many Requests', 
        message,
        retryAfter: result.retryAfter 
      }),
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          ...getRateLimitHeaders(result)
        }
      }
    );
  }
  
  // Pour les routes API publiques, retourner une réponse avec les headers
  if (isPublicApiRoute(pathname)) {
    const response = NextResponse.next();
    Object.entries(getRateLimitHeaders(result)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
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
    const rateLimitResponse = await applyRateLimit(request, pathname);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
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
    if (!pathname.startsWith('/settings/billing') && !pathname.startsWith('/api/')) {
      console.log('🚫 Access denied - unpaid:', pathname);
      return NextResponse.redirect(new URL('/settings/billing?status=payment_required', request.url));
    }
  }

  // 3. ABONNEMENT ANNULÉ
  if (subscriptionStatus === 'canceled') {
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
    const isOnboardingRoute = pathname.startsWith('/onboarding') || pathname.startsWith('/api/onboarding');
    
    if (!isOnboardingRoute) {
      console.log('📋 Redirect to onboarding:', pathname);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Log configuration Redis au démarrage (une seule fois)
  if (process.env.NODE_ENV === 'development' && pathname === '/') {
    console.log(`[MIDDLEWARE] Redis Rate Limiting: ${isRedisConfigured() ? '✅ Activé' : '⚠️ Fallback mémoire'}`);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
