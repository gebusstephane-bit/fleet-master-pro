import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createFuelRecord,
  getFuelRecordsByVehicle,
  getAllFuelRecords,
  getFuelStats,
} from '@/actions/fuel';

export const fuelKeys = {
  all: ['fuel'] as const,
  lists: () => [...fuelKeys.all, 'list'] as const,
  byVehicle: (vehicleId: string) => [...fuelKeys.lists(), vehicleId] as const,
  stats: () => [...fuelKeys.all, 'stats'] as const,
};

export function useFuelRecords() {
  return useQuery({
    queryKey: fuelKeys.lists(),
    queryFn: async () => {
      const result = await getAllFuelRecords();
      // @ts-ignore
      if (!result?.success) throw new Error(result?.error || 'Erreur');
      // @ts-ignore
      return result.data;
    },
  });
}

export function useFuelRecordsByVehicle(vehicleId: string) {
  return useQuery({
    queryKey: fuelKeys.byVehicle(vehicleId),
    queryFn: async () => {
      const result = await getFuelRecordsByVehicle({ id: vehicleId });
      // @ts-ignore
      if (!result?.success) throw new Error(result?.error || 'Erreur');
      // @ts-ignore
      return result.data;
    },
    enabled: !!vehicleId,
  });
}

export function useCreateFuelRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createFuelRecord>[0]) => {
      const result = await createFuelRecord(data);
      // @ts-ignore
      if (!result?.success) throw new Error(result?.error || 'Erreur');
      // @ts-ignore
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fuelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fuelKeys.byVehicle(variables.vehicle_id) });
      queryClient.invalidateQueries({ queryKey: fuelKeys.stats() });
      toast.success('Plein enregistré');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useFuelStats() {
  return useQuery({
    queryKey: fuelKeys.stats(),
    queryFn: async () => {
      const result = await getFuelStats();
      // @ts-ignore
      if (!result?.success) throw new Error(result?.error || 'Erreur');
      // @ts-ignore
      return result.data;
    },
  });
}
