/**
 * Barrel exports pour le système de notification
 */

export * from './types';
export { 
  sendNotification, 
  sendNotificationToMultiple, 
  sendNotificationToCompany 
} from './delivery-service';
