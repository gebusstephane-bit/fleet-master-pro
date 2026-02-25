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
import { getSuperadminEmail, isSuperadminEmail } from "@/lib/superadmin";
import {
  checkSensitiveRateLimit,
  checkAnonymousRateLimit,
  getRateLimitHeaders,
  RateLimitResult,
} from "@/lib/security/rate-limiter";
import { isRedisConfigured } from "@/lib/security/rate-limiter-redis";
import { timingSafeEqual, scryptSync } from "crypto";

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
];

// Routes autorisées pendant un paiement en attente
const pendingPaymentAllowedRoutes = [
  "/register/confirm",
  "/settings/billing",
  "/api/stripe",
  "/payment-pending",
];

/**
 * Vérifie si une route est une API route publique
 */
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Extrait l'IP réelle du client
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
 * Vérifie le secret admin de manière constant-time (protection timing attack)
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
 * Applique le rate limiting aux routes API
 * Retourne une réponse 429 si la limite est dépassée, null sinon
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
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;

    if (!isVercelCron && process.env.NODE_ENV === "production") {
      console.warn(
        `🚫 Rate limit: Tentative d'accès au cron sans secret Vercel: ${ip}`
      );
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
    console.warn(`🚫 Rate limit dépassé pour ${ip} sur ${pathname}`);

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
 * Vérifie l'autorisation pour les routes admin
 * Retourne une réponse 401 si non autorisé, null si OK
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
      console.warn(
        `🚫 Tentative accès admin non autorisée (reset-user-password): ${ip}`
      );
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
      console.warn(
        `🚫 Tentative accès admin non autorisée (create-superadmin): ${ip}`
      );
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
  console.warn(`🚫 Route admin non reconnue: ${pathname}`);
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
      console.warn(`🚫 Rate limit admin dépassé pour ${ip}`);
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
      console.log("❌ Middleware: Accès SuperAdmin refusé pour", user?.email);
      return NextResponse.redirect(new URL("/404", request.url));
    }

    console.log("✅ Middleware: Accès SuperAdmin accordé à", user.email);
    return response;
  }

  // Routes publiques
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
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
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Récupérer le profil et l'entreprise
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

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
      console.log("🚫 Access denied - pending payment:", pathname);
      return NextResponse.redirect(new URL("/payment-pending", request.url));
    }
  }

  // 2. PAIEMENT ÉCHOUÉ / NON PAYÉ
  if (subscriptionStatus === "unpaid" || subscriptionStatus === "past_due") {
    if (
      !pathname.startsWith("/settings/billing") &&
      !pathname.startsWith("/api/")
    ) {
      console.log("🚫 Access denied - unpaid:", pathname);
      return NextResponse.redirect(
        new URL("/settings/billing?status=payment_required", request.url)
      );
    }
  }

  // 3. ABONNEMENT ANNULÉ
  if (subscriptionStatus === "canceled") {
    if (!pathname.startsWith("/settings/billing") && !pathname.startsWith("/pricing")) {
      console.log("🚫 Access denied - canceled:", pathname);
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
        console.log("🚫 Trial expired");
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
      console.log("📋 Redirect to onboarding:", pathname);
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Log configuration Redis au démarrage (une seule fois)
  if (process.env.NODE_ENV === "development" && pathname === "/") {
    console.log(
      `[MIDDLEWARE] Redis Rate Limiting: ${
        isRedisConfigured() ? "✅ Activé" : "⚠️ Fallback mémoire"
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
    // Routes protégées générales (excluant les assets statiques)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
