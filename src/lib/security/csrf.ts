/**
 * Protection CSRF et vérification d'origine
 * 
 * - Vérifie que les requêtes POST/PUT/DELETE viennent bien du site
 * - Protection contre les attaques CSRF cross-origin
 */

import { NextRequest, NextResponse } from 'next/server';

interface CSRFConfig {
  // Origines autorisées (en développement, localhost est automatiquement accepté)
  allowedOrigins: string[];
  // En mode strict, refuse les requêtes sans header Origin/Referer
  strict: boolean;
}

const defaultConfig: CSRFConfig = {
  allowedOrigins: [
    'https://fleetmaster.pro',
    'https://www.fleetmaster.pro',
    // Ajouter les domaines de preview Vercel si nécessaire
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  strict: process.env.NODE_ENV === 'production',
};

/**
 * Extrait l'origine d'une URL
 */
function extractOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Vérifie si l'origine est autorisée
 */
function isAllowedOrigin(origin: string, config: CSRFConfig = defaultConfig): boolean {
  // Toujours autoriser en développement
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Vérifier les origines autorisées
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Autoriser les sous-domaines de fleetmaster.pro
  if (origin.endsWith('.fleetmaster.pro') || origin.endsWith('.vercel.app')) {
    return true;
  }
  
  return false;
}

/**
 * Vérifie la protection CSRF pour une requête
 * @returns true si la requête est valide, false sinon
 */
export function verifyCSRF(
  request: NextRequest,
  config: CSRFConfig = defaultConfig
): { valid: boolean; reason?: string } {
  // Seules les méthodes de modification nécessitent une vérification CSRF
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true };
  }
  
  // Skip pour les webhooks (ils ont leur propre authentification)
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/webhook')) {
    return { valid: true };
  }
  
  // Récupérer l'origine
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Si on a un header Origin, vérifier qu'il est autorisé
  if (origin) {
    if (!isAllowedOrigin(origin, config)) {
      return { 
        valid: false, 
        reason: `Origin non autorisée: ${origin}` 
      };
    }
    return { valid: true };
  }
  
  // Fallback sur Referer si pas d'Origin
  if (referer) {
    const refererOrigin = extractOrigin(referer);
    if (refererOrigin && !isAllowedOrigin(refererOrigin, config)) {
      return { 
        valid: false, 
        reason: `Referer non autorisé: ${refererOrigin}` 
      };
    }
    return { valid: true };
  }
  
  // Pas d'Origin ni de Referer
  if (config.strict) {
    return { 
      valid: false, 
      reason: 'Headers Origin/Referer manquants' 
    };
  }
  
  return { valid: true };
}

/**
 * Réponse standard pour erreur CSRF
 */
export function createCSRFResponse(reason: string): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Forbidden',
      message: 'Requête non autorisée',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Wrapper pour les route handlers qui applique la vérification CSRF
 */
import { type RouteHandler } from './rate-limit';

export function withCSRFProtection(
  handler: RouteHandler,
  config?: CSRFConfig
): RouteHandler {
  return async (request: NextRequest, context) => {
    const csrfCheck = verifyCSRF(request, config);
    
    if (!csrfCheck.valid) {
      console.warn(`🛡️ CSRF Blocked: ${csrfCheck.reason} - ${request.method} ${request.nextUrl.pathname}`);
      return createCSRFResponse(csrfCheck.reason!);
    }
    
    return handler(request, context);
  };
}

/**
 * Vérifie que la requête est une requête Server Action valide
 * Les Server Actions de Next.js ont déjà une protection CSRF intégrée,
 * mais on peut ajouter une vérification supplémentaire si nécessaire
 */
export function isValidServerAction(request: NextRequest): boolean {
  // Next.js ajoute un header spécial aux Server Actions
  const isServerAction = request.headers.get('next-action') !== null;
  
  if (!isServerAction) {
    return false;
  }
  
  // Vérifier l'origine pour les Server Actions aussi
  const origin = request.headers.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    return false;
  }
  
  return true;
}
