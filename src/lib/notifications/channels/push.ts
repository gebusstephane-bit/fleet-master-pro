/**
 * Service d'envoi de notifications push
 * Utilise Firebase Cloud Messaging (FCM)
 */

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  NotificationPayload, 
  NotificationDeliveryResult 
} from '../types';

/**
 * Récupère les tokens FCM d'un utilisateur
 */
async function getFcmTokens(userId: string): Promise<string[]> {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      logger.error('Erreur récupération tokens FCM:', { error: error.message });
      return [];
    }

    return data?.map((t) => t.token) || [];
  } catch (err) {
    logger.error('Exception récupération tokens FCM:', { error: (err as Error).message });
    return [];
  }
}

/**
 * Envoie une notification push via FCM
 * Note: Nécessite l'initialisation Firebase Admin
 */
export async function sendPushNotification(
  payload: NotificationPayload
): Promise<NotificationDeliveryResult> {
  // Vérifier si FCM est configuré
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    logger.debug('FCM non configuré, push ignoré');
    return {
      success: false,
      channel: 'push',
      error: 'FCM non configuré',
    };
  }

  const tokens = await getFcmTokens(payload.userId);
  
  if (tokens.length === 0) {
    logger.debug('Aucun token FCM pour l\'utilisateur:', { userId: payload.userId });
    return {
      success: false,
      channel: 'push',
      error: 'Aucun appareil enregistré',
    };
  }

  try {
    // Lazy loading de Firebase Admin
    const { getMessaging } = await import('firebase-admin/messaging');
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');

    // Initialiser Firebase Admin si pas déjà fait
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    const messaging = getMessaging();

    // Préparer le message
    const message = {
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: {
        type: payload.type,
        priority: payload.priority,
        ...Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
      tokens,
    };

    // Envoyer
    const response = await messaging.sendEachForMulticast(message);

    // Nettoyer les tokens invalides
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await removeInvalidTokens(payload.userId, invalidTokens);
      }
    }

    logger.info('Push notification envoyée:', {
      userId: payload.userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      success: response.successCount > 0,
      channel: 'push',
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Erreur envoi push notification:', { error: (err as Error).message });
    return {
      success: false,
      channel: 'push',
      error: (err as Error).message,
    };
  }
}

/**
 * Supprime les tokens FCM invalides
 */
async function removeInvalidTokens(userId: string, tokens: string[]): Promise<void> {
  try {
    const adminClient = createAdminClient();
    await adminClient
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .in('token', tokens);

    logger.debug('Tokens FCM invalides supprimés:', { count: tokens.length });
  } catch (err) {
    logger.error('Erreur suppression tokens invalides:', { error: (err as Error).message });
  }
}

/**
 * Enregistre un nouveau token FCM pour un utilisateur
 */
export async function registerPushToken(
  userId: string, 
  token: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    
    const { error } = await adminClient
      .from('push_tokens')
      .upsert(
        { user_id: userId, token },
        { onConflict: 'token' }
      );

    if (error) {
      logger.error('Erreur enregistrement token FCM:', { error: error.message });
      return false;
    }

    logger.info('Token FCM enregistré:', { userId });
    return true;
  } catch (err) {
    logger.error('Exception enregistrement token FCM:', { error: (err as Error).message });
    return false;
  }
}

/**
 * Supprime un token FCM (déconnexion/désinscription)
 */
export async function unregisterPushToken(
  userId: string, 
  token: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    
    const { error } = await adminClient
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      logger.error('Erreur suppression token FCM:', { error: error.message });
      return false;
    }

    logger.info('Token FCM supprimé:', { userId });
    return true;
  } catch (err) {
    logger.error('Exception suppression token FCM:', { error: (err as Error).message });
    return false;
  }
}
