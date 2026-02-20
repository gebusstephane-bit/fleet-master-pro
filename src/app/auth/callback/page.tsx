/**
 * Callback Auth - Gestion des redirects post-authentification
 * 
 * SECURITY: Open Redirect protection implémentée
 * - Whitelist des URLs de redirection autorisées
 * - Rejet des URLs externes non approuvées
 * - Fallback sécurisé vers /dashboard
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// CONFIGURATION - Whitelist des URLs autorisées
// ============================================

/**
 * Liste des chemins de redirection autorisés (paths seulement, pas de domaines externes)
 * Ces chemins doivent commencer par /
 */
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/vehicles',
  '/drivers',
  '/routes',
  '/maintenance',
  '/sos',
  '/inspection',
  '/settings',
  '/settings/profile',
  '/settings/company',
  '/settings/notifications',
  '/settings/security',
  '/settings/billing',
  '/fuel',
  '/agenda',
  '/alerts',
  '/notifications',
  '/superadmin',
  '/help',
  '/onboarding',
] as const;

/**
 * Patterns de chemis autorisés (regex)
 */
const ALLOWED_REDIRECT_PATTERNS = [
  /^\/vehicles\/[a-zA-Z0-9-]+$/, // /vehicles/:id
  /^\/drivers\/[a-zA-Z0-9-]+$/, // /drivers/:id
  /^\/routes\/[a-zA-Z0-9-]+$/, // /routes/:id
  /^\/maintenance\/[a-zA-Z0-9-]+$/, // /maintenance/:id
  /^\/inspections\/[a-zA-Z0-9-]+$/, // /inspections/:id
  /^\/settings\/users\/[a-zA-Z0-9-]+$/, // /settings/users/:id
  /^\/settings\/users\/[a-zA-Z0-9-]+\/edit$/, // /settings/users/:id/edit
] as const;

// URL de fallback en cas de redirect non autorisé
const FALLBACK_REDIRECT = '/dashboard';

// ============================================
// FONCTIONS DE VALIDATION
// ============================================

/**
 * Valide et sanitize l'URL de redirection
 * @param redirect - L'URL de redirection demandée
 * @returns L'URL validée ou le fallback sécurisé
 */
function validateRedirectUrl(redirect: string | null): string {
  // Si pas de redirect ou vide, utiliser le fallback
  if (!redirect || typeof redirect !== 'string') {
    return FALLBACK_REDIRECT;
  }

  // Nettoyer l'URL (trim et suppression des espaces)
  const cleanRedirect = redirect.trim();

  // Rejeter les URLs vides après nettoyage
  if (!cleanRedirect) {
    return FALLBACK_REDIRECT;
  }

  // Rejeter les URLs absolues (contenant :// ou commençant par //)
  // Cela bloque les attaques open redirect vers des sites externes
  if (cleanRedirect.includes('://') || cleanRedirect.startsWith('//')) {
    console.warn('[Auth Callback] Blocked absolute URL redirect:', cleanRedirect);
    return FALLBACK_REDIRECT;
  }

  // Vérifier que l'URL commence par /
  if (!cleanRedirect.startsWith('/')) {
    console.warn('[Auth Callback] Blocked relative URL without leading slash:', cleanRedirect);
    return FALLBACK_REDIRECT;
  }

  // Vérifier les chemins exacts autorisés
  if (ALLOWED_REDIRECT_PATHS.includes(cleanRedirect as typeof ALLOWED_REDIRECT_PATHS[number])) {
    return cleanRedirect;
  }

  // Vérifier les patterns autorisés
  for (const pattern of ALLOWED_REDIRECT_PATTERNS) {
    if (pattern.test(cleanRedirect)) {
      return cleanRedirect;
    }
  }

  // URL non autorisée, logger et retourner fallback
  console.warn('[Auth Callback] Blocked unauthorized redirect path:', cleanRedirect);
  return FALLBACK_REDIRECT;
}

// ============================================
// COMPOSANT
// ============================================

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Récupérer le paramètre redirect
      const rawRedirect = searchParams.get('redirect');
      
      // Valider l'URL de redirection
      const redirect = validateRedirectUrl(rawRedirect);
      
      // Logger pour debugging (en développement)
      if (process.env.NODE_ENV === 'development' && rawRedirect !== redirect) {
        console.log('[Auth Callback] Redirect sanitized:', { original: rawRedirect, sanitized: redirect });
      }

      // Si l'URL a été modifiée pour sécurité, notifier l'utilisateur
      if (rawRedirect && rawRedirect !== redirect && rawRedirect !== FALLBACK_REDIRECT) {
        toast.error('Redirection non sécurisée bloquée');
      }

      // Effectuer la redirection
      router.push(redirect);
      router.refresh();
    } catch (err) {
      console.error('[Auth Callback] Error during redirect:', err);
      setError('Une erreur est survenue lors de la redirection');
      
      // Fallback en cas d'erreur
      setTimeout(() => {
        router.push(FALLBACK_REDIRECT);
      }, 2000);
    }
  }, [router, searchParams]);

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Erreur de redirection</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            Redirection vers le dashboard dans quelques secondes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-slate-400">Redirection en cours...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-slate-400">Chargement...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
