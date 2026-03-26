/**
 * Système de notifications basé sur les rôles
 * Fleet-Master
 */

import { USER_ROLE } from '@/constants/enums';
import { createClient } from '@/lib/supabase/server';

interface NotificationRecipient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface NotificationData {
  type: 'maintenance' | 'inspection' | 'route' | 'document' | 'fuel' | 'system';
  title: string;
  message: string;
  link?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Récupère les destinataires de notifications selon les critères
 */
export async function getNotificationRecipients({
  companyId,
  roles = [],
  specificUsers = [],
  excludeUsers = [],
  requireEmailEnabled = true,
}: {
  companyId: string;
  roles?: string[];
  specificUsers?: string[];
  excludeUsers?: string[];
  requireEmailEnabled?: boolean;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('company_id', companyId)
    .eq('is_active', true);
  
  if (roles.length > 0) {
    // @ts-ignore - roles type mismatch
    query = query.in('role', roles);
  }
  
  if (specificUsers.length > 0) {
    query = query.in('id', specificUsers);
  }
  
  if (excludeUsers.length > 0) {
    query = query.not('id', 'in', `(${excludeUsers.join(',')})`);
  }
  
  if (requireEmailEnabled) {
    query = query.eq('email_notifications', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching notification recipients:', error);
    return [];
  }
  
  return data as NotificationRecipient[];
}

/**
 * Envoie une notification à un utilisateur spécifique
 */
export async function notifyUser(
  userId: string,
  data: NotificationData
) {
  const supabase = await createClient();
  
  // Créer l'entrée dans la table notifications
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      priority: data.priority,
      read: false,
    });
  
  if (error) {
    console.error('Error creating notification:', error);
  }
  
  // TODO: Envoyer email si activé dans les préférences
  // await sendEmailNotification(userId, data);
}

/**
 * Notifie les administrateurs et directeurs d'une nouvelle demande de maintenance
 */
export async function notifyMaintenanceRequest(
  companyId: string,
  maintenanceData: {
    id: string;
    vehicleId: string;
    vehicleRegistration: string;
    type: string;
    description: string;
    priority: string;
    requestedBy: string;
  }
) {
  const recipients = await getNotificationRecipients({
    companyId,
    roles: [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR] as const,
  });
  
  const notification: NotificationData = {
    type: 'maintenance',
    title: '🔧 Nouvelle demande d\'intervention',
    message: `${maintenanceData.vehicleRegistration} - ${maintenanceData.type}: ${maintenanceData.description}`,
    link: `/maintenance/${maintenanceData.id}`,
    priority: maintenanceData.priority === 'CRITIQUE' ? 'critical' : 'high',
  };
  
  for (const recipient of recipients) {
    await notifyUser(recipient.id, notification);
  }
  
  return recipients.length;
}

/**
 * Notifie qu'une maintenance a été validée
 */
export async function notifyMaintenanceValidated(
  companyId: string,
  maintenanceData: {
    id: string;
    vehicleRegistration: string;
    validatedBy: string;
    requesterId: string;
  }
) {
  // Notifier le demandeur
  await notifyUser(maintenanceData.requesterId, {
    type: 'maintenance',
    title: '✅ Maintenance validée',
    message: `La demande pour ${maintenanceData.vehicleRegistration} a été validée`,
    link: `/maintenance/${maintenanceData.id}`,
    priority: 'normal',
  });
}

/**
 * Notifie de la fin d'une inspection
 */
export async function notifyInspectionCompleted(
  companyId: string,
  inspectionData: {
    id: string;
    vehicleId: string;
    vehicleRegistration: string;
    score: number;
    status: string;
    defectsCount: number;
    driverId: string;
  }
) {
  // Déterminer les destinataires selon le statut
  let roles: string[] = [];
  let priority: NotificationData['priority'] = 'normal';
  
  if (inspectionData.status === 'CRITICAL_ISSUES') {
    roles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
    priority = 'critical';
  } else if (inspectionData.status === 'ISSUES_FOUND') {
    roles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
    priority = 'high';
  } else {
    roles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR];
    priority = 'normal';
  }
  
  const recipients = await getNotificationRecipients({
    companyId,
    roles,
  });
  
  const notification: NotificationData = {
    type: 'inspection',
    title: inspectionData.defectsCount > 0 
      ? `⚠️ Inspection terminée avec ${inspectionData.defectsCount} anomalies`
      : `✅ Inspection terminée - ${inspectionData.score}%`,
    message: `${inspectionData.vehicleRegistration} - Note: ${inspectionData.score}%`,
    link: `/inspections/${inspectionData.id}`,
    priority,
  };
  
  for (const recipient of recipients) {
    await notifyUser(recipient.id, notification);
  }
  
  return recipients.length;
}

/**
 * Notifie d'une assignation de tournée
 */
export async function notifyRouteAssigned(
  driverId: string,
  routeData: {
    id: string;
    name: string;
    date: string;
    vehicleRegistration: string;
  }
) {
  await notifyUser(driverId, {
    type: 'route',
    title: '🚛 Nouvelle tournée assignée',
    message: `${routeData.name} - ${routeData.vehicleRegistration} le ${new Date(routeData.date).toLocaleDateString('fr-FR')}`,
    link: `/routes/${routeData.id}`,
    priority: 'normal',
  });
}

/**
 * Notifie de documents expirants
 */
export async function notifyDocumentsExpiring(
  companyId: string,
  documents: Array<{
    type: string;
    vehicleRegistration?: string;
    expiryDate: string;
  }>
) {
  const recipients = await getNotificationRecipients({
    companyId,
    roles: [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC],
  });
  
  for (const doc of documents) {
    const notification: NotificationData = {
      type: 'document',
      title: '📄 Document expirant bientôt',
      message: `${doc.type}${doc.vehicleRegistration ? ` - ${doc.vehicleRegistration}` : ''} expire le ${new Date(doc.expiryDate).toLocaleDateString('fr-FR')}`,
      link: '/alerts',
      priority: 'high',
    };
    
    for (const recipient of recipients) {
      await notifyUser(recipient.id, notification);
    }
  }
  
  return recipients.length;
}

/**
 * Notifie d'un problème critique système
 */
export async function notifySystemAlert(
  companyId: string,
  alertData: {
    title: string;
    message: string;
    link?: string;
  }
) {
  const recipients = await getNotificationRecipients({
    companyId,
    roles: [USER_ROLE.ADMIN],
  });
  
  const notification: NotificationData = {
    type: 'system',
    title: `🚨 ${alertData.title}`,
    message: alertData.message,
    link: alertData.link,
    priority: 'critical',
  };
  
  for (const recipient of recipients) {
    await notifyUser(recipient.id, notification);
  }
  
  return recipients.length;
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export async function getUnreadNotifications(userId: string, limit = 10) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  
  return data;
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
  
  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  
  return true;
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);
  
  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
  
  return true;
}
