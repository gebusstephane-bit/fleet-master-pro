"use client";

/**
 * Tableau des logs d'activité avec responsive
 */

import { useState } from "react";
import { Loader2, History, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ActivityRow, ActivityCard } from "./activity-row";
import { ActivityFiltersBar } from "./activity-filters";
import type {
  ActivityLog,
  ActivityFilters,
} from "@/hooks/use-activity-logs";

interface ActivityTableProps {
  logs: ActivityLog[];
  isLoading: boolean;
  error: Error | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  className?: string;
}

export function ActivityTable({
  logs,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  filters,
  onFiltersChange,
  className,
}: ActivityTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Filtrage côté client pour la recherche textuelle
  const filteredLogs = logs.filter((log) => {
    if (!filters.searchQuery) return true;
    const query = filters.searchQuery.toLowerCase();
    return (
      log.description?.toLowerCase().includes(query) ||
      log.entity_name?.toLowerCase().includes(query) ||
      log.action_type.toLowerCase().includes(query) ||
      log.entity_type?.toLowerCase().includes(query)
    );
  });

  // Loading state
  if (isLoading && logs.length === 0) {
    return <ActivityTableSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "glass-card p-8 text-center",
          className
        )}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-200 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-sm text-slate-500 mb-4">{error.message}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="bg-slate-900/50 border-slate-700"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <ActivityFiltersBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          logs={logs}
        />
        <div className="glass-card p-12 text-center">
          <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-200 mb-2">
            Aucune activité enregistrée
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Les actions effectuées sur votre flotte apparaîtront ici.
            Créez un véhicule, un chauffeur ou une maintenance pour voir
            l&apos;historique s&apos;enrichir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filtres */}
      <ActivityFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        logs={logs}
      />

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-800 bg-slate-900/30">
          <div className="w-8" /> {/* Icon spacer */}
          <div className="w-32 shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Date
          </div>
          <div className="w-40 shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Utilisateur
          </div>
          <div className="w-28 shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Action
          </div>
          <div className="w-32 shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Entité
          </div>
          <div className="flex-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Détails
          </div>
          <div className="w-8" /> {/* Expand spacer */}
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/50">
          {filteredLogs.map((log) => (
            <ActivityRow key={log.id} log={log} />
          ))}
        </div>

        {/* Load more */}
        {hasMore && onLoadMore && (
          <div className="p-4 text-center border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
              className="bg-slate-900/50 border-slate-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                "Charger plus"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredLogs.map((log) => (
          <ActivityCard key={log.id} log={log} />
        ))}

        {hasMore && onLoadMore && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
              className="bg-slate-900/50 border-slate-700 w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                "Charger plus"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <p className="text-xs text-slate-600 text-center">
        {filteredLogs.length} activité{filteredLogs.length > 1 ? "s" : ""}{" "}
        affichée{filteredLogs.length > 1 ? "s" : ""}
        {(filters.searchQuery ||
          filters.actionTypes?.length ||
          filters.entityTypes?.length) &&
          ` (filtrées sur ${logs.length} total)`}
      </p>
    </div>
  );
}

/**
 * Skeleton de chargement
 */
function ActivityTableSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-slate-800/50 rounded-lg animate-pulse" />
        <div className="w-24 h-10 bg-slate-800/50 rounded-lg animate-pulse" />
        <div className="w-24 h-10 bg-slate-800/50 rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="flex gap-4">
            <div className="w-8 h-4 bg-slate-800/50 rounded animate-pulse" />
            <div className="w-32 h-4 bg-slate-800/50 rounded animate-pulse" />
            <div className="w-40 h-4 bg-slate-800/50 rounded animate-pulse" />
            <div className="w-28 h-4 bg-slate-800/50 rounded animate-pulse" />
            <div className="w-32 h-4 bg-slate-800/50 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-slate-800/50 rounded animate-pulse" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-slate-800/50">
            <div className="flex gap-4 items-center">
              <div className="w-8 h-8 bg-slate-800/50 rounded-lg animate-pulse" />
              <div className="w-32 h-4 bg-slate-800/50 rounded animate-pulse" />
              <div className="w-40 h-4 bg-slate-800/50 rounded animate-pulse" />
              <div className="w-28 h-4 bg-slate-800/50 rounded animate-pulse" />
              <div className="w-32 h-4 bg-slate-800/50 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-slate-800/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
