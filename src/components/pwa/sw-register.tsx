'use client';

import { useEffect } from 'react';

/**
 * Enregistre le Service Worker FleetMaster.
 * Composant invisible — placé une seule fois dans le root layout.
 * Ne s'active qu'en production (évite les conflits avec le HMR Next.js).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    // En développement : désenregistrer tout SW existant pour éviter les conflits de cache
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then(() => {
            console.log('[SW] Désenregistré en mode dev');
          });
        });
      });
      // Vider le cache du navigateur aussi
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            if (cacheName.startsWith('fleetmaster-')) {
              caches.delete(cacheName);
              console.log('[SW] Cache vidé:', cacheName);
            }
          });
        });
      }
      return;
    }

    // En production : enregistrer le SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW] Enregistré, scope:', registration.scope);

        // Vérifie les mises à jour toutes les heures
        setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch((err) => {
        console.warn('[SW] Échec de l\'enregistrement:', err);
      });
  }, []);

  return null;
}
