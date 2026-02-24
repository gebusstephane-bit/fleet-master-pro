/**
 * Configuration next-safe-action avec rate limiting
 * Pour des Server Actions typées, sécurisées et protégées contre les abus
 * 
 * SECURITY: Ce fichier implémente:
 * - Rate limiting par IP (10 req/min) et par user (100 req/min)
 * - Validation Zod stricte
 * - Gestion d'erreurs sécurisée (pas de fuites d'info)
 * - Authentification obligatoire sur les actions sensibles
 */

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { rateLimitMiddleware } from '@/lib/security/rate-limiter';

// Client de base avec gestion d'erreurs sécurisée
export const actionClient = createSafeActionClient({
  // Gestion des erreurs globale - ne pas exposer d'informations sensibles
  handleServerError(e) {
    // Logger l'erreur complète côté serveur
    console.error('[SAFE_ACTION_ERROR]', e);
    
    if (e instanceof Error) {
      // Ne pas exposer les détails techniques en production
      if (process.env.NODE_ENV === 'production') {
        return 'Une erreur est survenue. Veuillez réessayer.';
      }
      return e.message;
    }
    
    return 'Erreur serveur inconnue';
  },
});

// Client avec rate limiting pour actions publiques
export const publicActionClient = actionClient.use(async ({ next }) => {
  const rateLimit = await rateLimitMiddleware({});
  
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error);
  }
  
  return next({ ctx: {} });
});

// Client avec authentification et rate limiting
export const authActionClient = actionClient.use(async ({ next }) => {
  // Importer ici pour éviter les cycles
  const { getUserWithCompany } = await import('@/lib/supabase/server');
  
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }
  
  // Rate limiting par user ID
  const rateLimit = await rateLimitMiddleware({ userId: userData.id });
  
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error);
  }
  
  // Si pas de company_id, on autorise quand même (onboarding en cours)
  // Les actions individuelles vérifieront si company_id est requis
  return next({ ctx: { user: userData } });
});

// Client pour actions sensibles (login, register, password reset)
export const sensitiveActionClient = actionClient.use(async ({ next }) => {
  // Rate limiting plus strict
  const rateLimit = await rateLimitMiddleware({ isSensitive: true });
  
  if (!rateLimit.allowed) {
    throw new Error('Trop de tentatives. Veuillez réessayer dans une minute.');
  }
  
  return next({ ctx: {} });
});

// Schémas de base réutilisables
export const idSchema = z.object({
  id: z.string().uuid({ message: 'ID invalide' }),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Types exportés
export type ActionContext = {
  user: {
    id: string;
    email: string;
    role: string;
    company_id: string | null;
    companies?: {
      id: string;
      name: string;
      logo_url?: string | null;
    } | null;
  };
};
