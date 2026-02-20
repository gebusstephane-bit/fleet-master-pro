"use client";

/**
 * Barre de filtres pour les logs d'activité
 */

import { useState } from "react";
import { X, Filter, Search, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ActivityFilters, ActivityLog } from "@/hooks/use-activity-logs";
import {
  actionCategories,
  entityTypeConfig,
  getActionConfig,
} from "@/lib/activity/formatters";

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  logs: ActivityLog[];
  className?: string;
}

const actionTypesList = Object.entries(actionCategories).flatMap(
  ([category, types]) =>
    types.map((type) => ({
      value: type,
      category,
      config: getActionConfig(type),
    }))
);

const entityTypesList = Object.entries(entityTypeConfig).map(
  ([type, config]) => ({
    value: type,
    ...config,
  })
);

export function ActivityFiltersBar({
  filters,
  onFiltersChange,
  logs,
  className,
}: ActivityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "");

  const hasActiveFilters =
    (filters.actionTypes?.length || 0) > 0 ||
    (filters.entityTypes?.length || 0) > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.searchQuery;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, searchQuery: searchQuery || undefined });
  };

  const clearFilters = () => {
    setSearchQuery("");
    onFiltersChange({});
  };

  const toggleActionType = (type: string) => {
    const current = filters.actionTypes || [];
    const updated = current.includes(type as any)
      ? current.filter((t) => t !== type)
      : [...current, type as any];
    onFiltersChange({ ...filters, actionTypes: updated });
  };

  const toggleEntityType = (type: string) => {
    const current = filters.entityTypes || [];
    const updated = current.includes(type as any)
      ? current.filter((t) => t !== type)
      : [...current, type as any];
    onFiltersChange({ ...filters, entityTypes: updated });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barre principale */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </form>

        {/* Filtre Action Types */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800",
                filters.actionTypes?.length && "border-cyan-500/50 text-cyan-400"
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              Actions
              {filters.actionTypes?.length ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                  {filters.actionTypes.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 bg-slate-900 border-slate-700">
            <div className="p-3 border-b border-slate-800">
              <p className="text-sm font-medium text-slate-200">Types d&apos;actions</p>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {actionTypesList.map(({ value, category, config }) => (
                <button
                  key={value}
                  onClick={() => toggleActionType(value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                    filters.actionTypes?.includes(value as any)
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      config.bg.replace("/10", "")
                    )}
                  />
                  <span className="flex-1">{config.label}</span>
                  <span className="text-xs text-slate-600 capitalize">
                    {category}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtre Entity Types */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800",
                filters.entityTypes?.length && "border-cyan-500/50 text-cyan-400"
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              Entités
              {filters.entityTypes?.length ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                  {filters.entityTypes.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0 bg-slate-900 border-slate-700">
            <div className="p-3 border-b border-slate-800">
              <p className="text-sm font-medium text-slate-200">Types d&apos;entités</p>
            </div>
            <div className="p-2 space-y-1">
              {entityTypesList.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => toggleEntityType(value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                    filters.entityTypes?.includes(value as any)
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", color)} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtre Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800",
                (filters.dateFrom || filters.dateTo) &&
                  "border-cyan-500/50 text-cyan-400"
              )}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
            <div className="p-3 space-y-3">
              <div>
                <p className="text-sm text-slate-400 mb-2">Du</p>
                <CalendarComponent
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateFrom: date })
                  }
                  locale={fr}
                  className="border-0"
                />
              </div>
              <div className="border-t border-slate-800 pt-3">
                <p className="text-sm text-slate-400 mb-2">Au</p>
                <CalendarComponent
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateTo: date })
                  }
                  locale={fr}
                  className="border-0"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Tags des filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.actionTypes?.map((type) => {
            const config = getActionConfig(type);
            return (
              <span
                key={type}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border",
                  config.bg,
                  config.text,
                  config.border
                )}
              >
                {config.label}
                <button
                  onClick={() => toggleActionType(type)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {filters.entityTypes?.map((type) => {
            const config = entityTypeConfig[type];
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700"
              >
                {config?.label || type}
                <button
                  onClick={() => toggleEntityType(type)}
                  className="hover:text-slate-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {filters.dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
              Du {format(filters.dateFrom, "dd/MM/yyyy", { locale: fr })}
              <button
                onClick={() => onFiltersChange({ ...filters, dateFrom: undefined })}
                className="hover:text-slate-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
              Au {format(filters.dateTo, "dd/MM/yyyy", { locale: fr })}
              <button
                onClick={() => onFiltersChange({ ...filters, dateTo: undefined })}
                className="hover:text-slate-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
