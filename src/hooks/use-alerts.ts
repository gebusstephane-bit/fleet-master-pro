import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAlerts,
  createAlert,
  markAlertAsRead,
  markAllAlertsAsRead,
} from '@/actions/alerts';

export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
};

export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.lists(),
    queryFn: async () => {
      const result = await getAlerts();
      // @ts-ignore
      if (!result?.success) throw new Error('Erreur récupération alertes');
      // @ts-ignore
      return result.data;
    },
  });
}

export function useCreateAlerts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await createAlert();
      // @ts-ignore
      if (!result?.success) throw new Error('Erreur création');
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      toast.success('Alertes mises à jour');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markAlertAsRead({ id });
      // @ts-ignore
      if (!result?.success) throw new Error('Erreur');
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await markAllAlertsAsRead();
      // @ts-ignore
      if (!result?.success) throw new Error('Erreur');
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      toast.success('Toutes les alertes marquées comme lues');
    },
  });
}
