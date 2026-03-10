'use client';

import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FuelAnomalyNotification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  data: {
    vehicle_id?: string;
    fuel_record_id?: string;
    actual?: number;
    average?: number;
    deviation_percent?: number;
  } | null;
}

interface FuelAnomaliesPanelProps {
  anomalies: FuelAnomalyNotification[];
  isLoading?: boolean;
  onDismiss: (id: string) => void;
  isDismissing?: boolean;
}

export function FuelAnomaliesPanel({
  anomalies,
  isLoading,
  onDismiss,
  isDismissing,
}: FuelAnomaliesPanelProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-red-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Anomalies récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (anomalies.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-slate-400" />
            Anomalies récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-2">
            Aucune anomalie détectée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-red-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Anomalies récentes
          <Badge className="ml-auto bg-red-500/20 text-red-400 border-0 text-xs">
            {anomalies.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {anomalies.map((anomaly) => {
          const deviation = anomaly.data?.deviation_percent;
          const actual = anomaly.data?.actual;
          const average = anomaly.data?.average;
          const isCritical = anomaly.priority === 'high' || anomaly.priority === 'critical';

          return (
            <div
              key={anomaly.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-sm',
                isCritical
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-amber-500/40 bg-amber-500/5'
              )}
            >
              <AlertTriangle
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  isCritical ? 'text-red-400' : 'text-amber-400'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">
                    {actual != null ? `${actual.toFixed(1)} L/100km` : 'N/A'}
                  </span>
                  {average != null && (
                    <span className="text-slate-400">
                      vs {average.toFixed(1)} L/100km moy.
                    </span>
                  )}
                  {deviation != null && (
                    <Badge
                      className={cn(
                        'border-0 text-xs',
                        isCritical
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      )}
                    >
                      {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{anomaly.message}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {new Date(anomaly.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-slate-500 hover:text-slate-300"
                onClick={() => onDismiss(anomaly.id)}
                disabled={isDismissing}
                title="Ignorer"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
