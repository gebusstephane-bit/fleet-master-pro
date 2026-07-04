/**
 * Map statique des icônes de notifications.
 * Perf : remplace `import * as Icons from 'lucide-react'` (qui embarquait
 * TOUTE la bibliothèque d'icônes dans le bundle, ~150 kB) par les seules
 * icônes réellement référencées dans notificationTypeConfig.
 */

import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  FileText,
  FileX,
  Fuel,
  Info,
  MapPin,
  MapPinOff,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const notificationIcons: Record<string, LucideIcon> = {
  AlertOctagon,
  AlertTriangle,
  Bell,
  FileText,
  FileX,
  Fuel,
  Info,
  MapPin,
  MapPinOff,
  Wrench,
};

/** Retourne l'icône par nom (fallback : Bell). */
export function getNotificationIcon(name?: string): LucideIcon {
  return (name && notificationIcons[name]) || Bell;
}
