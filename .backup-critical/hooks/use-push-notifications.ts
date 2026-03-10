'use client';

/**
 * Hook React pour gérer l'abonnement aux Push Notifications Web.
 *
 * Usage :
 *   const { permission, isSubscribed, subscribe, unsubscribe, isLoading } = usePushNotifications();
 */

import { useState, useEffect, useCallback } from 'react';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  /** État courant de la permission navigateur */
  permission: Permission;
  /** L'utilisateur est actuellement abonné aux push sur ce device */
  isSubscribed: boolean;
  /** Opération en cours (subscribe / unsubscribe) */
  isLoading: boolean;
  /** Message d'erreur de la dernière opération */
  error: string | null;
  /** Demande la permission et enregistre la subscription */
  subscribe: () => Promise<void>;
  /** Supprime la subscription côté navigateur et serveur */
  unsubscribe: () => Promise<void>;
  /** true si le navigateur supporte les push notifications */
  isSupported: boolean;
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<Permission>('default');
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Initialisation : lire l'état courant du navigateur
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as Permission);

    // Vérifier si une subscription active existe déjà
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(sub !== null))
      .catch(() => setIsSubscribed(false));
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Demander la permission
      const result = await Notification.requestPermission();
      setPermission(result as Permission);

      if (result !== 'granted') {
        setError('Permission refusée. Activez les notifications dans les paramètres du navigateur.');
        return;
      }

      // 2. Attendre le SW
      const reg = await navigator.serviceWorker.ready;

      // 3. Créer la PushSubscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('Configuration VAPID manquante.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        // @ts-ignore
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey) as any,
      });

      // 4. Envoyer au serveur
      const subJson = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: subJson.endpoint,
          keys:     subJson.keys,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur ${res.status}`);
      }

      setIsSubscribed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'activation des notifications';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (!sub) {
        setIsSubscribed(false);
        return;
      }

      // 1. Informer le serveur
      await fetch('/api/push/unsubscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      });

      // 2. Désabonner côté navigateur
      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la désactivation';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { permission, isSubscribed, isLoading, error, subscribe, unsubscribe, isSupported };
}
