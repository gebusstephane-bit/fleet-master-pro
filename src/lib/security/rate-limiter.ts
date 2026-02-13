/**
 * Rate Limiter pour FleetMaster Pro
 * Protection contre les attaques DoS et abus d'API
 * 
 * Configuration:
 * - IP non authentifiée: 10 requêtes/minute
 * - Utilisateur authentifié: 100 requêtes/minute
 * - Burst limit: 5 requêtes simultanées
 * 
 * SECURITY NOTICE: Ce fichier implémente une protection en mémoire.
 * Pour production à grande échelle, utiliser Redis (Upstash).
 */

import { headers } from 'next/headers';

// Stockage en mémoire pour les rate limits (sera reset à chaque déploiement)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const CONFIG = {
  anonymous: { limit: 10, windowMs: 60 * 1000 }, // 10 req/min
  authenticated: { limit: 100, windowMs: 60 * 1000 }, // 100 req/min
  sensitive: { limit: 5, windowMs: 60 * 1000 }, // 5 req/min
  burst: { limit: 5, windowMs: 10 * 1000 }, // 5 req/10s
};

/**
 * Récupère l'IP réelle du client
 * Gère les proxies et headers forwarded
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  
  // Ordre de priorité pour récupérer l'IP
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback: user-agent hash
  const userAgent = headersList.get('user-agent') || 'unknown';
  return `fallback_${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Implémentation basique du rate limiting en mémoire
 */
function checkRateLimit(key: string, config: { limit: number; windowMs: number }): RateLimitResult {
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

/**
 * Vérifie le rate limit pour une IP anonyme
 */
export async function checkAnonymousRateLimit(): Promise<RateLimitResult> {
  const ip = await getClientIP();
  
  // Vérifier burst d'abord
  const burstResult = checkRateLimit(`burst:${ip}`, CONFIG.burst);
  if (!burstResult.success) {
    return {
      ...burstResult,
      retryAfter: burstResult.retryAfter || 10,
    };
  }
  
  return checkRateLimit(`anon:${ip}`, CONFIG.anonymous);
}

/**
 * Vérifie le rate limit pour un utilisateur authentifié
 */
export async function checkAuthenticatedRateLimit(userId: string): Promise<RateLimitResult> {
  // Vérifier burst d'abord
  const burstResult = checkRateLimit(`burst:user:${userId}`, CONFIG.burst);
  if (!burstResult.success) {
    return {
      ...burstResult,
      retryAfter: burstResult.retryAfter || 10,
    };
  }
  
  return checkRateLimit(`auth:${userId}`, CONFIG.authenticated);
}

/**
 * Vérifie le rate limit pour une action sensible (login, register, etc.)
 */
export async function checkSensitiveRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(`sensitive:${identifier}`, CONFIG.sensitive);
}

/**
 * Middleware de rate limiting pour Server Actions
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
    console.error('[RATE LIMITER] Error:', error);
    // En cas d'erreur, autoriser mais logger
    return { allowed: true };
  }
}

/**
 * En-têtes de rate limit pour la réponse
 * À ajouter aux réponses API
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
