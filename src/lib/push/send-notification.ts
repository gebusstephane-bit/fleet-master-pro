/**
 * Envoi de notifications push via Web Push API (VAPID)
 * Server-side uniquement — ne pas importer côté client.
 */

import webpush from 'web-push';
import { assertVapidConfigured, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapid';
import { removeStaleSubscription, type PushSubscriptionRow } from './subscriptions';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  /** URL à ouvrir au clic */
  url?: string;
  /** 'normal' | 'high' | 'critical' */
  priority?: 'normal' | 'high' | 'critical';
  /** Données libres passées à notificationclick */
  data?: Record<string, unknown>;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  assertVapidConfigured();
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

/**
 * Envoie une notification push à une seule subscription.
 * Retourne false si la subscription est expirée/invalide (410 ou 404).
 */
export async function sendPushToSubscription(
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<boolean> {
  ensureVapid();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth:   subscription.auth,
    },
  };

  const body: Record<string, unknown> = {
    title:    payload.title,
    body:     payload.body,
    icon:     payload.icon   ?? '/icons/icon-192x192.png',
    badge:    payload.badge  ?? '/icons/icon-96x96.png',
    tag:      payload.tag    ?? 'fleetmaster',
    priority: payload.priority ?? 'normal',
    data:     { url: payload.url ?? '/dashboard', ...(payload.data ?? {}) },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(body), {
      TTL: 3600, // 1 heure
    });
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expirée → nettoyage silencieux
      await removeStaleSubscription(subscription.endpoint);
      return false;
    }
    console.error('[Push] sendNotification error:', err);
    return false;
  }
}

/**
 * Envoie une notification à une liste de subscriptions (broadcast).
 * Retourne le nombre d'envois réussis.
 */
export async function broadcastPush(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload
): Promise<number> {
  if (subscriptions.length === 0) return 0;

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload))
  );

  return results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;
}
