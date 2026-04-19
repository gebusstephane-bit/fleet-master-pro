'use client';

/**
 * VehicleKPIBar - 4 cartes KPI horizontales pour la page détail véhicule
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Fuel, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

interface VehicleKPIBarProps {
  nextMaintenanceKm?: number | null;
  consumption?: number | null;
  fuelType?: string;
  technicalControlExpiry?: string | null;
  technicalControlDate?: string | null;
  alertCount?: number;
  urgentAlertCount?: number;
  onCardClick?: (tab: string) => void;
}

export function VehicleKPIBar({
  nextMaintenanceKm,
  consumption,
  fuelType,
  technicalControlExpiry,
  technicalControlDate,
  alertCount = 0,
  urgentAlertCount = 0,
  onCardClick,
}: VehicleKPIBarProps) {
  // Calcul des jours restants pour le CT
  const daysUntilCT = technicalControlExpiry
    ? differenceInDays(parseISO(technicalControlExpiry), new Date())
    : null;

  const isCTExpired = daysUntilCT !== null && daysUntilCT < 0;
  const isCTUrgent = daysUntilCT !== null && daysUntilCT >= 0 && daysUntilCT < 30;

  const kpiCards = [
    {
      id: 'maintenance',
      icon: Wrench,
      title: 'Prochain entretien',
      value: nextMaintenanceKm
        ? `Dans ${nextMaintenanceKm.toLocaleString('fr-FR')} km`
        : 'Non planifié',
      subtitle: nextMaintenanceKm ? 'estimé' : '',
      color: 'blue',
      clickable: true,
    },
    {
      id: 'fuel',
      icon: Fuel,
      title: 'Conso. moyenne',
      value: consumption ? `${consumption.toFixed(1)} L/100` : '—',
      subtitle: fuelType || '',
      color: 'amber',
      clickable: !!consumption,
    },
    {
      id: 'inspections',
      icon: ClipboardCheck,
      title: 'Contrôle technique',
      value: technicalControlExpiry
        ? new Date(technicalControlExpiry).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Non renseigné',
      subtitle:
        daysUntilCT !== null
          ? isCTExpired
            ? '⚠️ Expiré'
            : `✅ ${daysUntilCT} jours`
          : '',
      color: isCTExpired ? 'red' : isCTUrgent ? 'amber' : 'green',
      clickable: true,
    },
    {
      id: 'alerts',
      icon: AlertTriangle,
      title: 'Alertes actives',
      value: alertCount > 0 ? `${alertCount} alerte${alertCount > 1 ? 's' : ''}` : 'Aucune alerte',
      subtitle: urgentAlertCount > 0 ? `⚠️ ${urgentAlertCount} urgent${urgentAlertCount > 1 ? 'es' : ''}` : '',
      color: alertCount > 0 ? (urgentAlertCount > 0 ? 'red' : 'amber') : 'gray',
      clickable: alertCount > 0,
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
    blue: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-400',
      border: 'border-blue-500/20 hover:border-blue-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-400',
      border: 'border-amber-500/20 hover:border-amber-500/40',
    },
    green: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
    red: {
      bg: 'bg-red-500/10',
      icon: 'text-red-400',
      border: 'border-red-500/20 hover:border-red-500/40',
    },
    gray: {
      bg: 'bg-slate-500/10',
      icon: 'text-slate-400',
      border: 'border-slate-500/20',
    },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((card) => {
        const colors = colorClasses[card.color];
        const Icon = card.icon;

        return (
          <Card
            key={card.id}
            className={cn(
              'bg-[#0f172a]/60 border transition-all duration-200',
              colors.border,
              card.clickable
                ? 'cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5'
                : 'opacity-70 cursor-default'
            )}
            onClick={() => card.clickable && onCardClick?.(card.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', colors.bg)}>
                  <Icon className={cn('h-5 w-5', colors.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 uppercase tracking-wider truncate">
                    {card.title}
                  </p>
                  <p className="text-lg font-bold text-white mt-0.5 truncate">{card.value}</p>
                  {card.subtitle && (
                    <p className={cn('text-xs mt-0.5 truncate', 
                      card.color === 'red' ? 'text-red-400' : 
                      card.color === 'amber' ? 'text-amber-400' : 
                      'text-slate-500'
                    )}>
                      {card.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
