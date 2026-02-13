/**
 * Composant AlertsList
 * Liste des alertes récentes sur le dashboard
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileWarning, Wrench, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, daysUntil } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'maintenance' | 'document_expiry' | 'vehicle_fault' | 'geofence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entity_type: 'vehicle' | 'driver' | null;
  entity_id: string | null;
  created_at: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

const alertIcons = {
  maintenance: Wrench,
  document_expiry: FileWarning,
  vehicle_fault: AlertTriangle,
  geofence: MapPin,
};

const severityConfig = {
  low: { label: 'Faible', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  critical: { label: 'Critique', color: 'bg-red-100 text-red-800 border-red-200' },
};

export function AlertsList({ alerts }: AlertsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Alertes récentes</CardTitle>
        <Link href="/alerts">
          <Button variant="ghost" size="sm">
            Voir tout
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Aucune alerte active</p>
            <p className="text-sm">Tout va bien !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => {
              const Icon = alertIcons[alert.type];
              const severity = severityConfig[alert.severity];
              
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className={cn(
                    'p-2 rounded-full shrink-0',
                    alert.severity === 'critical' && 'bg-red-100 text-red-600',
                    alert.severity === 'high' && 'bg-orange-100 text-orange-600',
                    alert.severity === 'medium' && 'bg-amber-100 text-amber-600',
                    alert.severity === 'low' && 'bg-blue-100 text-blue-600',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <Badge variant="outline" className={cn('text-xs shrink-0', severity.color)}>
                        {severity.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(alert.created_at)}
                    </p>
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
