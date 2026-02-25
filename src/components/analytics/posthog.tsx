'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCookieConsent } from '@/hooks/use-cookie-consent';

/**
 * Composant de suivi des pages PostHog
 * Ne capture que si le consentement est donné
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasConsented } = useCookieConsent();

  useEffect(() => {
    // Ne tracker que si PostHog est initialisé ET consentement donné
    if (pathname && posthog && hasConsented && posthog.__loaded) {
      let url = pathname;
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams, hasConsented]);

  return null;
}

/**
 * Provider PostHog avec gestion RGPD du consentement
 * N'initialise PostHog que si l'utilisateur a explicitement accepté les cookies
 */
export function PHProvider({ children }: { children: React.ReactNode }) {
  const { hasConsented, isLoaded } = useCookieConsent();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Attendre que le consentement soit chargé depuis localStorage
    if (!isLoaded) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

    if (!key) {
      console.warn('[PostHog] Clé API non configurée');
      return;
    }

    // RGPD: Ne pas initialiser PostHog sans consentement explicite
    // Exception: en développement, on opt_out par défaut
    if (process.env.NODE_ENV === 'development') {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: host,
          capture_pageview: false,
          capture_pageleave: false,
          persistence: 'localStorage',
          loaded(ph) {
            ph.opt_out_capturing();
            setIsInitialized(true);
          },
        });
      }
      return;
    }

    // Production: Initialiser PostHog seulement avec consentement
    if (hasConsented) {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: host,
          capture_pageview: false, // Géré par PostHogPageView
          capture_pageleave: true,
          persistence: 'localStorage',
          loaded(ph) {
            ph.opt_in_capturing();
            setIsInitialized(true);
            console.info('[PostHog] Initialisé avec consentement utilisateur');
          },
        });
      } else if (posthog.has_opted_out_capturing?.()) {
        // Réactiver si l'utilisateur a changé d'avis
        posthog.opt_in_capturing();
        console.info('[PostHog] Capturation réactivée (consentement donné)');
      }
    } else {
      // S'assurer que PostHog est désactivé si pas de consentement
      if (posthog.__loaded && posthog.has_opted_in_capturing?.()) {
        posthog.opt_out_capturing();
        // PostHog ne persiste pas de données si opt_out
        console.info('[PostHog] Opt-out effectué (pas de consentement)');
      }
    }

    // Cleanup: opt-out si le composant est démonté et pas de consentement
    return () => {
      if (!hasConsented && posthog.__loaded && posthog.opt_out_capturing) {
        posthog.opt_out_capturing();
      }
    };
  }, [hasConsented, isLoaded]);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}

/**
 * Hook pour capturer manuellement des événements PostHog
 * Vérifie automatiquement le consentement avant envoi
 */
export function usePostHogCapture() {
  const { hasConsented } = useCookieConsent();

  const capture = (eventName: string, properties?: Record<string, unknown>) => {
    if (hasConsented && posthog.__loaded) {
      posthog.capture(eventName, properties);
    }
  };

  const identify = (userId: string, properties?: Record<string, unknown>) => {
    if (hasConsented && posthog.__loaded) {
      posthog.identify(userId, properties);
    }
  };

  const reset = () => {
    if (posthog.__loaded) {
      posthog.reset();
    }
  };

  return { capture, identify, reset, hasConsented };
}
