/**
 * Service d'envoi d'emails pour les notifications
 * Utilise Resend comme provider d'emails
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  NotificationPayload, 
  NotificationDeliveryResult,
  NotificationType 
} from '../types';

// Initialisation Resend (lazy loading)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Templates d'emails par type
const emailTemplates: Record<NotificationType, (payload: NotificationPayload) => { subject: string; html: string }> = {
  maintenance_due: (payload) => ({
    subject: `🔧 Maintenance prévue: ${payload.title}`,
    html: generateMaintenanceEmail(payload),
  }),
  maintenance_overdue: (payload) => ({
    subject: `⚠️ Maintenance en retard: ${payload.title}`,
    html: generateMaintenanceEmail(payload, true),
  }),
  document_expiring: (payload) => ({
    subject: `📄 Document expirant bientôt: ${payload.title}`,
    html: generateDocumentEmail(payload),
  }),
  document_expired: (payload) => ({
    subject: `❌ Document expiré: ${payload.title}`,
    html: generateDocumentEmail(payload, true),
  }),
  fuel_anomaly: (payload) => ({
    subject: `⛽ Anomalie carburant détectée`,
    html: generateFuelEmail(payload),
  }),
  fuel_low: (payload) => ({
    subject: `🚨 Niveau carburant bas`,
    html: generateFuelEmail(payload),
  }),
  geofencing_enter: (payload) => ({
    subject: `📍 Entrée dans une zone`,
    html: generateGeofencingEmail(payload),
  }),
  geofencing_exit: (payload) => ({
    subject: `📍 Sortie d'une zone`,
    html: generateGeofencingEmail(payload),
  }),
  alert_critical: (payload) => ({
    subject: `🚨 ALERTE CRITIQUE: ${payload.title}`,
    html: generateAlertEmail(payload, 'critical'),
  }),
  alert_warning: (payload) => ({
    subject: `⚠️ Alerte: ${payload.title}`,
    html: generateAlertEmail(payload, 'warning'),
  }),
  alert_info: (payload) => ({
    subject: `ℹ️ Information: ${payload.title}`,
    html: generateAlertEmail(payload, 'info'),
  }),
  system: (payload) => ({
    subject: `FleetMaster: ${payload.title}`,
    html: generateSystemEmail(payload),
  }),
};

// Générateurs de templates
function generateMaintenanceEmail(payload: NotificationPayload, overdue = false): string {
  const urgency = overdue ? 'en retard' : 'prévue';
  const color = overdue ? '#dc2626' : '#f59e0b';
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🔧 Maintenance ${urgency}</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        ${payload.data?.vehicleId ? `
          <p><strong>Véhicule:</strong> ${payload.data.vehicleName || payload.data.vehicleId}</p>
        ` : ''}
        ${payload.data?.dueDate ? `
          <p><strong>Date prévue:</strong> ${payload.data.dueDate}</p>
        ` : ''}
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vehicles/${payload.data?.vehicleId || ''}"
             style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir les détails
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateDocumentEmail(payload: NotificationPayload, expired = false): string {
  const status = expired ? 'expiré' : 'expirant bientôt';
  const color = expired ? '#dc2626' : '#f59e0b';
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">📄 Document ${status}</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        ${payload.data?.documentType ? `
          <p><strong>Type:</strong> ${payload.data.documentType}</p>
        ` : ''}
        ${payload.data?.expiryDate ? `
          <p><strong>Date d'expiration:</strong> ${payload.data.expiryDate}</p>
        ` : ''}
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vehicles/${payload.data?.vehicleId || ''}"
             style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir le document
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateFuelEmail(payload: NotificationPayload): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">⛽ Information carburant</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        ${payload.data?.fuelLevel ? `
          <p><strong>Niveau:</strong> ${payload.data.fuelLevel}%</p>
        ` : ''}
        ${payload.data?.consumption ? `
          <p><strong>Consommation:</strong> ${payload.data.consumption} L/100km</p>
        ` : ''}
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vehicles/${payload.data?.vehicleId || ''}/fuel"
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir les statistiques
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateGeofencingEmail(payload: NotificationPayload): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">📍 Géolocalisation</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        ${payload.data?.zoneName ? `
          <p><strong>Zone:</strong> ${payload.data.zoneName}</p>
        ` : ''}
        ${payload.data?.location ? `
          <p><strong>Position:</strong> ${payload.data.location}</p>
        ` : ''}
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/map?vehicle=${payload.data?.vehicleId || ''}"
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir sur la carte
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateAlertEmail(payload: NotificationPayload, severity: string): string {
  const colors = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  const color = colors[severity as keyof typeof colors];
  const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };
  const icon = icons[severity as keyof typeof icons];
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">${icon} Alerte</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/notifications/${payload.data?.notificationId || ''}"
             style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir l'alerte
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateSystemEmail(payload: NotificationPayload): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #374151; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">FleetMaster</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}"
             style="background: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accéder à l'application
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Récupère l'email de l'utilisateur
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const adminClient = createAdminClient();
    
    // D'abord vérifier dans profiles
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profile?.email) {
      return profile.email;
    }

    // Sinon chercher dans auth.users via admin API
    const { data: user } = await adminClient.auth.admin.getUserById(userId);
    return user.user?.email || null;
  } catch (err) {
    logger.error('Erreur récupération email utilisateur:', { error: (err as Error).message });
    return null;
  }
}

/**
 * Envoie une notification par email
 */
export async function sendEmailNotification(
  payload: NotificationPayload
): Promise<NotificationDeliveryResult> {
  const client = getResendClient();

  if (!client) {
    logger.warn('Resend non configuré, email non envoyé');
    return {
      success: false,
      channel: 'email',
      error: 'Service email non configuré',
    };
  }

  const email = await getUserEmail(payload.userId);
  if (!email) {
    logger.warn('Email utilisateur non trouvé:', { userId: payload.userId });
    return {
      success: false,
      channel: 'email',
      error: 'Email utilisateur non trouvé',
    };
  }

  // Vérifier la limite d'emails (max 10 par 24h par utilisateur)
  const canSend = await checkEmailRateLimit(payload.userId);
  if (!canSend) {
    logger.warn('Limite d\'emails atteinte pour:', { userId: payload.userId });
    return {
      success: false,
      channel: 'email',
      error: 'Limite d\'emails atteinte (10/24h)',
    };
  }

  try {
    const template = emailTemplates[payload.type] || emailTemplates.system;
    const { subject, html } = template(payload);

    const result = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Enregistrer l'envoi
    await recordEmailSent(payload.userId);

    logger.info('Email envoyé avec succès:', {
      userId: payload.userId,
      type: payload.type,
      messageId: result.data?.id,
    });

    return {
      success: true,
      channel: 'email',
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Erreur envoi email:', { error: (err as Error).message });
    return {
      success: false,
      channel: 'email',
      error: (err as Error).message,
    };
  }
}

/**
 * Vérifie la limite d'emails (10 par 24h)
 */
async function checkEmailRateLimit(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await adminClient
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', oneDayAgo);

  return (count || 0) < 10;
}

/**
 * Enregistre l'envoi d'un email
 */
async function recordEmailSent(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient
    .from('email_logs')
    .insert({ user_id: userId });
}
