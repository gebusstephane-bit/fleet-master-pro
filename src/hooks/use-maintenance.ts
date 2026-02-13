import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMaintenances,
  getMaintenanceById,
  getMaintenancesByVehicle,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getMaintenanceAlerts,
  getMaintenanceStats,
} from '@/actions/maintenance';
import { sendMaintenanceAlerts, testEmailConfig } from '@/actions/email-alerts';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
  alerts: () => [...maintenanceKeys.all, 'alerts'] as const,
  stats: () => [...maintenanceKeys.all, 'stats'] as const,
};

export function useMaintenances() {
  return useQuery({
    queryKey: maintenanceKeys.lists(),
    queryFn: async () => {
      const result = await getMaintenances();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération interventions');
      }
      return result.data.data;
    },
  });
}

export function useMaintenance(id: string) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: async () => {
      const result = await getMaintenanceById({ id });
      if (!result?.data?.success) {
        throw new Error('Intervention non trouvée');
      }
      return result.data.data;
    },
    enabled: !!id,
  });
}

export function useMaintenancesByVehicle(vehicleId: string) {
  return useQuery({
    queryKey: [...maintenanceKeys.all, 'byVehicle', vehicleId],
    queryFn: async () => {
      const result = await getMaintenancesByVehicle({ vehicleId });
      if (!result?.data?.success) {
        throw new Error('Erreur récupération interventions');
      }
      return result.data.data;
    },
    enabled: !!vehicleId,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createMaintenance>[0]) => {
      const result = await createMaintenance(data);
      if (!result?.data?.success) {
        throw new Error('Erreur création intervention');
      }
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });
      // Invalider le cache du véhicule si un vehicleId est présent
      if ('vehicleId' in variables) {
        queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'byVehicle', variables.vehicleId] });
      }
      toast.success('Intervention créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof updateMaintenance>[0]) => {
      const result = await updateMaintenance(data);
      if (!result?.data?.success) {
        throw new Error('Erreur mise à jour intervention');
      }
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) });
      toast.success('Intervention mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteMaintenance({ id });
      if (!result?.data?.success) {
        throw new Error('Erreur suppression intervention');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      toast.success('Intervention supprimée');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: maintenanceKeys.alerts(),
    queryFn: async () => {
      const result = await getMaintenanceAlerts();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération alertes');
      }
      return result.data.data;
    },
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: maintenanceKeys.stats(),
    queryFn: async () => {
      const result = await getMaintenanceStats();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération stats');
      }
      return result.data.data;
    },
  });
}

export function useSendMaintenanceAlerts() {
  return useMutation({
    mutationFn: async () => {
      const result = await sendMaintenanceAlerts();
      if (!result?.data?.success) {
        throw new Error('Erreur envoi alertes');
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.sent} alertes envoyées à ${data.recipients} destinataires`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTestEmailConfig() {
  return useMutation({
    mutationFn: async () => {
      const result = await testEmailConfig();
      if (!result?.data?.success) {
        throw new Error('Erreur test email');
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Email de test envoyé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
