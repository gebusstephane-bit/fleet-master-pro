/**
 * Middleware Next.js - SÉCURITÉ + VÉRIFICATION SUBSCRIPTION
 *
 * 1. RATE LIMITING - Protection contre brute-force et abuse (REDIS UPSTASH)
 * 2. AUTHENTIFICATION - Vérification des sessions
 * 3. SUBSCRIPTION STATUS - Contrôle des accès selon abonnement
 * 4. ADMIN PROTECTION - Protection des endpoints /api/admin/* par secret
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logger } from "@/lib/logger";
import { getSuperadminEmail, isSuperadminEmail } from "@/lib/superadmin";
import {
  checkSensitiveRateLimit,
  checkAnonymousRateLimit,
  getRateLimitHeaders,
  RateLimitResult,
} from "@/lib/security/rate-limiter";
import { isRedisConfigured } from "@/lib/security/rate-limiter-redis";
import { timingSafeEqual, scryptSync } from "crypto";
import { USER_ROLE } from "@/constants/enums";

// Routes publiques (pas de vérification)
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/unauthorized",
  "/pricing",
  "/terms",
  "/privacy",
  "/driver-app", // Route de l'app conducteur
  "/sitemap.xml",
  "/robots.txt",
];

// Routes QR Code scan (publiques mais avec rate limiting strict)
const scanPublicRoutes = [
  "/scan/",
];

// Routes API publiques (rate limit appliqué mais pas d'auth)
// ⚠️  /api/admin/* est EXCLU - protégé par secret ci-dessous
const publicApiRoutes = [
  "/api/auth",
  "/api/stripe/webhook",
  "/api/stripe/create-checkout-session",
  "/api/stripe/checkout-success",
  // "/api/admin/reset-user-password" - SUPPRIMÉ: protégé par secret dans le middleware
  "/api/cron",
  // Route de cleanup E2E — accessible sans auth (la route elle-même bloque en production)
  "/api/e2e",
];

// Routes autorisées pendant un paiement en attente
const pendingPaymentAllowedRoutes = [
  "/register/confirm",
  "/settings/billing",
  "/api/stripe",
  "/payment-pending",
];

/**
 * Vérifie si une route est une API route publique (auth, stripe webhooks, etc.)
 * @param pathname - Le chemin de la requête
 * @returns true si la route est une API publique
 */
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Vérifie si une route est une route de scan QR Code publique
 * @param pathname - Le chemin de la requête
 * @returns true si la route commence par /scan/
 */
function isScanPublicRoute(pathname: string): boolean {
  return scanPublicRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Extrait l'IP réelle du client depuis les headers X-Forwarded-For ou X-Real-IP
 * @param request - La requête Next.js
 * @returns L'adresse IP du client ou "unknown"
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Vérifie le secret admin de manière constant-time (protection timing attack).
 * Utilise timingSafeEqual pour éviter les attaques par analyse de temps.
 * @param providedSecret - Le secret fourni dans le header
 * @param expectedSecret - Le secret attendu (depuis env)
 * @returns boolean - true si le secret est valide
 */
function verifyAdminSecret(
  providedSecret: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!providedSecret || !expectedSecret) {
    return false;
  }

  // Normaliser les longueurs pour éviter les fuites via longueur
  const maxLength = Math.max(providedSecret.length, expectedSecret.length);

  // Padding avec des zéros pour avoir la même longueur
  const providedPadded = providedSecret.padEnd(maxLength, "\0");
  const expectedPadded = expectedSecret.padEnd(maxLength, "\0");

  try {
    return timingSafeEqual(
      Buffer.from(providedPadded),
      Buffer.from(expectedPadded)
    );
  } catch {
    return false;
  }
}

/**
 * Applique le rate limiting aux routes API selon le type de route.
 * Routes spéciales : checkout, auth, sos (limites différentes).
 * Retourne une réponse 429 si la limite est dépassée, null sinon.
 * @param request - La requête Next.js
 * @param pathname - Le chemin de la route
 * @returns Réponse 429 ou null si OK
 */
async function applyRateLimit(
  request: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (!pathname.startsWith("/api/")) return null;

  const ip = getClientIP(request);

  // Déterminer le type de rate limit
  let result: RateLimitResult;
  let routeType = "general";

  if (pathname.includes("/api/stripe/create-checkout-session")) {
    routeType = "checkout";
    result = await checkSensitiveRateLimit(`checkout:${ip}`);
  } else if (pathname.includes("/api/stripe/webhook")) {
    // Webhooks: pas de rate limit (sécurisé par signature)
    return null;
  } else if (pathname.includes("/api/auth")) {
    routeType = "auth";
    result = await checkSensitiveRateLimit(`auth:${ip}`);
  } else if (pathname.includes("/api/sos/smart-search")) {
    routeType = "sos";
    result = await checkAnonymousRateLimit();
  } else if (pathname.includes("/api/cron")) {
    // Les cron jobs doivent avoir un header spécial de Vercel
    const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
    const legacySecret = request.headers.get("x-cron-secret");
    const urlSecret = request.nextUrl.searchParams.get("secret");
    const authHeader = request.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const isVercelCron =
      vercelCronSecret === process.env.CRON_SECRET ||
      bearerSecret === process.env.CRON_SECRET ||
      legacySecret === process.env.CRON_SECRET ||
      urlSecret === process.env.CRON_SECRET;

    if (!isVercelCron && process.env.NODE_ENV === "production") {
      logger.warn('Unauthorized cron access attempt', {
        ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
        route: pathname,
      });
      return new NextResponse(
        JSON.stringify({ error: "Accès non autorisé aux endpoints cron" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    // Pas de rate limit pour les cron légitimes
    return null;
  } else {
    // API générique
    result = await checkAnonymousRateLimit();
  }

  if (!result.success) {
    logger.warn('Rate limit exceeded', {
      ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
      route: pathname,
      routeType,
    });

    const message =
      routeType === "checkout"
        ? "Trop de tentatives. Réessayez dans 1 heure ou contactez le support."
        : "Trop de requêtes. Veuillez réessayer plus tard.";

    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message,
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          ...getRateLimitHeaders(result),
        },
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

/**
 * Vérifie l'autorisation pour les routes admin via secret.
 * Routes protégées : reset-user-password, create-superadmin.
 * Retourne une réponse 401/403 si non autorisé, null si OK.
 * @param request - La requête Next.js
 * @param pathname - Le chemin de la route admin
 * @returns Réponse d'erreur ou null si autorisé
 */
async function checkAdminAuthorization(
  request: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (!pathname.startsWith("/api/admin/")) {
    return null;
  }

  const ip = getClientIP(request);

  // Routes admin spécifiques avec secrets différents
  if (pathname === "/api/admin/reset-user-password") {
    const secret = request.headers.get("x-admin-secret");

    if (!verifyAdminSecret(secret, process.env.SUPERADMIN_SETUP_SECRET)) {
      logger.warn('Unauthorized admin access attempt', {
        route: 'reset-user-password',
        ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
      });
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
          message: "Secret invalide ou manquant",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Secret valide, autoriser
    return null;
  }

  if (pathname === "/api/admin/create-superadmin") {
    const secret = request.headers.get("X-Setup-Secret");

    if (!verifyAdminSecret(secret, process.env.SUPERADMIN_SETUP_SECRET)) {
      logger.warn('Unauthorized admin access attempt', {
        route: 'create-superadmin',
        ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
      });
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
          message: "Secret invalide ou manquant",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Secret valide, autoriser
    return null;
  }

  // Autres routes admin: bloquer par défaut
  logger.warn('Unknown admin route access attempt', {
    route: pathname,
    ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
  });
  return new NextResponse(
    JSON.stringify({
      error: "Forbidden",
      message: "Route admin non autorisée",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Middleware Next.js principal - Gère l'authentification, les abonnements et la sécurité.
 * Flux : 1) Protection admin, 2) Superadmin, 3) Routes publiques, 4) Rate limiting,
 * 5) Authentification, 6) Rôles (chauffeurs), 7) Statut abonnement, 8) Onboarding.
 * @param request - La requête Next.js entrante
 * @returns NextResponse (continuation, redirection ou erreur)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // 🔐 PROTECTION DES ROUTES ADMIN (prioritaire)
  // ============================================
  if (pathname.startsWith("/api/admin/")) {
    // Vérifier le rate limit d'abord (protection brute-force)
    const ip = getClientIP(request);
    const rateLimitResult = await checkSensitiveRateLimit(`admin:${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Admin rate limit exceeded', {
        ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
        route: pathname,
      });
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Trop de tentatives. Réessayez plus tard.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 300),
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Vérifier l'autorisation (secret)
    const authResponse = await checkAdminAuthorization(request, pathname);
    if (authResponse) {
      return authResponse;
    }

    // Si on arrive ici, le secret est valide et le rate limit est OK
    // On laisse passer vers le handler de la route
    const response = NextResponse.next();

    // Ajouter les headers de rate limit
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
      ([key, value]) => {
        response.headers.set(key, value);
      }
    );

    return response;
  }

  // ============================================
  // 🔐 SUPERADMIN (interface web /superadmin)
  // ============================================
  if (pathname.startsWith("/superadmin")) {
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isSuperadminEmail(user.email || '')) {
      logger.warn('SuperAdmin access denied', {
        email: user?.email ? user.email.substring(0, 2) + '***@***' : 'anonymous',
      });
      return NextResponse.redirect(new URL("/404", request.url));
    }

    logger.debug('SuperAdmin access granted', {
      email: user.email ? user.email.substring(0, 2) + '***@***' : 'unknown',
    });
    return response;
  }

  // Routes publiques
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }
  
  // ============================================
  // 📱 ROUTES QR CODE SCAN (PUBLIQUES)
  // ============================================
  if (isScanPublicRoute(pathname)) {
    // Vérifier le rate limiting pour les routes de scan
    const ip = getClientIP(request);
    const rateLimitResult = await checkSensitiveRateLimit(`scan:${ip}`);
    
    if (!rateLimitResult.success) {
      logger.warn('QR scan rate limit exceeded', {
        ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***'),
      });
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Trop de scans. Veuillez réessayer dans une minute.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }
    
    // Route /scan/[vehicleId]/carnet nécessite authentification
    if (pathname.includes('/carnet')) {
      // Laisser passer au middleware d'auth normal
      // Il redirigera vers login si non authentifié
    } else {
      // Routes /scan/* autres que carnet : accès public autorisé
      const response = NextResponse.next();
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
        ([key, value]) => {
          response.headers.set(key, value);
        }
      );
      return response;
    }
  }

  // ============================================
  // 🛡️ RATE LIMITING - Toutes les routes API (non-admin)
  // ============================================
  if (pathname.startsWith("/api/")) {
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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pas authentifié → login
  // Exception : si c'est une route de scan carnet, on redirige vers login avec redirect
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    
    // Pour les routes scan carnet, préserver l'URL complète pour redirection après login
    if (pathname.includes('/scan/') && pathname.includes('/carnet')) {
      redirectUrl.searchParams.set("redirect", pathname);
    } else {
      redirectUrl.searchParams.set("redirect", pathname);
    }
    
    return NextResponse.redirect(redirectUrl);
  }

  // Récupérer le profil et l'entreprise
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  // ============================================
  // 🚖 GESTION DES RÔLES - REDIRECTION CHAUFFEURS
  // ============================================
  
  const userRole = profile?.role;
  const isChauffeur = userRole === USER_ROLE.CHAUFFEUR;
  
  // Si c'est un chauffeur : restrictions d'accès
  if (isChauffeur) {
    // Les chauffeurs ne peuvent PAS accéder au dashboard de gestion
    const isDashboardRoute = 
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/vehicles') ||
      pathname.startsWith('/drivers') ||
      pathname.startsWith('/fuel') ||
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/alerts') ||
      pathname.startsWith('/compliance') ||
      pathname.startsWith('/agenda') ||
      pathname.startsWith('/fleet-costs') ||
      pathname.startsWith('/notifications');
    
    // Les chauffeurs ne peuvent accéder qu'à /driver-app et /api/driver
    const isAllowedRoute = 
      pathname.startsWith('/driver-app') ||
      pathname.startsWith('/api/driver') ||
      pathname.startsWith('/api/sos') ||
      pathname.startsWith('/auth') ||
      pathname === '/login' ||
      pathname === '/unauthorized' ||
      pathname.startsWith('/scan');  // Permettre l'accès au carnet d'entretien
    
    if (isDashboardRoute) {
      logger.debug('Chauffeur redirigé vers /driver-app (tentative accès dashboard):', pathname);
      return NextResponse.redirect(new URL('/driver-app', request.url));
    }
    
    // Si le chauffeur tente d'accéder à une route non autorisée
    if (!isAllowedRoute && pathname !== '/') {
      logger.debug('Chauffeur redirigé vers /driver-app:', pathname);
      return NextResponse.redirect(new URL('/driver-app', request.url));
    }
  }
  
  // Si pas de company_id (cas rare), autoriser l'accès pour création
  if (!profile?.company_id) {
    return response;
  }

  // Vérifier le statut de l'entreprise (onboarding + abonnement)
  const { data: company } = await supabase
    .from("companies")
    .select(
      "subscription_status, subscription_plan, trial_ends_at, onboarding_completed"
    )
    .eq("id", profile.company_id)
    .single();

  if (!company) {
    return response;
  }

  const subscriptionStatus = company.subscription_status;

  // ============================================
  // 🚫 BLOCAGES SELON STATUT
  // ============================================

  // 1. PAIEMENT EN ATTENTE
  if (subscriptionStatus === "pending_payment") {
    const isAllowedRoute = pendingPaymentAllowedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!isAllowedRoute) {
      logger.warn("Access denied - pending payment:", pathname);
      return NextResponse.redirect(new URL("/payment-pending", request.url));
    }
  }

  // 2. PAIEMENT ÉCHOUÉ / NON PAYÉ
  if (subscriptionStatus === "unpaid" || subscriptionStatus === "past_due") {
    if (
      !pathname.startsWith("/settings/billing") &&
      !pathname.startsWith("/api/")
    ) {
      logger.warn("Access denied - unpaid:", pathname);
      return NextResponse.redirect(
        new URL("/settings/billing?status=payment_required", request.url)
      );
    }
  }

  // 3. ABONNEMENT ANNULÉ
  if (subscriptionStatus === "canceled") {
    if (!pathname.startsWith("/settings/billing") && !pathname.startsWith("/pricing")) {
      logger.warn("Access denied - canceled:", pathname);
      return NextResponse.redirect(
        new URL("/pricing?status=reactivate_required", request.url)
      );
    }
  }

  // 4. TRIAL EXPIRÉ
  if (subscriptionStatus === "trialing" && company.trial_ends_at) {
    if (new Date(company.trial_ends_at) < new Date()) {
      if (
        !pathname.startsWith("/settings/billing") &&
        !pathname.startsWith("/pricing")
      ) {
        logger.warn("Trial expired");
        return NextResponse.redirect(
          new URL("/settings/billing?trial_ended=true", request.url)
        );
      }
    }
  }

  // ============================================
  // 📋 VÉRIFICATION ONBOARDING
  // ============================================
  if (company.onboarding_completed === false) {
    const isOnboardingRoute =
      pathname.startsWith("/onboarding") || pathname.startsWith("/api/onboarding");

    if (!isOnboardingRoute) {
      logger.debug("Redirect to onboarding:", pathname);
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Log configuration Redis au démarrage (une seule fois)
  if (process.env.NODE_ENV === "development" && pathname === "/") {
    logger.debug(
      `[MIDDLEWARE] Redis Rate Limiting: ${
        isRedisConfigured() ? "Activé" : "Fallback mémoire"
      }`
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Protection des routes admin
    "/api/admin/:path*",
    // Protection des routes superadmin
    "/superadmin/:path*",
    // Routes protégées générales (excluant les assets statiques et les fichiers publics)
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)",
  ],
};
