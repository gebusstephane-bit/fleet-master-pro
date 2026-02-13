/**
 * Service de livraison des notifications
 * Orchestre l'envoi via différents canaux selon les préférences utilisateur
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  NotificationPayload,
  NotificationChannel,
  NotificationType,
  UserNotificationPreferences,
  NotificationDeliveryResult,
} from './types';
import { sendEmailNotification } from './channels/email';
import { sendPushNotification } from './channels/push';

// Configuration des canaux par défaut pour chaque type
const defaultChannelsByType: Record<NotificationType, NotificationChannel[]> = {
  maintenance_due: ['in_app', 'email'],
  maintenance_overdue: ['in_app', 'email', 'push'],
  document_expiring: ['in_app', 'email'],
  document_expired: ['in_app', 'email', 'push'],
  fuel_anomaly: ['in_app', 'email'],
  fuel_low: ['in_app', 'push'],
  geofencing_enter: ['in_app'],
  geofencing_exit: ['in_app', 'push'],
  alert_critical: ['in_app', 'email', 'push'],
  alert_warning: ['in_app', 'email'],
  alert_info: ['in_app'],
  system: ['in_app', 'email'],
};

/**
 * Vérifie si un canal est activé pour un type de notification donné
 */
function isChannelEnabled(
  preferences: UserNotificationPreferences | null,
  type: NotificationType,
  channel: NotificationChannel
): boolean {
  if (!preferences) return true; // Par défaut si pas de préférences

  // Vérifier le canal global
  const channelEnabled = preferences[`${channel}Enabled`];
  if (!channelEnabled) return false;

  // Vérifier le type spécifique
  const typeKey = `${type}_${channel}`;
  const typeEnabled = preferences[typeKey];
  
  return typeEnabled !== false; // Par défaut true
}

/**
 * Détermine les canaux à utiliser selon les préférences et le payload
 */
async function determineChannels(
  payload: NotificationPayload,
  userId: string
): Promise<NotificationChannel[]> {
  // Si les canaux sont explicitement spécifiés dans le payload
  if (payload.channels && payload.channels.length > 0) {
    return payload.channels;
  }

  // Récupérer les préférences de l'utilisateur
  const adminClient = createAdminClient();
  const { data: prefs } = await adminClient
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const channels: NotificationChannel[] = [];
  const defaultChannels = defaultChannelsByType[payload.type] || ['in_app'];

  for (const channel of defaultChannels) {
    if (isChannelEnabled(prefs, payload.type, channel)) {
      channels.push(channel);
    }
  }

  return channels.length > 0 ? channels : ['in_app']; // Au minimum in-app
}

/**
 * Sauvegarde une notification dans la base de données (in-app)
 */
async function saveNotification(
  payload: NotificationPayload,
  channels: NotificationChannel[]
): Promise<string | null> {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('notifications')
      .insert({
        user_id: payload.userId,
        company_id: payload.companyId,
        type: payload.type,
        priority: payload.priority,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        channels: channels,
        read_at: null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Erreur sauvegarde notification:', { error: error.message });
      return null;
    }

    return data.id;
  } catch (err) {
    logger.error('Exception sauvegarde notification:', { error: (err as Error).message });
    return null;
  }
}

/**
 * Envoie une notification via tous les canaux appropriés
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationDeliveryResult[]> {
  const results: NotificationDeliveryResult[] = [];

  logger.info('Envoi notification:', {
    userId: payload.userId,
    type: payload.type,
    priority: payload.priority,
  });

  // Déterminer les canaux à utiliser
  const channels = await determineChannels(payload, payload.userId);

  // Sauvegarder en base pour in-app
  if (channels.includes('in_app')) {
    const saved = await saveNotification(payload, channels);
    results.push({
      success: !!saved,
      channel: 'in_app',
      sentAt: saved ? new Date().toISOString() : undefined,
    });
  }

  // Envoyer email si demandé
  if (channels.includes('email')) {
    const emailResult = await sendEmailNotification(payload);
    results.push(emailResult);
  }

  // Envoyer push si demandé
  if (channels.includes('push')) {
    const pushResult = await sendPushNotification(payload);
    results.push(pushResult);
  }

  // Logger les résultats
  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    logger.warn('Certains canaux ont échoué:', {
      failed: failed.map((f) => f.channel),
    });
  }

  return results;
}

/**
 * Envoie une notification à plusieurs utilisateurs
 */
export async function sendNotificationToMultiple(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<Map<string, NotificationDeliveryResult[]>> {
  const results = new Map<string, NotificationDeliveryResult[]>();

  for (const userId of userIds) {
    const userResults = await sendNotification({ ...payload, userId });
    results.set(userId, userResults);
  }

  return results;
}

/**
 * Envoie une notification à tous les utilisateurs d'une entreprise
 */
export async function sendNotificationToCompany(
  companyId: string,
  payload: Omit<NotificationPayload, 'userId' | 'companyId'>
): Promise<Map<string, NotificationDeliveryResult[]>> {
  const adminClient = createAdminClient();

  // Récupérer tous les utilisateurs actifs de l'entreprise
  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (error || !users) {
    logger.error('Erreur récupération utilisateurs entreprise:', { error: error?.message });
    return new Map();
  }

  const results = new Map<string, NotificationDeliveryResult[]>();

  for (const user of users) {
    const userResults = await sendNotification({
      ...payload,
      userId: user.id,
      companyId,
    });
    results.set(user.id, userResults);
  }

  return results;
}
