/**
 * Rate Limiter pour FleetMaster Pro - Production Ready
 * Protection contre les attaques DoS et abus d'API
 *
 * Architecture :
 * - Redis Upstash (primaire) : distribué, persistant, compatible serverless
 * - Mémoire Node.js (fallback) : backup si Redis indisponible
 *
 * Règles appliquées :
 * - /api/auth/login : 5 tentatives / 15 min par IP
 * - /api/auth/register : 3 tentatives / 60 min par IP
 * - /api/** (général) : 100 requêtes / min par IP
 * - Routes publiques (/api/webhooks/*) : exclues
 *
 * Algorithme : Sliding Window via @upstash/ratelimit
 */

import { headers } from "next/headers";
import {
  checkRedisRateLimit,
  isRedisConfigured,
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkGeneralRateLimit,
  isRateLimitExemptRoute,
  getRateLimitTypeForRoute,
  type RateLimitType,
} from "./rate-limiter-redis";

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration des limites par type d'utilisateur/action
 * Synchronisé avec rate-limiter-redis.ts
 */
const CONFIG = {
  /** Login : 5 tentatives / 15 minutes */
  login: { limit: 5, windowMs: 15 * 60 * 1000 },

  /** Register : 3 tentatives / 60 minutes */
  register: { limit: 3, windowMs: 60 * 60 * 1000 },

  /** API générale : 100 requêtes / minute */
  general: { limit: 100, windowMs: 60 * 1000 },

  /** Legacy : Actions sensibles (auth, password reset) */
  sensitive: { limit: 5, windowMs: 60 * 1000 },

  /** Legacy : IP non authentifiée */
  anonymous: { limit: 10, windowMs: 60 * 1000 },

  /** Legacy : Utilisateur authentifié */
  authenticated: { limit: 100, windowMs: 60 * 1000 },

  /** Burst limit : 5 requêtes simultanées */
  burst: { limit: 5, windowMs: 10 * 1000 },
} as const;

type RateLimitConfig = (typeof CONFIG)[keyof typeof CONFIG];

// ============================================
// STOCKAGE EN MÉMOIRE (FALLBACK)
// ============================================

/**
 * Stockage en mémoire pour fallback si Redis indisponible.
 * Reset à chaque déploiement (fonctionnement normal en dev).
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Récupère l'IP réelle du client.
 * Gère les proxies et headers forwarded (Vercel, Cloudflare, etc.)
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // Ordre de priorité pour récupérer l'IP
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIP = headersList.get("x-real-ip");
  const vercelForwardedFor = headersList.get("x-vercel-forwarded-for");
  const cfConnectingIP = headersList.get("cf-connecting-ip");

  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback : user-agent hash (moins fiable mais évite les erreurs)
  const userAgent = headersList.get("user-agent") || "unknown";
  return `fallback_${Buffer.from(userAgent).toString("base64").slice(0, 20)}`;
}

// ============================================
// INTERFACE PUBLIQUE
// ============================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// ============================================
// IMPLÉMENTATION MÉMOIRE (FALLBACK)
// ============================================

/**
 * Implémentation du rate limiting en mémoire (fallback).
 * Utilisé uniquement si Redis est indisponible.
 */
function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Nouvelle fenêtre
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  if (record.count >= config.limit) {
    // Limite atteinte
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  // Incrémenter
  record.count++;
  rateLimitStore.set(key, record);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetTime,
  };
}

// ============================================
// FONCTIONS PUBLIQUES DE RATE LIMITING
// ============================================

/**
 * Vérifie le rate limit pour une IP anonyme (fallback legacy).
 * Préfère Redis si disponible.
 */
export async function checkAnonymousRateLimit(): Promise<RateLimitResult> {
  const ip = await getClientIP();

  // Redis en priorité (distribué, multi-instances)
  const redisResult = await checkRedisRateLimit(ip, "anonymous");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire (dev ou Redis non configuré)
  const burstResult = checkRateLimitMemory(`burst:${ip}`, CONFIG.burst);
  if (!burstResult.success) {
    return { ...burstResult, retryAfter: burstResult.retryAfter || 10 };
  }
  return checkRateLimitMemory(`anon:${ip}`, CONFIG.anonymous);
}

/**
 * Vérifie le rate limit pour un utilisateur authentifié (fallback legacy).
 * Préfère Redis si disponible.
 */
export async function checkAuthenticatedRateLimit(userId: string): Promise<RateLimitResult> {
  // Redis en priorité
  const redisResult = await checkRedisRateLimit(userId, "authenticated");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  const burstResult = checkRateLimitMemory(`burst:user:${userId}`, CONFIG.burst);
  if (!burstResult.success) {
    return { ...burstResult, retryAfter: burstResult.retryAfter || 10 };
  }
  return checkRateLimitMemory(`auth:${userId}`, CONFIG.authenticated);
}

/**
 * Vérifie le rate limit pour une action sensible (legacy).
 * Préfère Redis si disponible.
 */
export async function checkSensitiveRateLimit(identifier: string): Promise<RateLimitResult> {
  // Redis en priorité
  const redisResult = await checkRedisRateLimit(identifier, "sensitive");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  return checkRateLimitMemory(`sensitive:${identifier}`, CONFIG.sensitive);
}

/**
 * Vérifie le rate limit pour une route de login.
 * 5 tentatives / 15 minutes par IP.
 */
export async function checkLoginRateLimitByIP(ip?: string): Promise<RateLimitResult> {
  const clientIP = ip || (await getClientIP());

  // Redis en priorité
  const redisResult = await checkLoginRateLimit(clientIP);
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  return checkRateLimitMemory(`login:${clientIP}`, CONFIG.login);
}

/**
 * Vérifie le rate limit pour une route de register.
 * 3 tentatives / 60 minutes par IP.
 */
export async function checkRegisterRateLimitByIP(ip?: string): Promise<RateLimitResult> {
  const clientIP = ip || (await getClientIP());

  // Redis en priorité
  const redisResult = await checkRegisterRateLimit(clientIP);
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  return checkRateLimitMemory(`register:${clientIP}`, CONFIG.register);
}

/**
 * Vérifie le rate limit général pour les API.
 * 100 requêtes / minute par IP.
 */
export async function checkGeneralApiRateLimit(ip?: string): Promise<RateLimitResult> {
  const clientIP = ip || (await getClientIP());

  // Redis en priorité
  const redisResult = await checkGeneralRateLimit(clientIP);
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  return checkRateLimitMemory(`general:${clientIP}`, CONFIG.general);
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware de rate limiting pour Server Actions.
 *
 * Usage dans next-safe-action :
 * ```ts
 * export const myAction = actionClient
 *   .use(async ({ next }) => {
 *     const rateLimit = await rateLimitMiddleware({ userId: 'xxx' });
 *     if (!rateLimit.allowed) throw new Error(rateLimit.error);
 *     return next({ ctx: {} });
 *   })
 *   .action(async ({ ctx }) => { ... });
 * ```
 */
export async function rateLimitMiddleware({
  userId,
  isSensitive = false,
}: {
  userId?: string;
  isSensitive?: boolean;
}): Promise<{ allowed: true } | { allowed: false; error: string }> {
  try {
    let result: RateLimitResult;

    if (isSensitive) {
      const ip = await getClientIP();
      result = await checkSensitiveRateLimit(ip);
    } else if (userId) {
      result = await checkAuthenticatedRateLimit(userId);
    } else {
      result = await checkAnonymousRateLimit();
    }

    if (!result.success) {
      return {
        allowed: false,
        error: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[RATE LIMITER] Error:", error);
    // En cas d'erreur, autoriser mais logger (ne pas bloquer les users légitimes)
    return { allowed: true };
  }
}

/**
 * Middleware de rate limiting pour routes API spécifiques.
 * À utiliser dans les route handlers Next.js.
 */
export async function rateLimitForRoute(
  pathname: string,
  ip?: string
): Promise<RateLimitResult & { headers: Record<string, string> }> {
  const clientIP = ip || (await getClientIP());

  // Vérifier si la route est exemptée
  if (isRateLimitExemptRoute(pathname)) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
      headers: {},
    };
  }

  let result: RateLimitResult;
  const type = getRateLimitTypeForRoute(pathname);

  switch (type) {
    case "login":
      result = await checkLoginRateLimitByIP(clientIP);
      break;
    case "register":
      result = await checkRegisterRateLimitByIP(clientIP);
      break;
    case "general":
    default:
      result = await checkGeneralApiRateLimit(clientIP);
      break;
  }

  return {
    ...result,
    headers: getRateLimitHeaders(result),
  };
}

// ============================================
// HEADERS
// ============================================

/**
 * En-têtes de rate limit standard pour la réponse HTTP.
 *
 * Standards utilisés :
 * - X-RateLimit-Limit : Nombre max de requêtes
 * - X-RateLimit-Remaining : Requêtes restantes
 * - X-RateLimit-Reset : Timestamp de reset (ms)
 * - Retry-After : Secondes à attendre (si limit atteinte)
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

// ============================================
// NETTOYAGE PÉRIODIQUE (FALLBACK MÉMOIRE)
// ============================================

/**
 * Nettoyage périodique des entrées expirées (toutes les 5 minutes).
 * Uniquement pour le fallback mémoire.
 */
if (typeof globalThis !== "undefined" && !isRedisConfigured()) {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of Array.from(rateLimitStore.entries())) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV === "development") {
      console.log(`[RATE LIMITER] Cleaned ${cleaned} expired entries (memory fallback)`);
    }
  }, 5 * 60 * 1000);
}

// ============================================
// MÉTRIQUES (DEBUGGING)
// ============================================

/**
 * Récupère les statistiques du rate limiter.
 * En production avec Redis, retourne des métriques simplifiées.
 */
export function getRateLimitStats(): {
  totalEntries: number;
  memoryEstimate: string;
  redisConfigured: boolean;
} {
  const totalEntries = rateLimitStore.size;
  const memoryEstimate = `${((totalEntries * 200) / 1024).toFixed(2)} KB`;

  return {
    totalEntries,
    memoryEstimate,
    redisConfigured: isRedisConfigured(),
  };
}

// ============================================
// EXPORTS SUPPLÉMENTAIRES
// ============================================

export {
  isRedisConfigured,
  isRateLimitExemptRoute,
  getRateLimitTypeForRoute,
  type RateLimitType,
};
