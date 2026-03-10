'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Wrench,
  Eye,
  Trash2,
  ChevronRight,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import {
  PredictiveAlert,
  URGENCY_CONFIG,
  useMarkAlertUrgent,
  useDeleteAlert,
} from '@/hooks/use-predictive-alerts';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  alert: PredictiveAlert;
  userRole: string;
  onControl: (alert: PredictiveAlert) => void;
}

const COMPONENT_ICONS: Record<string, string> = {
  Pneumatiques: '🛞',
  Freinage: '🛑',
  Moteur: '⚙️',
  Carrosserie: '🚗',
  Éclairage: '💡',
  Général: '🔍',
};

export function AlertCard({ alert, userRole, onControl }: AlertCardProps) {
  const urgency = URGENCY_CONFIG[alert.urgency_level];
  const markUrgent = useMarkAlertUrgent();
  const deleteAlert = useDeleteAlert();

  const vehicleLabel = alert.vehicle
    ? `${alert.vehicle.registration_number} — ${alert.vehicle.brand} ${alert.vehicle.model}`
    : 'Véhicule inconnu';

  const predictedDate = new Date(alert.predicted_control_date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const daysLabel =
    alert.days_until_critical <= 0
      ? 'Seuil critique dépassé'
      : `Seuil critique dans ${alert.days_until_critical} jour${alert.days_until_critical > 1 ? 's' : ''}`;

  return (
    <div
      className={cn(
        'rounded-xl border-l-4 border border-slate-700 bg-slate-800/60 p-4 transition-all',
        urgency.borderClass,
      )}
    >
      {/* En-tête : véhicule + badge urgence */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200 truncate">{vehicleLabel}</span>
            <Badge variant="outline" className={cn('text-xs border', urgency.badgeClass)}>
              {urgency.label}
            </Badge>
          </div>

          {/* Composant concerné */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-base">{COMPONENT_ICONS[alert.component_concerned] ?? '🔍'}</span>
            <span className="text-sm font-medium text-slate-300">{alert.component_concerned}</span>
            <span className="text-slate-600 mx-1">·</span>
            <span className="text-sm text-slate-400">
              Score : <span className="font-semibold text-slate-300">{alert.current_score}/100</span>
            </span>
          </div>
        </div>

        {/* Score de dégradation */}
        <div className="text-right shrink-0">
          <div className={cn('text-sm font-bold', urgency.color)}>
            −{alert.degradation_speed.toFixed(1)} pts/j
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
            <TrendingDown className="h-3 w-3" />
            <span>dégradation</span>
          </div>
        </div>
      </div>

      {/* Raisonnement */}
      <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">{alert.reasoning}</p>

      {/* Date prédite */}
      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>
          Contrôle recommandé avant le <strong className="text-slate-300">{predictedDate}</strong>
        </span>
        <span className="text-slate-700">·</span>
        <span className={cn(alert.days_until_critical <= 0 ? 'text-red-400' : 'text-slate-500')}>
          {daysLabel}
        </span>
      </div>

      {/* Actions selon le rôle */}
      <div className="mt-3 flex items-center gap-2 justify-end border-t border-slate-700/50 pt-3">
        {/* AGENT_DE_PARC : action principale = effectuer le contrôle */}
        {userRole === 'AGENT_DE_PARC' && (
          <Button
            size="sm"
            onClick={() => onControl(alert)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            Effectuer le contrôle
          </Button>
        )}

        {/* EXPLOITANT : lecture seule */}
        {userRole === 'EXPLOITANT' && (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-400" disabled>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Lecture seule
          </Button>
        )}

        {/* DIRECTEUR : supervision + escalade */}
        {userRole === 'DIRECTEUR' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => onControl(alert)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Voir détails
            </Button>
            {alert.urgency_level !== 'intervention_immediate' && (
              <Button
                size="sm"
                variant="outline"
                className="border-orange-700/50 text-orange-400 hover:bg-orange-950/30"
                onClick={() => markUrgent.mutate(alert.id)}
                disabled={markUrgent.isPending}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Marquer urgent
              </Button>
            )}
          </>
        )}

        {/* ADMIN : toutes actions */}
        {userRole === 'ADMIN' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => onControl(alert)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Détails
            </Button>
            {alert.urgency_level !== 'intervention_immediate' && (
              <Button
                size="sm"
                variant="outline"
                className="border-orange-700/50 text-orange-400 hover:bg-orange-950/30"
                onClick={() => markUrgent.mutate(alert.id)}
                disabled={markUrgent.isPending}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Urgent
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-red-700/50 text-red-400 hover:bg-red-950/30"
              onClick={() => deleteAlert.mutate(alert.id)}
              disabled={deleteAlert.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
