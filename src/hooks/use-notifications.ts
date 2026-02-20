/**
 * Hooks React Query pour le système de notifications
 * - useNotifications : Liste avec infinite scroll
 * - useMarkAsRead : Marquer comme lue
 * - useMarkAllAsRead : Tout marquer comme lu
 * - useUnreadNotificationsCount : Compteur non lues
 * - useNotificationPreferences : Préférences utilisateur
 * - useUpdateNotificationPreferences : Mettre à jour préférences
 * - useRealtimeNotifications : Supabase Realtime pour temps réel
 */

import { 
  useInfiniteQuery, 
  useMutation, 
  useQuery, 
  useQueryClient,
  QueryFunctionContext 
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  getUnreadCount,
  getPreferences,
  updatePreferences 
} from '@/app/actions/notifications';
import { useUser } from '@/hooks/use-user';
import { logger } from '@/lib/logger';

// Types
interface Notification {
  id: string;
  user_id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: Record<string, unknown>;
  channels: string[];
  read_at: string | null;
  created_at: string;
}

interface NotificationsPage {
  data: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: { pageSize: number }) => [...notificationKeys.lists(), filters] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

/**
 * Hook pour récupérer les notifications avec infinite scroll
 */
interface UseNotificationsOptions {
  pageSize?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pageSize = 30 } = options;

  return useInfiniteQuery<NotificationsPage, Error>({
    queryKey: notificationKeys.list({ pageSize }),
    queryFn: async ({ pageParam }: QueryFunctionContext) => {
      const result = await getNotifications({ 
        cursor: pageParam as string | undefined, 
        pageSize 
      });
      // @ts-ignore
      return result.data as NotificationsPage;
    },
    // @ts-ignore
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour marquer une notification comme lue
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markAsRead({ notificationId });
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      // Invalider les requêtes de notifications
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
    },
    onError: (error: Error) => {
      logger.error('Erreur markAsRead:', { error: error.message });
    },
  });
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await markAllAsRead();
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
    },
    onError: (error: Error) => {
      logger.error('Erreur markAllAsRead:', { error: error.message });
    },
  });
}

/**
 * Hook pour le nombre de notifications non lues
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async () => {
      const result = await getUnreadCount();
      // @ts-ignore
      return result.data?.count ?? 0;
    },
    staleTime: 1000 * 30, // 30 secondes
    refetchInterval: 1000 * 60, // Refetch toutes les minutes
  });
}

/**
 * Hook pour les préférences de notification
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const result = await getPreferences();
      // @ts-ignore
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour mettre à jour les préférences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      const result = await updatePreferences(preferences);
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
    onError: (error: Error) => {
      logger.error('Erreur updatePreferences:', { error: error.message });
    },
  });
}

/**
 * Hook pour écouter les nouvelles notifications en temps réel (Supabase Realtime)
 */
export function useRealtimeNotifications(
  onNewNotification?: (notification: Notification) => void
) {
  // @ts-ignore
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    // @ts-ignore
    if (!user?.id) return;

    const supabase = createClient();

    // S'abonner au canal realtime pour les nouvelles notifications
    const channel = supabase
      // @ts-ignore
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // @ts-ignore
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Callback pour afficher toast
          if (onNewNotification) {
            onNewNotification(notification);
          }

          // Invalider le cache pour rafraîchir la liste
          queryClient.invalidateQueries({ 
            queryKey: notificationKeys.lists() 
          });
          queryClient.invalidateQueries({ 
            queryKey: notificationKeys.unread() 
          });
        }
      )
      .subscribe();

    logger.debug('Realtime notifications subscribed', { userId: user.id });

    return () => {
      channel.unsubscribe();
      logger.debug('Realtime notifications unsubscribed');
    };
  }, [user?.id, queryClient, onNewNotification]);
}

/**
 * Hook utilitaire pour marquer une notification comme lue
 * lors du clic sur un lien/action
 */
export function useMarkNotificationAsReadOnAction() {
  const mutation = useMarkAsRead();

  return (notificationId: string) => {
    mutation.mutate(notificationId);
  };
}
