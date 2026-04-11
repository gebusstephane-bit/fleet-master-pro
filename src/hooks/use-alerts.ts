'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
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
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
    },
  });
}

export function useCreateAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await createAlert();
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      toast.success('Alertes mises à jour');
    },
    onError: (error: Error) => toast.error(getReadableError(error)),
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markAlertAsRead({ id });
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
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
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      toast.success('Toutes les alertes marquées comme lues');
    },
  });
}
