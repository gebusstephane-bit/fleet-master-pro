/**
 * Types pour le système de notification
 * Définit les structures pour les canaux de notification
 */

export type NotificationType =
  | 'maintenance_due'
  | 'maintenance_overdue'
  | 'document_expiring'
  | 'document_expired'
  | 'fuel_anomaly'
  | 'fuel_low'
  | 'geofencing_enter'
  | 'geofencing_exit'
  | 'alert_critical'
  | 'alert_warning'
  | 'alert_info'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export interface NotificationPayload {
  userId: string;
  companyId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  // Par type
  [key: string]: boolean | string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
  sentAt?: string;
}
