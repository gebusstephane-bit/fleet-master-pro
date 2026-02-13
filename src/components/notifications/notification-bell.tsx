/**
 * Icône cloche avec badge de notifications non lues
 * Intégrée dans la sidebar/header
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnreadNotificationsCount, useNotifications, useMarkAsRead } from '@/hooks/use-notifications';
import { notificationTypeConfig, priorityColors } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Icons from 'lucide-react';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({ pageSize: 5 });
  const markAsRead = useMarkAsRead();

  const notifications = data?.pages.flatMap((page) => page.data) || [];

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead.mutate(id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Aucune notification
            </div>
          ) : (
            <>
              {notifications.map((notification) => {
                const config = notificationTypeConfig[notification.type];
                const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || Icons.Bell;
                const isUnread = !notification.read_at;

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      isUnread ? 'bg-slate-50' : ''
                    }`}
                    asChild
                  >
                    <Link href={`/notifications?id=${notification.id}`}>
                      <div className={`p-2 rounded-full ${priorityColors[notification.priority]}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                        >
                          Lu
                        </Button>
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}

              {hasNextPage && (
                <div className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full text-center cursor-pointer">
            Voir toutes les notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
