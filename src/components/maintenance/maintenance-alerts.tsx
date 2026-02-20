'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// @ts-ignore
import { useMaintenanceAlerts } from '@/hooks/use-maintenance';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, AlertCircle, Info, 
  Clock, Gauge, Calendar, ChevronRight,
  Wrench
} from 'lucide-react';
import Link from 'next/link';
import { differenceInDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const severityConfig: Record<string, any> = {
  CRITICAL: { 
    color: 'bg-red-100 text-red-700 border-red-200', 
    icon: AlertTriangle,
    label: 'Critique'
  },
  WARNING: { 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: AlertCircle,
    label: 'Attention'
  },
  INFO: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: Info,
    label: 'Info'
  },
};

export function MaintenanceAlerts() {
  // @ts-ignore
  const { data: alerts, isLoading } = useMaintenanceAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertes maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // @ts-ignore
  const criticalCount = alerts?.filter((a: any) => a.severity === 'CRITICAL').length || 0;
  // @ts-ignore
  const warningCount = alerts?.filter((a: any) => a.severity === 'WARNING').length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertes maintenance
            {(criticalCount > 0 || warningCount > 0) && (
              <Badge variant="destructive" className="ml-2">
                {criticalCount + warningCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-muted-foreground">Aucune alerte active</p>
            <p className="text-sm text-muted-foreground">
              Tous les véhicules sont à jour
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* @ts-ignore */}
            {alerts
              // @ts-ignore
              .sort((a: any, b: any) => {
                const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
                // @ts-ignore
                return severityOrder[a.severity] - severityOrder[b.severity];
              })
              // @ts-ignore
              .map((alert: any) => {
                // @ts-ignore
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${config.color} flex items-start gap-3`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.vehicleName}</span>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      
                      {/* Détails spécifiques */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {alert.dueMileage && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            {alert.currentMileage?.toLocaleString('fr-FR')} / {alert.dueMileage.toLocaleString('fr-FR')} km
                          </span>
                        )}
                        {alert.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(alert.dueDate), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2 h-auto p-0"
                        asChild
                      >
                        <Link href={`/maintenance/new?vehicleId=${alert.vehicleId}`}>
                          <Wrench className="h-3 w-3 mr-1" />
                          Planifier une intervention
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
