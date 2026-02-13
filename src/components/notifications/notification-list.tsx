/**
 * Liste complète des notifications avec infinite scroll
 * Page /notifications
 */

'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Check, 
  Trash2, 
  Bell,
  CheckCheck,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead,
  useRealtimeNotifications 
} from '@/hooks/use-notifications';
import { notificationTypeConfig, priorityColors } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

export function NotificationList() {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useNotifications({ pageSize: 30 });
  
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.pages.flatMap((page) => page.data) || [];

  // Écouter les nouvelles notifications en temps réel
  useRealtimeNotifications((notification) => {
    toast.info(notification.title, {
      description: notification.message,
      duration: 5000,
    });
  });

  // Virtualisation pour les grandes listes
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // Infinite scroll
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && hasNextPage && !isFetchingNextPage) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              fetchNextPage();
            }
          },
          { threshold: 0.5 }
        );
        observer.observe(node);
        return () => observer.disconnect();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        toast.success('Toutes les notifications ont été marquées comme lues');
      },
    });
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </CardTitle>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div ref={parentRef} className="h-[600px] overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const notification = notifications[virtualItem.index];
              const config = notificationTypeConfig[notification.type];
              const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || Icons.Bell;
              const isUnread = !notification.read_at;
              const isLastItem = virtualItem.index === notifications.length - 1;

              return (
                <div
                  key={notification.id}
                  ref={isLastItem ? lastItemRef : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="p-2"
                >
                  <div
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      isUnread 
                        ? 'bg-slate-50 border-slate-200' 
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${priorityColors[notification.priority]}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-slate-600 mt-1">{notification.message}</p>
                          
                          {Object.keys(notification.data).length > 0 && (
                            <div className="mt-2 text-sm text-slate-500">
                              {notification.data.vehicle_id && (
                                <Link 
                                  href={`/vehicles/${notification.data.vehicle_id}`}
                                  className="text-primary hover:underline"
                                >
                                  Voir le véhicule →
                                </Link>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-slate-400 mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead.mutate(notification.id)}
                              disabled={markAsRead.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
