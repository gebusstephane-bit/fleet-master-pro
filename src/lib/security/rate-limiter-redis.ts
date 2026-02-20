/**
 * Rate Limiter Redis — Implémentation Upstash
 *
 * Remplace le stockage in-memory par Redis distribué.
 * Compatible serverless Vercel (multi-instances, redémarrages).
 *
 * Algorithme : Sliding Window (plus précis que Fixed Window)
 * Limites synchronisées avec rate-limiter.ts :
 *   - anonymous  : 10 req / 60s
 *   - authenticated : 100 req / 60s
 *   - sensitive  :  5 req / 60s
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitResult } from "./rate-limiter";

// ============================================
// INITIALISATION LAZY (évite les erreurs au build)
// ============================================

let _redis: Redis | null = null;
let _limiters: {
  anonymous: Ratelimit;
  authenticated: Ratelimit;
  sensitive: Ratelimit;
} | null = null;

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
      // Utilisateurs non authentifiés (IP-based)
      anonymous: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        prefix: "rl:anon",
        analytics: true,
        timeout: 1000, // 1s timeout pour ne pas bloquer la requête si Redis lent
      }),

      // Utilisateurs authentifiés (user-ID-based)
      authenticated: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "60 s"),
        prefix: "rl:auth",
        analytics: true,
        timeout: 1000,
      }),

      // Actions sensibles : login, register, reset password
      sensitive: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "rl:sensitive",
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
 * Utilisé pour afficher le bon log au démarrage.
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Vérifie le rate limit via Redis.
 * Retourne null si Redis n'est pas disponible → fallback mémoire.
 */
export async function checkRedisRateLimit(
  key: string,
  type: "anonymous" | "authenticated" | "sensitive"
): Promise<RateLimitResult | null> {
  const limiters = getLimiters();
  if (!limiters) return null;

  try {
    const { success, limit, remaining, reset } = await limiters[type].limit(key);
    const now = Date.now();

    return {
      success,
      limit,
      remaining,
      reset,
      retryAfter: success ? undefined : Math.ceil((reset - now) / 1000),
    };
  } catch (error) {
    // Redis temporairement indisponible → fallback silencieux
    console.error("[RATE LIMITER REDIS] Fallback to memory:", error);
    return null;
  }
}
