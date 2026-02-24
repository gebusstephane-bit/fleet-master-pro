'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, Shield, Eye, AlertTriangle } from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import {
  usePredictiveAlerts,
  usePredictiveAlertsStats,
  PredictiveAlert,
  URGENCY_CONFIG,
  URGENCY_ORDER,
} from '@/hooks/use-predictive-alerts';
import { AlertCard } from './alert-card';
import { TargetedControlForm } from './targeted-control-form';
import { cn } from '@/lib/utils';

// ============================================================
// Widget principal
// ============================================================

export function PredictiveAlertsWidget() {
  const { user } = useUserContext();
  const { data: alerts, isLoading, error } = usePredictiveAlerts();
  const { stats } = usePredictiveAlertsStats();
  const [selectedAlert, setSelectedAlert] = useState<PredictiveAlert | null>(null);

  const userRole = user?.role ?? '';

  // Icône selon le rôle
  const RoleIcon =
    userRole === 'ADMIN'
      ? Shield
      : userRole === 'DIRECTEUR'
        ? Eye
        : AlertTriangle;

  const roleLabel =
    userRole === 'AGENT_DE_PARC'
      ? 'Vos contrôles à effectuer'
      : userRole === 'DIRECTEUR'
        ? 'Supervision maintenance prédictive'
        : userRole === 'ADMIN'
          ? 'Gestion alertes prédictives'
          : 'Alertes en lecture seule';

  if (isLoading) return <PredictiveWidgetSkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-400">Erreur lors du chargement des alertes prédictives.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="h-5 w-5 text-cyan-400" />
                Alertes Prédictives
                {stats.total > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-1 border font-bold',
                      stats.intervention_immediate > 0
                        ? 'border-red-500/50 text-red-400 bg-red-950/30'
                        : stats.controle_urgent > 0
                          ? 'border-orange-500/50 text-orange-400 bg-orange-950/30'
                          : 'border-slate-600 text-slate-400',
                    )}
                  >
                    {stats.total}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5">
                <RoleIcon className="h-3.5 w-3.5" />
                {roleLabel}
              </CardDescription>
            </div>

            {/* Compteurs par urgence */}
            {stats.total > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {URGENCY_ORDER.filter(
                  (level) => stats[level as keyof typeof stats] > 0,
                ).map((level) => {
                  const cfg = URGENCY_CONFIG[level];
                  const count = stats[level as keyof typeof stats] as number;
                  return (
                    <Badge
                      key={level}
                      variant="outline"
                      className={cn('text-xs border', cfg.badgeClass)}
                    >
                      {count} {cfg.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {alerts && alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                userRole={userRole}
                onControl={setSelectedAlert}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Modal contrôle ciblé */}
      {selectedAlert && (
        <TargetedControlForm
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </>
  );
}

// ============================================================
// États vides et skeletons
// ============================================================

function EmptyState() {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <BrainCircuit className="h-7 w-7 text-emerald-400" />
      </div>
      <p className="font-medium text-slate-200">Aucune alerte prédictive active</p>
      <p className="text-sm text-slate-500 mt-1">
        Tous les véhicules sont dans les seuils normaux.
      </p>
    </div>
  );
}

function PredictiveWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-56 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
