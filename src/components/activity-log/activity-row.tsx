"use client";

/**
 * Ligne de tableau pour un log d'activité
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ActivityLog } from "@/hooks/use-activity-logs";
import { formatActivityDate } from "@/lib/activity/formatters";
import {
  ActivityIcon,
  ActivityActionBadge,
  EntityIcon,
} from "./activity-icon";

interface ActivityRowProps {
  log: ActivityLog;
  className?: string;
}

export function ActivityRow({ log, className }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false);
  const dateInfo = formatActivityDate(log.created_at);

  const userName = log.user
    ? `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim()
    : "Système";

  const userInitials = log.user
    ? `${(log.user.first_name || "")[0] || ""}${
        (log.user.last_name || "")[0] || ""
      }`.toUpperCase() || "?"
    : "SY";

  return (
    <div
      className={cn(
        "group border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 transition-colors",
        className
      )}
    >
      {/* Row principale */}
      <div className="flex items-center gap-4 p-4">
        {/* Icône action */}
        <ActivityIcon
          actionType={log.action_type}
          entityType={log.entity_type}
          size="sm"
        />

        {/* Date */}
        <div className="w-32 shrink-0">
          <p
            className="text-sm text-slate-300"
            title={dateInfo.tooltip}
          >
            {dateInfo.relative}
          </p>
          <p className="text-xs text-slate-500">{dateInfo.full}</p>
        </div>

        {/* Utilisateur */}
        <div className="w-40 shrink-0 flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={log.user?.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-300 truncate">{userName}</span>
        </div>

        {/* Action */}
        <div className="w-28 shrink-0">
          <ActivityActionBadge actionType={log.action_type} />
        </div>

        {/* Entité */}
        <div className="w-32 shrink-0">
          <EntityIcon entityType={log.entity_type} showLabel />
        </div>

        {/* Description / Nom entité */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 truncate">
            {log.entity_name || log.description || "-"}
          </p>
          {log.description && log.entity_name && (
            <p className="text-xs text-slate-500 truncate">{log.description}</p>
          )}
        </div>

        {/* Expand button */}
        {(log.metadata || log.ip_address) && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        )}
      </div>

      {/* Détails expandables */}
      {expanded && (log.metadata || log.ip_address) && (
        <div className="px-4 pb-4 pl-16">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-slate-500 mb-1">Métadonnées</p>
                <pre className="text-xs text-slate-400 bg-slate-950 p-2 rounded overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
            {log.ip_address && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>IP: {log.ip_address}</span>
                {log.user_agent && (
                  <span className="truncate">{log.user_agent}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Version mobile (card)
 */
export function ActivityCard({ log, className }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false);
  const dateInfo = formatActivityDate(log.created_at);

  const userName = log.user
    ? `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim()
    : "Système";

  const userInitials = log.user
    ? `${(log.user.first_name || "")[0] || ""}${
        (log.user.last_name || "")[0] || ""
      }`.toUpperCase() || "?"
    : "SY";

  return (
    <div
      className={cn(
        "bg-slate-900/50 border border-slate-800 rounded-lg p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <ActivityIcon
          actionType={log.action_type}
          entityType={log.entity_type}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ActivityActionBadge actionType={log.action_type} />
            <EntityIcon entityType={log.entity_type} />
          </div>
          <p
            className="text-xs text-slate-500 mt-1"
            title={dateInfo.tooltip}
          >
            {dateInfo.relative}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {log.entity_name && (
          <p className="text-sm text-slate-200 font-medium">{log.entity_name}</p>
        )}
        {log.description && (
          <p className="text-sm text-slate-400">{log.description}</p>
        )}

        {/* User */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <Avatar className="w-5 h-5">
            <AvatarImage src={log.user?.avatar_url || ""} />
            <AvatarFallback className="text-[10px] bg-slate-700 text-slate-300">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-slate-500">{userName}</span>
        </div>
      </div>

      {/* Expand details */}
      {(log.metadata || log.ip_address) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-xs text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-1"
          >
            {expanded ? "Masquer détails" : "Voir détails"}
          </button>

          {expanded && (
            <div className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800">
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="text-xs text-slate-400 overflow-x-auto mb-2">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
              {log.ip_address && (
                <p className="text-xs text-slate-500">IP: {log.ip_address}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
