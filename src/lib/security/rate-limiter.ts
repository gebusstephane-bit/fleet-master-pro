/**
 * Rate Limiter pour FleetMaster Pro
 * Protection contre les attaques DoS et abus d'API
 * 
 * Configuration:
 * - IP non authentifiée: 10 requêtes/minute
 * - Utilisateur authentifié: 100 requêtes/minute
 * - Burst limit: 5 requêtes simultanées
 * 
 * TODO: MIGRATION REDIS/UPSTASH (Priorité: Haute)
 * =============================================
 * 
 * PROBLÈME ACTUEL:
 * - Stockage en mémoire (Map) est reset à chaque déploiement
 * - Ne fonctionne pas bien en environnement serverless (Vercel)
 * - Pas de persistance entre les instances
 * - Limitations en production à grande échelle
 * 
 * SOLUTION PROPOSÉE:
 * Implémenter un adapter pattern avec Redis/Upstash pour:
 * 1. Persistance des rate limits entre les instances
 * 2. Fonctionnement correct en serverless
 * 3. Meilleure performance et scalabilité
 * 
 * IMPLEMENTATION:
 * ```typescript
 * // Créer un fichier src/lib/security/rate-limiter-redis.ts
 * import { Redis } from '@upstash/redis';
 * 
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN,
 * });
 * 
 * export async function checkRateLimitRedis(key: string, config: RateLimitConfig) {
 *   const pipeline = redis.pipeline();
 *   const now = Date.now();
 *   const windowStart = now - config.windowMs;
 *   
 *   // Supprimer les entrées expirées
 *   pipeline.zremrangebyscore(key, 0, windowStart);
 *   // Compter les entrées restantes
 *   pipeline.zcard(key);
 *   // Ajouter l'entrée actuelle
 *   pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
 *   // Définir l'expiration
 *   pipeline.expire(key, Math.ceil(config.windowMs / 1000));
 *   
 *   const [, count] = await pipeline.exec();
 *   
 *   return {
 *     success: count < config.limit,
 *     limit: config.limit,
 *     remaining: Math.max(0, config.limit - count - 1),
 *     reset: now + config.windowMs,
 *   };
 * }
 * ```
 * 
 * ENV VARS À AJOUTER:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * - UPSTASH_REDIS_REST_URL_FALLBACK (optionnel)
 * 
 * POUR L'INSTANT:
 * Le stockage en mémoire (Map) sert de fallback pour les petites charges.
 * Le nettoyage périodique est implémenté pour éviter les fuites mémoire.
 */

import { headers } from 'next/headers';
import { checkRedisRateLimit, isRedisConfigured } from './rate-limiter-redis';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration des limites par type d'utilisateur/action
 */
const CONFIG = {
  anonymous: { limit: 10, windowMs: 60 * 1000 }, // 10 req/min
  authenticated: { limit: 100, windowMs: 60 * 1000 }, // 100 req/min
  sensitive: { limit: 5, windowMs: 60 * 1000 }, // 5 req/min
  burst: { limit: 5, windowMs: 10 * 1000 }, // 5 req/10s
} as const;

type RateLimitConfig = typeof CONFIG[keyof typeof CONFIG];

// ============================================
// STOCKAGE EN MÉMOIRE (FALLBACK)
// ============================================

/**
 * Stockage en mémoire pour les rate limits
 * 
 * NOTE: Ce stockage sera reset à chaque déploiement et ne persiste
 * pas entre les instances serverless. Voir TODO en haut du fichier
 * pour la migration vers Redis.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

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
 * Implémentation du rate limiting en mémoire
 * 
 * TODO: Remplacer par l'implémentation Redis quand disponible
 * Cette fonction servira de fallback si Redis est indisponible
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
 * Vérifie le rate limit pour une IP anonyme
 * 
 * TODO: Quand Redis est implémenté, essayer d'abord Redis,
 * puis fallback sur mémoire si Redis indisponible
 */
export async function checkAnonymousRateLimit(): Promise<RateLimitResult> {
  const ip = await getClientIP();

  // Redis en priorité (distribué, multi-instances)
  const redisResult = await checkRedisRateLimit(`anon:${ip}`, "anonymous");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire (dev ou Redis non configuré)
  const burstResult = checkRateLimitMemory(`burst:${ip}`, CONFIG.burst);
  if (!burstResult.success) {
    return { ...burstResult, retryAfter: burstResult.retryAfter || 10 };
  }
  return checkRateLimitMemory(`anon:${ip}`, CONFIG.anonymous);
}

/**
 * Vérifie le rate limit pour un utilisateur authentifié
 * 
 * TODO: Quand Redis est implémenté, essayer d'abord Redis,
 * puis fallback sur mémoire si Redis indisponible
 */
export async function checkAuthenticatedRateLimit(userId: string): Promise<RateLimitResult> {
  // Redis en priorité
  const redisResult = await checkRedisRateLimit(`auth:${userId}`, "authenticated");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  const burstResult = checkRateLimitMemory(`burst:user:${userId}`, CONFIG.burst);
  if (!burstResult.success) {
    return { ...burstResult, retryAfter: burstResult.retryAfter || 10 };
  }
  return checkRateLimitMemory(`auth:${userId}`, CONFIG.authenticated);
}

/**
 * Vérifie le rate limit pour une action sensible (login, register, etc.)
 * 
 * TODO: Quand Redis est implémenté, essayer d'abord Redis,
 * puis fallback sur mémoire si Redis indisponible
 */
export async function checkSensitiveRateLimit(identifier: string): Promise<RateLimitResult> {
  // Redis en priorité
  const redisResult = await checkRedisRateLimit(`sensitive:${identifier}`, "sensitive");
  if (redisResult !== null) return redisResult;

  // Fallback mémoire
  return checkRateLimitMemory(`sensitive:${identifier}`, CONFIG.sensitive);
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware de rate limiting pour Server Actions
 * 
 * TODO: Quand Redis est implémenté, cette fonction utilisera
 * l'implémentation Redis en priorité, avec fallback mémoire
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
    // TODO: Envoyer alerte vers monitoring (Sentry/Datadog)
    return { allowed: true };
  }
}

// ============================================
// HEADERS
// ============================================

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

// ============================================
// NETTOYAGE PÉRIODIQUE
// ============================================

/**
 * Nettoyage périodique des entrées expirées (toutes les 5 minutes)
 * 
 * NOTE: En environnement serverless, ce nettoyage peut ne pas
 * s'exécuter régulièrement. La migration vers Redis résoudra ce problème.
 */
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    // @ts-expect-error - Map iterator requires downlevelIteration
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[RATE LIMITER] Cleaned ${cleaned} expired entries`);
    }
  }, 5 * 60 * 1000);
}

// ============================================
// MÉTRIQUES (POUR DEBUGGING)
// ============================================

/**
 * Récupère les statistiques du rate limiter
 * Utile pour le debugging et monitoring
 * 
 * TODO: Quand Redis est implémenté, cette fonction retournera
 * les statistiques de Redis
 */
export function getRateLimitStats(): {
  totalEntries: number;
  memoryEstimate: string;
} {
  const totalEntries = rateLimitStore.size;
  // Estimation grossière: ~200 bytes par entrée
  const memoryEstimate = `${(totalEntries * 200 / 1024).toFixed(2)} KB`;
  
  return {
    totalEntries,
    memoryEstimate,
  };
}
