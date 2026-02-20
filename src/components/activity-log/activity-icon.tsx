"use client";

/**
 * Icône d'activité selon le type d'entité et d'action
 */

import {
  Car,
  User,
  Wrench,
  Clipboard,
  Route,
  Server,
  Settings,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  UserCheck,
  Play,
  LogIn,
  LogOut,
  FlaskConical,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActionConfig,
  getEntityConfig,
} from "@/lib/activity/formatters";

interface ActivityIconProps {
  actionType: string;
  entityType?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Car,
  User,
  Wrench,
  Clipboard,
  Route,
  Server,
  Settings,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  UserCheck,
  Play,
  LogIn,
  LogOut,
  FlaskConical,
  HelpCircle,
};

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function ActivityIcon({
  actionType,
  entityType,
  size = "md",
  className,
}: ActivityIconProps) {
  const actionConfig = getActionConfig(actionType);
  // @ts-ignore
  const entityConfig = getEntityConfig(entityType);

  // Utiliser l'icône d'action par défaut, ou celle de l'entité si pas d'action spécifique
  const iconName = actionConfig.icon;
  const IconComponent = iconMap[iconName] || HelpCircle;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg",
        actionConfig.bg,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={cn(actionConfig.text, iconSizeClasses[size])} />
    </div>
  );
}

/**
 * Badge d'action coloré
 */
interface ActivityActionBadgeProps {
  actionType: string;
  className?: string;
}

export function ActivityActionBadge({
  actionType,
  className,
}: ActivityActionBadgeProps) {
  const config = getActionConfig(actionType);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * Icône d'entité avec label
 */
interface EntityIconProps {
  entityType: string | null;
  showLabel?: boolean;
  className?: string;
}

export function EntityIcon({
  entityType,
  showLabel = false,
  className,
}: EntityIconProps) {
  const config = getEntityConfig(entityType);
  // @ts-ignore
  const IconComponent = iconMap[config.icon] || HelpCircle;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* @ts-ignore */}
      <IconComponent className={cn("w-4 h-4", config.color)} />
      {showLabel && (
        <span className="text-sm text-slate-400">{config.label}</span>
      )}
    </div>
  );
}
