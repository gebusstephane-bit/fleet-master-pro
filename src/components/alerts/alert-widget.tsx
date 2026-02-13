'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAlerts, useMarkAlertAsRead } from '@/hooks/use-alerts';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  medium: { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50' },
  low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
};

const typeLabels: Record<string, string> = {
  maintenance: 'Maintenance',
  insurance: 'Assurance',
  vehicle_issue: 'Véhicule',
  safety: 'Sécurité',
};

export function AlertWidget() {
  const { data: alerts, isLoading } = useAlerts();
  const markAsRead = useMarkAlertAsRead();
  
  const unreadAlerts = alerts?.slice(0, 5) || [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertes
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1">
              {unreadAlerts.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/alerts">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          {unreadAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Check className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm">Aucune alerte</p>
            </div>
          ) : (
            <div className="space-y-2 p-4 pt-0">
              {unreadAlerts.map((alert: any) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
                const Icon = config.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} group`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {typeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => markAsRead.mutate(alert.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
