'use client';

/**
 * Hook React Query - Gestion des activités de transport par véhicule
 * Assignation, historique, activité courante
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import { cacheTimes } from '@/lib/query-config';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
import {
  getVehicleActivities,
  getVehicleCurrentActivity,
  assignVehicleActivity,
  endVehicleCurrentActivity,
  type TransportActivity,
  type VehicleActivityAssignment,
} from '@/actions/vehicle-activities';

// Clés de cache
const vehicleActivityKeys = {
  all: ['vehicle-activities'] as const,
  history: (vehicleId: string) => [...vehicleActivityKeys.all, 'history', vehicleId] as const,
  current: (vehicleId: string) => [...vehicleActivityKeys.all, 'current', vehicleId] as const,
};

/**
 * Hook pour récupérer l'historique des activités d'un véhicule
 */
export function useVehicleActivities(
  vehicleId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<VehicleActivityAssignment[]>({
    queryKey: vehicleActivityKeys.history(vehicleId),
    queryFn: async () => {
      if (!vehicleId) {
        return [];
      }

      const result = await getVehicleActivities(vehicleId);
      
      if (!result.success) {
        logger.error('[useVehicleActivities] Error:', result.error);
        throw new Error(result.error || 'Erreur récupération historique');
      }

      return result.data || [];
    },
    enabled: options?.enabled !== false && !!vehicleId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.vehicles,
  });
}

/**
 * Hook pour récupérer l'activité courante d'un véhicule
 */
export function useVehicleCurrentActivity(
  vehicleId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<VehicleActivityAssignment | null>({
    queryKey: vehicleActivityKeys.current(vehicleId),
    queryFn: async (): Promise<VehicleActivityAssignment | null> => {
      if (!vehicleId) {
        return null;
      }

      const result = await getVehicleCurrentActivity(vehicleId);
      
      if (!result.success) {
        logger.error('[useVehicleCurrentActivity] Error:', result.error);
        throw new Error(result.error || 'Erreur récupération activité courante');
      }

      return result.data ?? null;
    },
    enabled: options?.enabled !== false && !!vehicleId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.vehicles,
  });
}

/**
 * Hook pour assigner une activité à un véhicule
 * Clôture automatiquement l'ancienne activité
 */
export function useAssignVehicleActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      activity,
      startDate,
      notes,
    }: {
      vehicleId: string;
      activity: TransportActivity;
      startDate?: string;
      notes?: string;
    }) => {
      const result = await assignVehicleActivity(vehicleId, activity, startDate, notes);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur assignation activité');
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalider les caches
      queryClient.invalidateQueries({ 
        queryKey: vehicleActivityKeys.history(variables.vehicleId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: vehicleActivityKeys.current(variables.vehicleId) 
      });
      
      // Invalider aussi le cache compliance
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      
      toast.success('Activité assignée au véhicule');
    },
    onError: (error: Error) => {
      logger.error('Error assigning vehicle activity', error);
      toast.error(getReadableError(error));
    },
  });
}

/**
 * Hook pour terminer l'activité courante d'un véhicule
 */
export function useEndVehicleActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      endDate,
    }: {
      vehicleId: string;
      endDate?: string;
    }) => {
      const result = await endVehicleCurrentActivity(vehicleId, endDate);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur fin d\'activité');
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: vehicleActivityKeys.history(variables.vehicleId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: vehicleActivityKeys.current(variables.vehicleId) 
      });
      
      // Invalider aussi le cache compliance
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      
      toast.success('Activité terminée');
    },
    onError: (error: Error) => {
      logger.error('Error ending vehicle activity', error);
      toast.error(getReadableError(error));
    },
  });
}

/**
 * Hook combiné pour gérer les activités d'un véhicule
 * Retourne l'historique, l'activité courante et les mutations
 */
export function useVehicleActivityManager(vehicleId: string) {
  const { data: history, isLoading: isLoadingHistory } = useVehicleActivities(vehicleId);
  const { data: currentActivity, isLoading: isLoadingCurrent } = useVehicleCurrentActivity(vehicleId);
  const assignMutation = useAssignVehicleActivity();
  const endMutation = useEndVehicleActivity();

  return {
    // Données
    history: history || [],
    currentActivity,
    
    // Loading states
    isLoading: isLoadingHistory || isLoadingCurrent,
    isLoadingHistory,
    isLoadingCurrent,
    isAssigning: assignMutation.isPending,
    isEnding: endMutation.isPending,
    
    // Mutations
    assignActivity: assignMutation.mutate,
    assignActivityAsync: assignMutation.mutateAsync,
    endActivity: endMutation.mutate,
    endActivityAsync: endMutation.mutateAsync,
    
    // Helpers
    hasActiveActivity: !!currentActivity,
    currentActivityType: currentActivity?.activity || null,
  };
}

/**
 * Hook pour vérifier si un véhicule a une activité ADR
 */
export function useVehicleHasADR(vehicleId: string, options?: { enabled?: boolean }) {
  const { data: currentActivity, isLoading } = useVehicleCurrentActivity(vehicleId, options);
  
  const hasADR = currentActivity?.activity === 'ADR_COLIS' || 
                 currentActivity?.activity === 'ADR_CITERNE';
  
  const adrType = hasADR ? currentActivity?.activity : null;

  return {
    hasADR,
    adrType,
    currentActivity: currentActivity?.activity || null,
    isLoading,
  };
}

/**
 * Liste des activités disponibles avec leurs labels et couleurs
 */
export const VEHICLE_ACTIVITIES_CONFIG: Record<TransportActivity, { 
  label: string; 
  color: string; 
  icon: string;
  description: string;
}> = {
  MARCHANDISES_GENERALES: {
    label: 'Marchandises Générales',
    color: 'bg-gray-100 text-gray-800',
    icon: 'Package',
    description: 'Transport standard',
  },
  FRIGORIFIQUE: {
    label: 'Frigorifique',
    color: 'bg-blue-100 text-blue-800',
    icon: 'Snowflake',
    description: 'Température dirigée',
  },
  ADR_COLIS: {
    label: 'ADR Colis',
    color: 'bg-orange-100 text-orange-800',
    icon: 'AlertTriangle',
    description: 'Matières dangereuses en colis',
  },
  ADR_CITERNE: {
    label: 'ADR Citerne',
    color: 'bg-red-100 text-red-800',
    icon: 'AlertOctagon',
    description: 'Matières dangereuses vrac',
  },
  CONVOI_EXCEPTIONNEL: {
    label: 'Convoi Exceptionnel',
    color: 'bg-purple-100 text-purple-800',
    icon: 'Truck',
    description: 'Hors gabarit',
  },
  BENNE_TRAVAUX_PUBLICS: {
    label: 'Benne TP',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'Construction',
    description: 'Matériaux construction',
  },
  ANIMAUX_VIVANTS: {
    label: 'Animaux Vivants',
    color: 'bg-green-100 text-green-800',
    icon: 'Heart',
    description: 'Transport animalier',
  },
};
