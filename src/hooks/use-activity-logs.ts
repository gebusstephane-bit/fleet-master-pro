"use client";

/**
 * Hook React Query pour les Activity Logs
 * 100% isolé - pas d'interférence avec le cache existant
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
// @ts-ignore
import type { ActionType, EntityType } from "@/lib/activity/formatters";

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ActivityFilters {
  // @ts-ignore
  actionTypes?: ActionType[];
  // @ts-ignore
  entityTypes?: EntityType[];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  searchQuery?: string;
}

const ACTIVITY_LOGS_STALE_TIME = 30 * 1000; // 30 secondes
const ACTIVITY_LOGS_PAGE_SIZE = 20;

/**
 * Clés de requête isolées pour les activity logs
 */
export const activityLogsKeys = {
  all: ["activity-logs"] as const,
  lists: (companyId: string, filters?: ActivityFilters) =>
    [...activityLogsKeys.all, "list", companyId, filters] as const,
  detail: (id: string) => [...activityLogsKeys.all, "detail", id] as const,
};

/**
 * Hook principal pour récupérer les logs d'activité
 * @param companyId - ID de l'entreprise (obligatoire)
 * @param filters - Filtres optionnels
 */
export function useActivityLogs(
  companyId: string | undefined,
  filters?: ActivityFilters
) {
  return useQuery({
    queryKey: activityLogsKeys.lists(companyId || "", filters),
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID requis");

      const supabase = createClient();

      let query = supabase
        .from("activity_logs")
        .select(
          `
          *,
          user:user_id(
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_LOGS_PAGE_SIZE);

      // Appliquer les filtres
      if (filters?.actionTypes && filters.actionTypes.length > 0) {
        query = query.in("action_type", filters.actionTypes);
      }

      if (filters?.entityTypes && filters.entityTypes.length > 0) {
        query = query.in("entity_type", filters.entityTypes);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        // Ajouter 23:59:59 à la date de fin
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[ActivityLogs] Erreur fetch:", error);
        throw error;
      }

      // @ts-ignore
      return (data || []) as ActivityLog[];
    },
    enabled: !!companyId,
    staleTime: ACTIVITY_LOGS_STALE_TIME,
    retry: 1,
  });
}

/**
 * Hook pour récupérer un log spécifique
 */
export function useActivityLog(id: string | undefined) {
  return useQuery({
    queryKey: activityLogsKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("ID requis");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          user:user_id(
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      // @ts-ignore
      return data as ActivityLog;
    },
    enabled: !!id,
    staleTime: ACTIVITY_LOGS_STALE_TIME,
  });
}
