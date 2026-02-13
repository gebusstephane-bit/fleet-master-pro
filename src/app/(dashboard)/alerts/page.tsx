'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, AlertCircle, Info, Check, RefreshCw, Bell } from 'lucide-react';
import { useAlerts, useCreateAlerts, useMarkAllAlertsAsRead } from '@/hooks/use-alerts';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Critique' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Haute' },
  medium: { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Moyenne' },
  low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Basse' },
};

const typeLabels: Record<string, string> = {
  maintenance: 'Maintenance',
  insurance: 'Assurance',
  vehicle_issue: 'Véhicule',
  safety: 'Sécurité',
};

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const createAlerts = useCreateAlerts();
  const markAllAsRead = useMarkAllAlertsAsRead();
  
  const unreadAlerts = alerts?.filter((a: any) => !a.is_read) || [];
  const readAlerts = alerts?.filter((a: any) => a.is_read) || [];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground">
            Gérez les alertes et notifications de votre flotte
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => createAlerts.mutate()}
            disabled={createAlerts.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${createAlerts.isPending ? 'animate-spin' : ''}`} />
            Vérifier les alertes
          </Button>
          {unreadAlerts.length > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()}>
              <Check className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread" className="gap-2">
            <Bell className="h-4 w-4" />
            Non lues
            {unreadAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unread" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : unreadAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Aucune alerte en cours</p>
                <p className="text-muted-foreground">Toutes les alertes ont été traitées</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {unreadAlerts.map((alert: any) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
                const Icon = config.icon;
                
                return (
                  <Card key={alert.id}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={`p-3 rounded-lg ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{typeLabels[alert.type] || alert.type}</Badge>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <h3 className="font-semibold">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {alert.vehicles && (
                          <p className="text-sm mt-2">
                            Véhicule: <span className="font-medium">{alert.vehicles.registration_number}</span>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid gap-4">
              {[...unreadAlerts, ...readAlerts].map((alert: any) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
                const Icon = config.icon;
                
                return (
                  <Card key={alert.id} className={alert.is_read ? 'opacity-60' : ''}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={`p-3 rounded-lg ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{typeLabels[alert.type] || alert.type}</Badge>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {alert.is_read && <Badge variant="outline" className="text-xs">Lu</Badge>}
                        </div>
                        <h3 className="font-semibold">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
