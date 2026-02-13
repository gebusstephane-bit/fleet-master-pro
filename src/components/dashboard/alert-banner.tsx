/**
 * Alert Banner - Dashboard Production
 * Affiche les alertes maintenance prioritaires
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Wrench, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface MaintenanceAlert {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  due_date: string;
  days_until: number;
  priority: 'critical' | 'high' | 'medium';
}

interface AlertBannerProps {
  alerts: MaintenanceAlert[] | null;
  isLoading: boolean;
}

export function AlertBanner({ alerts, isLoading }: AlertBannerProps) {
  if (isLoading) {
    return (
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filtrer uniquement les alertes critiques et hautes
  const urgentAlerts = alerts?.filter(a => a.priority === 'critical' || a.priority === 'high') || [];
  
  if (urgentAlerts.length === 0) {
    return null; // Ne pas afficher si pas d'alertes urgentes
  }

  return (
    <Card className={cn(
      "border-l-4",
      urgentAlerts.some(a => a.priority === 'critical') 
        ? "border-l-red-500 border-red-200 bg-red-50/50" 
        : "border-l-amber-500 border-amber-200 bg-amber-50/50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn(
            "h-5 w-5",
            urgentAlerts.some(a => a.priority === 'critical') ? "text-red-600" : "text-amber-600"
          )} />
          <CardTitle className="text-base font-semibold">
            {urgentAlerts.length} maintenance{urgentAlerts.length > 1 ? 's' : ''} {urgentAlerts.some(a => a.priority === 'critical') ? 'urgente' : 'à traiter'}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {urgentAlerts.slice(0, 3).map((alert) => (
            <Link 
              key={alert.id} 
              href={`/maintenance`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  alert.priority === 'critical' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                )}>
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{alert.vehicle_name}</p>
                  <p className="text-xs text-slate-500">{alert.service_type}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge 
                  variant={alert.priority === 'critical' ? "destructive" : "default"}
                  className={cn(
                    "text-xs",
                    alert.priority === 'critical' ? "" : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                  )}
                >
                  {alert.days_until < 0 
                    ? `Retard ${Math.abs(alert.days_until)}j` 
                    : alert.days_until === 0 
                      ? "Aujourd'hui" 
                      : `J-${alert.days_until}`}
                </Badge>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
          
          {urgentAlerts.length > 3 && (
            <Link 
              href="/maintenance"
              className="flex items-center justify-center p-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Voir les {urgentAlerts.length - 3} autres alertes →
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
