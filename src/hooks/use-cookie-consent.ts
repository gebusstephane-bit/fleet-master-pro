/**
 * Hook de gestion du consentement cookies RGPD
 * Stockage dans localStorage avec typage strict
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export type CookieConsent = 'accepted' | 'refused' | null;

const STORAGE_KEY = 'cookie-consent';

/**
 * Hook pour gérer le consentement cookies
 * @returns L'état du consentement et les fonctions pour le modifier
 */
export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger le consentement depuis localStorage au montage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'refused') {
        setConsentState(stored);
      }
    } catch (e) {
      // localStorage non disponible (navigation privée, etc.)
      console.warn('[CookieConsent] Impossible de lire localStorage');
    }
    setIsLoaded(true);
  }, []);

  // Accepter les cookies
  const acceptCookies = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      setConsentState('accepted');
    } catch (e) {
      console.warn('[CookieConsent] Impossible de sauvegarder le consentement');
    }
  }, []);

  // Refuser les cookies
  const refuseCookies = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, 'refused');
      setConsentState('refused');
    } catch (e) {
      console.warn('[CookieConsent] Impossible de sauvegarder le refus');
    }
  }, []);

  // Réinitialiser le consentement (pour tests)
  const resetConsent = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      setConsentState(null);
    } catch (e) {
      console.warn('[CookieConsent] Impossible de réinitialiser');
    }
  }, []);

  return {
    consent,
    isLoaded,
    hasConsented: consent === 'accepted',
    hasRefused: consent === 'refused',
    hasMadeChoice: consent !== null,
    needsBanner: consent === null,
    acceptCookies,
    refuseCookies,
    resetConsent,
  };
}

/**
 * Vérifier si le consentement est donné (pour utilisation hors React)
 * @returns true si l'utilisateur a accepté les cookies
 */
export function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  } catch (e) {
    return false;
  }
}
