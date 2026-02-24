'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';

// ============================================================
// Types
// ============================================================

export type UrgencyLevel =
  | 'surveillance'
  | 'controle_recommande'
  | 'controle_urgent'
  | 'intervention_immediate';

export type ComponentConcerned =
  | 'Pneumatiques'
  | 'Freinage'
  | 'Moteur'
  | 'Carrosserie'
  | 'Éclairage'
  | 'Général';

export type ControlResult = 'anomaly_confirmed' | 'no_anomaly' | 'false_alarm';

export type AlertStatus = 'active' | 'control_done' | 'false_positive' | 'expired' | 'cancelled';

export interface PredictiveAlert {
  id: string;
  company_id: string;
  vehicle_id: string;
  calculated_at: string;
  current_score: number;
  previous_score: number;
  degradation_speed: number;
  days_until_critical: number;
  predicted_control_date: string;
  urgency_score: number;
  urgency_level: UrgencyLevel;
  component_concerned: ComponentConcerned;
  reasoning: string;
  status: AlertStatus;
  controlled_at: string | null;
  controlled_by: string | null;
  control_result: ControlResult | null;
  anomaly_details: string | null;
  new_score_after_control: number | null;
  linked_inspection_id: string | null;
  generated_maintenance_id: string | null;
  false_positive_count: number;
  created_at: string;
  updated_at: string;
  // Jointure
  vehicle?: {
    registration_number: string;
    brand: string;
    model: string;
    year: number;
  } | null;
}

export interface SubmitControlPayload {
  alertId: string;
  newScore: number;
  controlResult: ControlResult;
  anomalyDetails?: string;
  maintenanceNeeded: boolean;
}

export interface SubmitControlResult {
  success: boolean;
  maintenance_created: boolean;
  maintenance_id: string | null;
  error?: string;
}

// ============================================================
// Helpers UI (réutilisables dans les composants)
// ============================================================

export const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; color: string; badgeClass: string; borderClass: string }
> = {
  intervention_immediate: {
    label: 'Intervention immédiate',
    color: 'text-red-400',
    badgeClass: 'bg-red-950/40 text-red-400 border-red-700/50',
    borderClass: 'border-l-red-500',
  },
  controle_urgent: {
    label: 'Contrôle urgent',
    color: 'text-orange-400',
    badgeClass: 'bg-orange-950/40 text-orange-400 border-orange-700/50',
    borderClass: 'border-l-orange-500',
  },
  controle_recommande: {
    label: 'Contrôle recommandé',
    color: 'text-amber-400',
    badgeClass: 'bg-amber-950/40 text-amber-400 border-amber-700/50',
    borderClass: 'border-l-amber-500',
  },
  surveillance: {
    label: 'Surveillance',
    color: 'text-blue-400',
    badgeClass: 'bg-blue-950/40 text-blue-400 border-blue-700/50',
    borderClass: 'border-l-blue-500',
  },
};

export const URGENCY_ORDER: UrgencyLevel[] = [
  'intervention_immediate',
  'controle_urgent',
  'controle_recommande',
  'surveillance',
];

// ============================================================
// Hooks
// ============================================================

/**
 * Récupère les alertes prédictives actives de la company courante,
 * triées par niveau d'urgence (les plus critiques en premier).
 */
export function usePredictiveAlerts() {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['predictive-alerts', companyId],
    queryFn: async (): Promise<PredictiveAlert[]> => {
      if (!companyId) return [];

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('predictive_alerts' as any)
        .select(`
          *,
          vehicle:vehicles(registration_number, brand, model, year)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('urgency_score', { ascending: false })
        .order('days_until_critical', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PredictiveAlert[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Rafraîchissement toutes les 10 min
  });
}

/**
 * Statistiques rapides pour le dashboard :
 * - Nombre total d'alertes actives
 * - Décompte par niveau d'urgence
 */
export function usePredictiveAlertsStats() {
  const { data: alerts, isLoading } = usePredictiveAlerts();

  const stats = {
    total: alerts?.length ?? 0,
    intervention_immediate: alerts?.filter((a) => a.urgency_level === 'intervention_immediate').length ?? 0,
    controle_urgent: alerts?.filter((a) => a.urgency_level === 'controle_urgent').length ?? 0,
    controle_recommande: alerts?.filter((a) => a.urgency_level === 'controle_recommande').length ?? 0,
    surveillance: alerts?.filter((a) => a.urgency_level === 'surveillance').length ?? 0,
  };

  return { stats, isLoading };
}

/**
 * Soumet le résultat d'un contrôle ciblé via la fonction SQL sécurisée.
 * Crée automatiquement une fiche maintenance si anomalie + maintenance demandée.
 * Ajuste la sensibilité du véhicule si faux positif (apprentissage).
 */
export function useSubmitControl() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();

  return useMutation({
    mutationFn: async (payload: SubmitControlPayload): Promise<SubmitControlResult> => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase.rpc as any)('submit_control_result', {
        p_alert_id: payload.alertId,
        p_new_score: payload.newScore,
        p_control_result: payload.controlResult,
        p_anomaly_details: payload.anomalyDetails ?? null,
        p_maintenance_needed: payload.maintenanceNeeded,
      });

      if (error) throw new Error(error.message);

      const result = data as SubmitControlResult;
      if (!result.success) throw new Error(result.error ?? 'Erreur inconnue');
      return result;
    },
    onSuccess: () => {
      // Invalider le cache pour forcer le rechargement des alertes
      queryClient.invalidateQueries({ queryKey: ['predictive-alerts', user?.company_id] });
    },
  });
}

/**
 * Marque une alerte comme urgente (DIRECTEUR / ADMIN uniquement).
 * Passe le niveau à 'controle_urgent' si ce n'est pas déjà 'intervention_immediate'.
 */
export function useMarkAlertUrgent() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('predictive_alerts' as any)
        .update({
          urgency_level: 'controle_urgent',
          urgency_score: 0.8,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .neq('urgency_level', 'intervention_immediate'); // Ne pas rétrograder les critiques

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-alerts', user?.company_id] });
    },
  });
}

/**
 * Annule/supprime une alerte (ADMIN uniquement).
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('predictive_alerts' as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-alerts', user?.company_id] });
    },
  });
}
