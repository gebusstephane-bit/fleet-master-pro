/**
 * Hooks React Query pour les prédictions IA FleetMaster AI Predict
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';

// Types
export interface AIPrediction {
  id: string;
  vehicle_id: string;
  failure_probability: number;
  predicted_failure_type: string;
  confidence_score: number;
  prediction_horizon_days: number;
  features_used: Record<string, number | string>;
  recommended_action: string;
  estimated_roi: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  actual_failure_occurred: boolean | null;
  feedback_provided_at: string | null;
  model_version: string;
  created_at: string;
}

export interface PredictionFeedback {
  predictionId: string;
  actualFailureOccurred: boolean;
  notes?: string;
}

export interface SimplePrediction {
  vehicle_id: string;
  failure_probability: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_failure_type: string;
}

// Query keys
export const aiPredictionKeys = {
  all: ['ai-predictions'] as const,
  vehicle: (vehicleId: string) => [...aiPredictionKeys.all, 'vehicle', vehicleId] as const,
  latest: (vehicleId: string) => [...aiPredictionKeys.vehicle(vehicleId), 'latest'] as const,
  list: () => [...aiPredictionKeys.all, 'list'] as const,
  allVehicles: () => [...aiPredictionKeys.all, 'all-vehicles'] as const,
};

/**
 * Hook pour récupérer la dernière prédiction d'un véhicule
 */
export function useVehiclePrediction(vehicleId: string) {
  return useQuery<AIPrediction | null, Error>({
    queryKey: aiPredictionKeys.latest(vehicleId),
    queryFn: async () => {
      const response = await fetch(`/api/predict/maintenance/detail?vehicleId=${vehicleId}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Erreur lors de la récupération de la prédiction');
      }
      
      const data = await response.json();
      return data.prediction as AIPrediction;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!vehicleId,
  });
}

/**
 * Hook pour récupérer toutes les prédictions (pour la liste véhicules)
 */
export function useAllPredictions() {
  return useQuery<Record<string, SimplePrediction>, Error>({
    queryKey: aiPredictionKeys.allVehicles(),
    queryFn: async () => {
      const response = await fetch('/api/predict/vehicles');
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des prédictions');
      }
      
      const data = await response.json();
      return data.predictions as Record<string, SimplePrediction>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook pour récupérer toutes les prédictions d'un véhicule
 */
export function useVehiclePredictionHistory(vehicleId: string) {
  return useQuery<AIPrediction[], Error>({
    queryKey: aiPredictionKeys.vehicle(vehicleId),
    queryFn: async () => {
      const response = await fetch(`/api/predict/maintenance/${vehicleId}/history`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'historique');
      }
      
      const data = await response.json();
      return data.predictions as AIPrediction[];
    },
    enabled: !!vehicleId,
  });
}

/**
 * Hook pour soumettre du feedback sur une prédiction
 */
export function usePredictionFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: PredictionFeedback) => {
      const response = await fetch(`/api/predict/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du feedback');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalider les queries concernées
      queryClient.invalidateQueries({ queryKey: aiPredictionKeys.all });
      logger.info('Feedback soumis avec succès', { predictionId: variables.predictionId });
    },
    onError: (error) => {
      logger.error('Erreur feedback prédiction:', { error: (error as Error).message });
    },
  });
}

/**
 * Hook pour déclencher une nouvelle prédiction
 */
export function useGeneratePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await fetch(`/api/predict/maintenance/${vehicleId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la prédiction');
      }

      return response.json();
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: aiPredictionKeys.vehicle(vehicleId) });
      logger.info('Prédiction générée avec succès', { vehicleId });
    },
  });
}

/**
 * Utilitaire: Déterminer la couleur selon le niveau de risque
 */
export function getRiskColor(probability: number): string {
  if (probability >= 0.7) return 'text-red-600 bg-red-50';
  if (probability >= 0.5) return 'text-orange-600 bg-orange-50';
  if (probability >= 0.3) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

export function getRiskBadgeVariant(probability: number): 'destructive' | 'default' | 'secondary' | 'outline' {
  if (probability >= 0.7) return 'destructive';
  if (probability >= 0.5) return 'default';
  if (probability >= 0.3) return 'secondary';
  return 'outline';
}

export function getUrgencyLabel(level: string): string {
  const labels: Record<string, string> = {
    critical: 'Critique',
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
  };
  return labels[level] || level;
}

// ============================================================
// NOUVEAU SYSTÈME — predictive_alerts (basé sur inspections réelles)
// Remplace useVehiclePrediction qui lisait ai_predictions (source externe opaque)
// ============================================================

export type PredictiveUrgencyLevel =
  | 'surveillance'
  | 'controle_recommande'
  | 'controle_urgent'
  | 'intervention_immediate';

export interface VehiclePredictiveAlert {
  id: string;
  vehicle_id: string;
  company_id: string;
  calculated_at: string;
  current_score: number;
  previous_score: number;
  degradation_speed: number;       // Points perdus par jour
  days_until_critical: number;
  predicted_control_date: string;  // Date ISO YYYY-MM-DD
  urgency_score: number;           // 0.0 → 1.0
  urgency_level: PredictiveUrgencyLevel;
  component_concerned: string;     // 'Pneumatiques', 'Freinage', 'Général', etc.
  reasoning: string;               // Explication lisible
  status: 'active' | 'control_done' | 'false_positive' | 'expired' | 'cancelled';
  control_result: 'anomaly_confirmed' | 'no_anomaly' | 'false_alarm' | null;
  controlled_at: string | null;
  controlled_by: string | null;
}

/** Config visuelles par niveau d'urgence (compatible dark theme) */
export const PREDICTIVE_URGENCY_CONFIG: Record<
  PredictiveUrgencyLevel,
  { label: string; textClass: string; borderClass: string; badgeClass: string; progressClass: string }
> = {
  intervention_immediate: {
    label: 'Intervention immédiate',
    textClass: 'text-red-400',
    borderClass: 'border-red-700/60',
    badgeClass: 'bg-red-950/40 text-red-400 border-red-700/50',
    progressClass: 'bg-red-500',
  },
  controle_urgent: {
    label: 'Contrôle urgent',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-700/60',
    badgeClass: 'bg-orange-950/40 text-orange-400 border-orange-700/50',
    progressClass: 'bg-orange-500',
  },
  controle_recommande: {
    label: 'Contrôle recommandé',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-700/60',
    badgeClass: 'bg-amber-950/40 text-amber-400 border-amber-700/50',
    progressClass: 'bg-amber-500',
  },
  surveillance: {
    label: 'Surveillance',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-700/60',
    badgeClass: 'bg-blue-950/40 text-blue-400 border-blue-700/50',
    progressClass: 'bg-blue-500',
  },
};

/**
 * Récupère l'alerte prédictive active pour UN véhicule.
 * Lit directement `predictive_alerts` (RLS filtre par company_id).
 * Abonnement Realtime : se met à jour automatiquement quand une nouvelle
 * alerte est insérée pour ce véhicule (ex: après une nouvelle inspection).
 */
export function useVehiclePredictiveAlert(vehicleId: string) {
  const queryClient = useQueryClient();

  // Realtime : invalide le cache dès qu'une ligne est insérée/modifiée
  // pour ce véhicule dans predictive_alerts
  useEffect(() => {
    if (!vehicleId) return;
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`pred-alert-vehicle-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictive_alerts',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['predictive-alert', vehicleId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId, queryClient]);

  return useQuery<VehiclePredictiveAlert | null, Error>({
    queryKey: ['predictive-alert', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('predictive_alerts')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Retourne null si aucune ligne (au lieu de lever une erreur)

      if (error) throw new Error(error.message);
      return data as VehiclePredictiveAlert | null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!vehicleId,
  });
}

/**
 * Mutation de feedback rapide depuis la carte véhicule.
 * Marque l'alerte comme traitée (control_done) sans nécessiter le formulaire complet.
 * Compatible avec les rôles AGENT_DE_PARC, DIRECTEUR, ADMIN (RLS enforce).
 */
export function useAlertFeedback() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();

  return useMutation({
    mutationFn: async ({
      alertId,
      result,
      vehicleId,
    }: {
      alertId: string;
      result: 'anomaly_confirmed' | 'no_anomaly';
      vehicleId: string;
    }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('predictive_alerts')
        .update({
          status: 'control_done',
          control_result: result,
          controlled_at: new Date().toISOString(),
          controlled_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw new Error(error.message);
      return { vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['predictive-alert', data.vehicleId] });
      // Invalider aussi le widget dashboard si ouvert
      queryClient.invalidateQueries({ queryKey: ['predictive-alerts'] });
    },
  });
}
