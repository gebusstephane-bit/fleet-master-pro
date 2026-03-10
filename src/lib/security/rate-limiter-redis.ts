/**
 * Rate Limiter Redis — Implémentation Upstash for Vercel Serverless
 *
 * Remplace le stockage in-memory par Redis distribué.
 * Compatible multi-instances, cold starts, et edge functions.
 *
 * Algorithme : Sliding Window (plus précis que Fixed Window)
 *
 * Règles de rate limiting :
 *   - /api/auth/login     : 5 tentatives / 15 min par IP
 *   - /api/auth/register  : 3 tentatives / 60 min par IP
 *   - /api/** (général)   : 100 requêtes / min par IP
 *   - Routes publiques (/api/webhooks/stripe) : exclues
 *
 * Fallback : Si Redis est indisponible, les requêtes sont autorisées
 * (ne pas bloquer les utilisateurs légitimes en cas de panne)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitResult } from "./rate-limiter";

// ============================================
// CONFIGURATION DES LIMITES
// ============================================

export const RATE_LIMIT_CONFIG = {
  /** Login : 5 tentatives / 15 minutes par IP */
  login: { limit: 5, window: "15 m" as const },

  /** Register : 3 tentatives / 60 minutes par IP */
  register: { limit: 3, window: "60 m" as const },

  /** API générale : 100 requêtes / minute par IP */
  general: { limit: 100, window: "60 s" as const },

  /** Actions sensibles (fallback legacy) : 5 req / 60s */
  sensitive: { limit: 5, window: "60 s" as const },

  /** Anonymous (fallback legacy) : 10 req / 60s */
  anonymous: { limit: 10, window: "60 s" as const },

  /** Authenticated (fallback legacy) : 100 req / 60s */
  authenticated: { limit: 100, window: "60 s" as const },
};

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

// ============================================
// INITIALISATION LAZY (évite les erreurs au build)
// ============================================

let _redis: Redis | null = null;
let _limiters: Record<RateLimitType, Ratelimit> | null = null;

function getRedis(): Redis | null {
  // Guard : ne s'exécute que côté serveur
  if (typeof window !== "undefined") return null;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return _redis;
}

function getLimiters() {
  const redis = getRedis();
  if (!redis) return null;

  if (!_limiters) {
    _limiters = {
      // Login : 5 tentatives / 15 min
      login: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.login.limit,
          RATE_LIMIT_CONFIG.login.window
        ),
        prefix: "rl:login",
        analytics: true,
        timeout: 1500, // 1.5s timeout pour ne pas bloquer si Redis lent
      }),

      // Register : 3 tentatives / 60 min
      register: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.register.limit,
          RATE_LIMIT_CONFIG.register.window
        ),
        prefix: "rl:register",
        analytics: true,
        timeout: 1500,
      }),

      // API générale : 100 req / min
      general: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.general.limit,
          RATE_LIMIT_CONFIG.general.window
        ),
        prefix: "rl:general",
        analytics: true,
        timeout: 1000,
      }),

      // Legacy sensitive : 5 req / 60s
      sensitive: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.sensitive.limit,
          RATE_LIMIT_CONFIG.sensitive.window
        ),
        prefix: "rl:sensitive",
        analytics: true,
        timeout: 1000,
      }),

      // Legacy anonymous : 10 req / 60s
      anonymous: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.anonymous.limit,
          RATE_LIMIT_CONFIG.anonymous.window
        ),
        prefix: "rl:anon",
        analytics: true,
        timeout: 1000,
      }),

      // Legacy authenticated : 100 req / 60s
      authenticated: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_CONFIG.authenticated.limit,
          RATE_LIMIT_CONFIG.authenticated.window
        ),
        prefix: "rl:auth",
        analytics: true,
        timeout: 1000,
      }),
    };
  }

  return _limiters;
}

// ============================================
// API PUBLIQUE
// ============================================

/**
 * Retourne true si Redis est configuré (env vars présentes).
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Vérifie le rate limit via Redis avec le type spécifié.
 * Retourne null si Redis n'est pas disponible → fallback mémoire.
 */
export async function checkRedisRateLimit(
  key: string,
  type: RateLimitType
): Promise<RateLimitResult | null> {
  const limiters = getLimiters();
  if (!limiters) return null;

  try {
    const { success, limit, remaining, reset } = await limiters[type].limit(key);
    const now = Date.now();

    return {
      success,
      limit,
      remaining: Math.max(0, remaining),
      reset,
      retryAfter: success ? undefined : Math.ceil((reset - now) / 1000),
    };
  } catch (error) {
    // Redis temporairement indisponible → fallback silencieux
    console.error("[RATE LIMITER REDIS] Error, fallback to memory:", error);
    return null;
  }
}

/**
 * Vérifie le rate limit pour une route de login.
 * 5 tentatives / 15 minutes par IP.
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult | null> {
  return checkRedisRateLimit(ip, "login");
}

/**
 * Vérifie le rate limit pour une route de register.
 * 3 tentatives / 60 minutes par IP.
 */
export async function checkRegisterRateLimit(ip: string): Promise<RateLimitResult | null> {
  return checkRedisRateLimit(ip, "register");
}

/**
 * Vérifie le rate limit général pour les API.
 * 100 requêtes / minute par IP.
 */
export async function checkGeneralRateLimit(ip: string): Promise<RateLimitResult | null> {
  return checkRedisRateLimit(ip, "general");
}

/**
 * Vérifie si une route doit être exclue du rate limiting.
 * Routes publiques : webhooks, health checks, etc.
 */
export function isRateLimitExemptRoute(pathname: string): boolean {
  const exemptPrefixes = [
    "/api/webhooks/", // Webhooks Stripe - sécurisés par signature
    "/api/health", // Health checks
    "/api/auth/callback", // OAuth callbacks
    "/_next/", // Assets Next.js
    "/favicon", // Favicon
  ];

  return exemptPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Détermine le type de rate limit à appliquer selon la route.
 */
export function getRateLimitTypeForRoute(pathname: string): RateLimitType {
  if (pathname.includes("/api/auth/login") || pathname.includes("/api/auth/signin")) {
    return "login";
  }
  if (pathname.includes("/api/auth/register") || pathname.includes("/api/auth/signup")) {
    return "register";
  }
  if (pathname.includes("/api/auth/")) {
    return "sensitive";
  }
  return "general";
}
