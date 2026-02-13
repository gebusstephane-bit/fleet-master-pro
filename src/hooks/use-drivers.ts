/**
 * Hooks React Query pour les chauffeurs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from '@/actions/drivers';

// Clés de cache
export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...driverKeys.lists(), filters] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
};

// Hook récupération liste chauffeurs
export function useDrivers() {
  return useQuery({
    queryKey: driverKeys.lists(),
    queryFn: async () => {
      const result = await getDrivers();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération chauffeurs');
      }
      return result.data.data;
    },
  });
}

// Hook récupération détail chauffeur
export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: async () => {
      const result = await getDriverById({ id });
      if (!result?.data?.success) {
        throw new Error('Chauffeur non trouvé');
      }
      return result.data.data;
    },
    enabled: !!id,
  });
}

// Hook création chauffeur
export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createDriver>[0]) => {
      const result = await createDriver(data);
      if (!result?.data?.success) {
        throw new Error(result?.data || 'Erreur création');
      }
      return result.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      toast.success('Chauffeur créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook mise à jour chauffeur
export function useUpdateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof updateDriver>[0]) => {
      const result = await updateDriver(data);
      if (!result?.data?.success) {
        throw new Error(result?.data || 'Erreur mise à jour');
      }
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.id) });
      toast.success('Chauffeur mis à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook suppression chauffeur
export function useDeleteDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDriver({ id });
      if (!result?.data?.success) {
        throw new Error(result?.data || 'Erreur suppression');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      toast.success('Chauffeur supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
