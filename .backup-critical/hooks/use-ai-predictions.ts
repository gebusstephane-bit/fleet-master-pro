/**
 * Hooks React Query pour les prédictions IA FleetMaster AI Predict
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

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
