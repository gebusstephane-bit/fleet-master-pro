/**
 * Types stricts pour le système de notification
 * Remplace les `any` par des types explicites
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

// Interface principale Notification
export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: NotificationData;
  channels: NotificationChannel[];
  read_at: string | null;
  created_at: string;
  updated_at?: string;
}

// Données contextuelles selon le type
export interface NotificationData {
  // Maintenance
  maintenanceId?: string;
  vehicleId?: string;
  vehicleName?: string;
  serviceType?: string;
  dueDate?: string;
  daysUntil?: number;
  
  // Documents
  documentId?: string;
  documentType?: string;
  expiryDate?: string;
  
  // Carburant
  fuelLevel?: number;
  consumption?: number;
  
  // Geofencing
  zoneId?: string;
  zoneName?: string;
  location?: GeoLocation;
  
  // Alertes génériques
  alertId?: string;
  severity?: NotificationPriority;
  
  // Générique
  [key: string]: unknown;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Configuration d'affichage par type
export interface NotificationTypeConfig {
  icon: string;
  label: string;
  description: string;
  defaultChannels: NotificationChannel[];
}

export const notificationTypeConfig: Record<NotificationType, NotificationTypeConfig> = {
  maintenance_due: {
    icon: 'Wrench',
    label: 'Maintenance prévue',
    description: 'Rappel de maintenance à effectuer',
    defaultChannels: ['in_app', 'email'],
  },
  maintenance_overdue: {
    icon: 'AlertTriangle',
    label: 'Maintenance en retard',
    description: 'Maintenance dépassée',
    defaultChannels: ['in_app', 'email', 'push'],
  },
  document_expiring: {
    icon: 'FileText',
    label: 'Document expirant',
    description: 'Document proche de expiration',
    defaultChannels: ['in_app', 'email'],
  },
  document_expired: {
    icon: 'FileX',
    label: 'Document expiré',
    description: 'Document expiré',
    defaultChannels: ['in_app', 'email', 'push'],
  },
  fuel_anomaly: {
    icon: 'Fuel',
    label: 'Anomalie carburant',
    description: 'Consommation anormale détectée',
    defaultChannels: ['in_app', 'email'],
  },
  fuel_low: {
    icon: 'Fuel',
    label: 'Niveau carburant bas',
    description: 'Alerte niveau carburant critique',
    defaultChannels: ['in_app', 'push'],
  },
  geofencing_enter: {
    icon: 'MapPin',
    label: 'Entrée zone',
    description: 'Véhicule entré dans une zone',
    defaultChannels: ['in_app'],
  },
  geofencing_exit: {
    icon: 'MapPinOff',
    label: 'Sortie zone',
    description: 'Véhicule sorti d\'une zone',
    defaultChannels: ['in_app', 'push'],
  },
  alert_critical: {
    icon: 'AlertOctagon',
    label: 'Alerte critique',
    description: 'Problème nécessitant attention immédiate',
    defaultChannels: ['in_app', 'email', 'push'],
  },
  alert_warning: {
    icon: 'AlertTriangle',
    label: 'Alerte avertissement',
    description: 'Problème mineur',
    defaultChannels: ['in_app', 'email'],
  },
  alert_info: {
    icon: 'Info',
    label: 'Information',
    description: 'Notification informative',
    defaultChannels: ['in_app'],
  },
  system: {
    icon: 'Bell',
    label: 'Système',
    description: 'Notification système',
    defaultChannels: ['in_app', 'email'],
  },
};

// Couleurs par priorité
export const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

// Interface Préférences
export interface NotificationPreferences {
  user_id: string;
  
  // Canaux globaux
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  
  // Maintenance
  maintenance_due_email: boolean;
  maintenance_due_push: boolean;
  maintenance_due_in_app: boolean;
  
  // Documents
  document_expiring_email: boolean;
  document_expiring_push: boolean;
  document_expiring_in_app: boolean;
  
  // Carburant
  fuel_anomaly_email: boolean;
  fuel_anomaly_push: boolean;
  fuel_anomaly_in_app: boolean;
  
  // Geofencing
  geofencing_email: boolean;
  geofencing_push: boolean;
  geofencing_in_app: boolean;
  
  // Alertes
  alert_critical_email: boolean;
  alert_critical_push: boolean;
  alert_critical_in_app: boolean;
  alert_warning_email: boolean;
  alert_warning_push: boolean;
  alert_warning_in_app: boolean;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Payload pour création notification
export interface CreateNotificationPayload {
  userId: string;
  companyId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: NotificationData;
  channels?: NotificationChannel[];
}

// Résultat de livraison
export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
  sentAt?: string;
}
