/**
 * CRUD pour la table push_subscriptions
 * Toutes les opérations passent par le client admin (bypass RLS pour les envois server-side)
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Enregistre ou met à jour une subscription push pour un utilisateur
 */
export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionPayload,
  userAgent?: string
): Promise<PushSubscriptionRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id:    userId,
        endpoint:   subscription.endpoint,
        p256dh:     subscription.keys.p256dh,
        auth:       subscription.keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: 'user_id,endpoint' }
    )
    .select()
    .single();

  if (error) throw new Error(`[Push] upsert failed: ${error.message}`);
  return data as PushSubscriptionRow;
}

/**
 * Supprime une subscription push par endpoint
 */
export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw new Error(`[Push] delete failed: ${error.message}`);
}

/**
 * Récupère toutes les subscriptions d'un utilisateur
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscriptionRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`[Push] fetch failed: ${error.message}`);
  return (data ?? []) as PushSubscriptionRow[];
}

/**
 * Récupère toutes les subscriptions d'une company (pour broadcast aux admins)
 */
export async function getCompanyAdminSubscriptions(
  companyId: string
): Promise<PushSubscriptionRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('*, profiles!inner(company_id, role)')
    .eq('profiles.company_id', companyId)
    .in('profiles.role', ['ADMIN', 'DIRECTEUR']);

  if (error) throw new Error(`[Push] company fetch failed: ${error.message}`);
  return (data ?? []) as PushSubscriptionRow[];
}

/**
 * Supprime une subscription invalide (410 Gone du push service)
 */
export async function removeStaleSubscription(endpoint: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
