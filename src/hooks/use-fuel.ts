import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { getReadableError } from '@/lib/error-messages';
import {
  createFuelRecord,
  getFuelRecordsByVehicle,
  getAllFuelRecords,
  getFuelStats,
  getFuelAnomalies,
  dismissFuelAnomaly,
} from '@/actions/fuel';

export const fuelKeys = {
  all: ['fuel'] as const,
  lists: () => [...fuelKeys.all, 'list'] as const,
  byVehicle: (vehicleId: string) => [...fuelKeys.lists(), vehicleId] as const,
  stats: () => [...fuelKeys.all, 'stats'] as const,
  anomalies: () => [...fuelKeys.all, 'anomalies'] as const,
};

export function useFuelRecords() {
  return useQuery({
    queryKey: fuelKeys.lists(),
    queryFn: async () => {
      const result = await getAllFuelRecords();
      logger.debug('[useFuelRecords] Raw result:', result);
      // Le résultat est sous result.data car c'est une Server Action
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
      // @ts-ignore
      return result.data.data;
    },
  });
}

export function useFuelRecordsByVehicle(vehicleId: string) {
  return useQuery({
    queryKey: fuelKeys.byVehicle(vehicleId),
    queryFn: async () => {
      const result = await getFuelRecordsByVehicle({ id: vehicleId });
      logger.debug('[useFuelRecordsByVehicle] Raw result:', result);
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
      // @ts-ignore
      return result.data.data;
    },
    enabled: !!vehicleId,
  });
}

export function useCreateFuelRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createFuelRecord>[0]) => {
      const result = await createFuelRecord(data);
      logger.debug('[useCreateFuelRecord] Raw result:', result);
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
      // @ts-ignore
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fuelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fuelKeys.byVehicle(variables.vehicle_id) });
      queryClient.invalidateQueries({ queryKey: fuelKeys.stats() });
      toast.success('Plein enregistré');
    },
    onError: (error: Error) => toast.error(getReadableError(error)),
  });
}

export function useFuelStats() {
  return useQuery({
    queryKey: fuelKeys.stats(),
    queryFn: async () => {
      const result = await getFuelStats();
      logger.debug('[useFuelStats] Raw result:', result);
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
      // @ts-ignore
      return result.data.data;
    },
  });
}

export function useFuelAnomalies() {
  return useQuery({
    queryKey: fuelKeys.anomalies(),
    queryFn: async () => {
      const result = await getFuelAnomalies();
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
      // @ts-ignore
      return result.data.data;
    },
    refetchInterval: 60_000, // Rafraîchit toutes les 60s
  });
}

export function useDismissFuelAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await dismissFuelAnomaly({ id });
      // @ts-ignore
      if (!result?.data?.success) throw new Error(result?.data?.error || 'Erreur');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fuelKeys.anomalies() });
    },
    onError: (error: Error) => toast.error(getReadableError(error)),
  });
}
