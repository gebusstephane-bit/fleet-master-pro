/**
 * Rate Limiting pour FleetMaster Pro
 * 
 * Implémentation en mémoire adaptée pour Vercel (sans Redis)
 * - Utilise une Map avec fenêtre glissante
 * - Nettoyage automatique des entrées expirées
 * - Limites configurables par route
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Stockage en mémoire (attention: sur Vercel, les fonctions sont stateless,
// donc ce stockage est réinitialisé à chaque cold start. C'est acceptable
// pour une protection de base contre les abus ponctuels)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Génère une clé unique pour le rate limiting
 * Combine l'IP et l'identifiant de route (si fourni)
 */
function getKey(identifier: string, route?: string): string {
  return route ? `${identifier}:${route}` : identifier;
}

/**
 * Extrait l'IP réelle du client (supporte les proxies/Vercel)
 */
export function getClientIP(request: NextRequest): string {
  // Vercel-specific headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback: utiliser un identifiant basé sur le user-agent + IP (approximatif)
  return 'unknown';
}

/**
 * Vérifie si la requête est dans les limites
 * @returns Object avec success (boolean) et remaining (nombre de requêtes restantes)
 */
export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig,
  route?: string
): { success: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries();
  
  const key = getKey(identifier, route);
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Si pas d'entrée ou expirée, créer nouvelle entrée
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { 
      success: true, 
      remaining: config.requests - 1,
      resetAt: now + config.windowMs 
    };
  }
  
  // Incrémenter le compteur
  entry.count++;
  
  if (entry.count > config.requests) {
    return { 
      success: false, 
      remaining: 0,
      resetAt: entry.resetAt 
    };
  }
  
  return { 
    success: true, 
    remaining: config.requests - entry.count,
    resetAt: entry.resetAt 
  };
}

/**
 * Réponse standard pour rate limit dépassé
 */
export function createRateLimitResponse(
  message: string, 
  resetAt: number
): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  
  return new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': '',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}

// ============================================
// CONFIGURATIONS PRÉDÉFINIES
// ============================================

export const RateLimits = {
  // API générale: 100 requêtes par minute
  general: {
    requests: 100,
    windowMs: 60 * 1000,
  },
  
  // Stripe checkout: 5 requêtes par heure (création de compte)
  checkout: {
    requests: 5,
    windowMs: 60 * 60 * 1000,
  },
  
  // Webhook Stripe: 50 requêtes par minute (batch possible)
  webhook: {
    requests: 50,
    windowMs: 60 * 1000,
  },
  
  // SOS smart-search: 30 requêtes par minute (utilisateur authentifié)
  sosAuthenticated: {
    requests: 30,
    windowMs: 60 * 1000,
  },
  
  // SOS smart-search: 10 requêtes par minute (anonyme)
  sosAnonymous: {
    requests: 10,
    windowMs: 60 * 1000,
  },
  
  // Auth: 10 tentatives par minute (login, register)
  auth: {
    requests: 10,
    windowMs: 60 * 1000,
  },
  
  // API sensible (admin, etc): 20 requêtes par minute
  sensitive: {
    requests: 20,
    windowMs: 60 * 1000,
  },
} as const;

// ============================================
// MIDDLEWARE HELPER
// ============================================

/**
 * Applique le rate limiting dans le middleware
 * @returns NextResponse | null (null = pas de blocage)
 */
export function applyMiddlewareRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): NextResponse | null {
  const ip = identifier || getClientIP(request);
  const result = checkRateLimit(ip, config);
  
  if (!result.success) {
    return createRateLimitResponse(
      'Trop de requêtes. Veuillez réessayer plus tard.',
      result.resetAt
    );
  }
  
  return null;
}

// ============================================
// ROUTE HANDLER WRAPPER
// ============================================

export interface RouteHandler {
  (request: NextRequest, context?: { params: Record<string, string> }): Promise<NextResponse> | NextResponse;
}

/**
 * Wrapper pour protéger une route API avec rate limiting
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig,
  options?: {
    getIdentifier?: (request: NextRequest) => string;
    skipSuccessfulRequests?: boolean;
  }
): RouteHandler {
  return async (request: NextRequest, context) => {
    const identifier = options?.getIdentifier?.(request) || getClientIP(request);
    const result = checkRateLimit(identifier, config);
    
    if (!result.success) {
      return createRateLimitResponse(
        'Trop de requêtes. Veuillez réessayer plus tard.',
        result.resetAt
      );
    }
    
    const response = await handler(request, context);
    
    // Ajouter les headers de rate limit à la réponse
    if (response.headers) {
      response.headers.set('X-RateLimit-Limit', String(config.requests));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    }
    
    return response;
  };
}

/**
 * Wrapper spécifique pour les routes authentifiées
 * Utilise l'ID utilisateur comme identifiant (plus précis que l'IP)
 */
export function withAuthenticatedRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig,
  getUserId: (request: NextRequest) => string | null
): RouteHandler {
  return async (request: NextRequest, context) => {
    const userId = getUserId(request);
    const identifier = userId || getClientIP(request);
    
    const result = checkRateLimit(identifier, config);
    
    if (!result.success) {
      return createRateLimitResponse(
        'Trop de requêtes. Veuillez réessayer plus tard.',
        result.resetAt
      );
    }
    
    const response = await handler(request, context);
    
    if (response.headers) {
      response.headers.set('X-RateLimit-Limit', String(config.requests));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    }
    
    return response;
  };
}
