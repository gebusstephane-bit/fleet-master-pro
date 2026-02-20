/**
 * Formatters pour les Activity Logs
 * Fonctions pures utilisables côté client et serveur
 */

import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export type ActionType =
  | "VEHICLE_CREATED"
  | "VEHICLE_UPDATED"
  | "VEHICLE_DELETED"
  | "DRIVER_CREATED"
  | "DRIVER_UPDATED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_DELETED"
  | "MAINTENANCE_CREATED"
  | "MAINTENANCE_COMPLETED"
  | "MAINTENANCE_UPDATED"
  | "INSPECTION_CREATED"
  | "INSPECTION_COMPLETED"
  | "ROUTE_CREATED"
  | "ROUTE_STARTED"
  | "ROUTE_COMPLETED"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_UPDATED"
  | "TEST"
  | "SYSTEM"
  | "OTHER";

export type EntityType =
  | "vehicle"
  | "driver"
  | "maintenance"
  | "inspection"
  | "route"
  | "system"
  | "settings"
  | "user";

export interface ActionConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: string;
}

/**
 * Configuration des badges selon le type d'action
 */
export const actionTypeConfig: Record<string, ActionConfig> = {
  // Créations - Vert
  VEHICLE_CREATED: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    label: "Création",
    icon: "Plus",
  },
  DRIVER_CREATED: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    label: "Création",
    icon: "Plus",
  },
  MAINTENANCE_CREATED: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    label: "Création",
    icon: "Plus",
  },
  INSPECTION_CREATED: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    label: "Création",
    icon: "Plus",
  },
  ROUTE_CREATED: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    label: "Création",
    icon: "Plus",
  },

  // Modifications - Bleu
  VEHICLE_UPDATED: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    label: "Modification",
    icon: "Edit",
  },
  DRIVER_UPDATED: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    label: "Modification",
    icon: "Edit",
  },
  MAINTENANCE_UPDATED: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    label: "Modification",
    icon: "Edit",
  },
  SETTINGS_UPDATED: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    label: "Modification",
    icon: "Edit",
  },

  // Suppressions - Rouge
  VEHICLE_DELETED: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    label: "Suppression",
    icon: "Trash",
  },
  DRIVER_DELETED: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    label: "Suppression",
    icon: "Trash",
  },

  // Achèvements - Cyan
  MAINTENANCE_COMPLETED: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    label: "Terminé",
    icon: "CheckCircle",
  },
  INSPECTION_COMPLETED: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    label: "Terminé",
    icon: "CheckCircle",
  },
  ROUTE_COMPLETED: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    label: "Terminé",
    icon: "CheckCircle",
  },

  // Assignations - Violet
  DRIVER_ASSIGNED: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
    label: "Assignation",
    icon: "UserCheck",
  },
  ROUTE_STARTED: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
    label: "Démarré",
    icon: "Play",
  },

  // Auth - Gris/Orange
  LOGIN: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    label: "Connexion",
    icon: "LogIn",
  },
  LOGOUT: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    label: "Déconnexion",
    icon: "LogOut",
  },

  // Système - Orange
  TEST: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    label: "Test",
    icon: "FlaskConical",
  },
  SYSTEM: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    label: "Système",
    icon: "Settings",
  },
  OTHER: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    label: "Autre",
    icon: "HelpCircle",
  },
};

/**
 * Configuration des icônes selon le type d'entité
 */
export const entityTypeConfig: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  vehicle: { icon: "Car", label: "Véhicule", color: "text-cyan-500" },
  driver: { icon: "User", label: "Chauffeur", color: "text-violet-500" },
  maintenance: {
    icon: "Wrench",
    label: "Maintenance",
    color: "text-orange-500",
  },
  inspection: { icon: "Clipboard", label: "Inspection", color: "text-green-500" },
  route: { icon: "Route", label: "Trajet", color: "text-blue-500" },
  system: { icon: "Server", label: "Système", color: "text-slate-400" },
  settings: { icon: "Settings", label: "Paramètres", color: "text-slate-400" },
  user: { icon: "User", label: "Utilisateur", color: "text-slate-400" },
};

/**
 * Formatte une date en format "Il y a X" ou date complète
 */
export function formatActivityDate(dateString: string): {
  relative: string;
  full: string;
  tooltip: string;
} {
  const date = new Date(dateString);
  const now = new Date();

  // Moins de 24h : format relatif
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let relative: string;
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    relative = diffMinutes < 1 ? "À l'instant" : `Il y a ${diffMinutes} min`;
  } else if (diffHours < 24) {
    relative = formatDistanceToNow(date, { locale: fr, addSuffix: true });
  } else if (isToday(date)) {
    relative = `Aujourd'hui à ${format(date, "HH:mm", { locale: fr })}`;
  } else if (isYesterday(date)) {
    relative = `Hier à ${format(date, "HH:mm", { locale: fr })}`;
  } else if (diffHours < 168) {
    // Moins d'une semaine
    relative = formatDistanceToNow(date, { locale: fr, addSuffix: true });
  } else {
    relative = format(date, "dd MMM yyyy", { locale: fr });
  }

  return {
    relative,
    full: format(date, "dd MMMM yyyy 'à' HH:mm", { locale: fr }),
    tooltip: format(date, "dd/MM/yyyy HH:mm:ss", { locale: fr }),
  };
}

/**
 * Récupère la configuration d'une action
 */
export function getActionConfig(actionType: string): ActionConfig {
  return (
    actionTypeConfig[actionType] || {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/20",
      label: actionType.replace(/_/g, " "),
      icon: "HelpCircle",
    }
  );
}

/**
 * Récupère la configuration d'une entité
 */
export function getEntityConfig(entityType: string | null) {
  if (!entityType) return entityTypeConfig.system;
  return (
    entityTypeConfig[entityType] || {
      icon: "HelpCircle",
      label: entityType,
      color: "text-slate-400",
    }
  );
}

/**
 * Groupe les actions par catégorie pour les filtres
 */
export const actionCategories = {
  creation: ["VEHICLE_CREATED", "DRIVER_CREATED", "MAINTENANCE_CREATED", "INSPECTION_CREATED", "ROUTE_CREATED"],
  modification: ["VEHICLE_UPDATED", "DRIVER_UPDATED", "MAINTENANCE_UPDATED", "SETTINGS_UPDATED"],
  suppression: ["VEHICLE_DELETED", "DRIVER_DELETED"],
  completion: ["MAINTENANCE_COMPLETED", "INSPECTION_COMPLETED", "ROUTE_COMPLETED"],
  auth: ["LOGIN", "LOGOUT"],
  system: ["TEST", "SYSTEM", "OTHER"],
};
