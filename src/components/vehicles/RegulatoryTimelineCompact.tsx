/**
 * RegulatoryTimelineCompact - Version compacte des échéances réglementaires
 * Affichage horizontal réduit pour mise en parallèle avec les infos techniques
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench,
  Gauge,
  Snowflake,
  ShieldAlert,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { vehicleTypeConfig, type VehicleType } from '@/lib/vehicle/calculate-dates';

interface RegulatoryTimelineCompactProps {
  vehicle: {
    type?: string;
    technical_control_date?: string | null;
    technical_control_expiry?: string | null;
    tachy_control_date?: string | null;
    tachy_control_expiry?: string | null;
    atp_date?: string | null;
    atp_expiry?: string | null;
    adr_certificate_date?: string | null;
    adr_certificate_expiry?: string | null;
  };
}

interface RegulatoryItem {
  id: string;
  label: string;
  shortLabel: string;
  date: string | null;
  icon: React.ReactNode;
  color: string;
  required: boolean;
}

export function RegulatoryTimelineCompact({ vehicle }: RegulatoryTimelineCompactProps) {
  const vehicleType = vehicle.type as VehicleType | undefined;
  const typeConfig = vehicleType ? vehicleTypeConfig[vehicleType] : null;

  const items: RegulatoryItem[] = [
    {
      id: 'ct',
      label: 'Contrôle Technique',
      shortLabel: 'CT',
      date: vehicle.technical_control_expiry || null,
      icon: <Wrench className="h-3.5 w-3.5" />,
      color: 'emerald',
      required: true,
    },
    {
      id: 'tachy',
      label: 'Tachygraphe',
      shortLabel: 'Tachy',
      date: vehicle.tachy_control_expiry || null,
      icon: <Gauge className="h-3.5 w-3.5" />,
      color: 'blue',
      required: typeConfig?.requiresTachy ?? false,
    },
    {
      id: 'atp',
      label: 'ATP',
      shortLabel: 'ATP',
      date: vehicle.atp_expiry || null,
      icon: <Snowflake className="h-3.5 w-3.5" />,
      color: 'cyan',
      required: typeConfig?.requiresATP ?? false,
    },
    {
      id: 'adr',
      label: 'ADR',
      shortLabel: 'ADR',
      date: vehicle.adr_certificate_expiry || null,
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      color: 'orange',
      required: false,
    },
  ];

  // Filtrer : toujours afficher CT, les autres seulement si configurés
  const visibleItems = items.filter(item => {
    if (item.id === 'ct') return true;
    if (item.date) return true;
    return false;
  });

  // Calculer le statut global
  const hasExpired = visibleItems.some(item => {
    if (!item.date) return false;
    return differenceInDays(parseISO(item.date), new Date()) < 0;
  });
  
  const hasUrgent = visibleItems.some(item => {
    if (!item.date) return false;
    const days = differenceInDays(parseISO(item.date), new Date());
    return days >= 0 && days < 30;
  });

  return (
    <Card className="border border-slate-700 bg-slate-900/50 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <Calendar className="h-4 w-4 text-cyan-400" />
            Échéances réglementaires
            {typeConfig && (
              <span className="text-xs font-normal text-slate-500">
                {typeConfig.emoji} {typeConfig.label}
              </span>
            )}
          </CardTitle>
          
          {hasExpired && (
            <Badge variant="destructive" className="text-xs h-5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Expiré
            </Badge>
          )}
          {hasUrgent && !hasExpired && (
            <Badge className="bg-orange-500 text-white text-xs h-5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
          {!hasExpired && !hasUrgent && visibleItems.every(i => i.date) && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs h-5">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              À jour
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2">
          {visibleItems.map(item => (
            <RegulatoryItemRow key={item.id} item={item} />
          ))}
        </div>
        
        {/* Récap des périodicités */}
        {typeConfig && (
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700">
            CT {typeConfig.ctPeriodicity}
            {typeConfig.requiresTachy && ' · Tachy 2 ans'}
            {typeConfig.requiresATP && ' · ATP 5 ans'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RegulatoryItemRow({ item }: { item: RegulatoryItem }) {
  const daysLeft = item.date ? differenceInDays(parseISO(item.date), new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 30;

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-emerald-500/10',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-emerald-400',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-emerald-500/30',
    },
    blue: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-blue-500/10',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-blue-400',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-blue-500/30',
    },
    cyan: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-cyan-500/10',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-cyan-400',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-cyan-500/30',
    },
    orange: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-orange-500/10',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-orange-400',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-orange-500/30',
    },
  };

  const colors = colorClasses[item.color];

  if (!item.date) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg border border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-700 text-slate-400">
            {item.icon}
          </div>
          <span className="text-sm text-slate-400">{item.shortLabel}</span>
        </div>
        <span className="text-xs text-slate-500">Non configuré</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg border transition-all',
      colors.bg,
      colors.border
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn('p-1 rounded', colors.bg, colors.text)}>
          {item.icon}
        </div>
        <div className="min-w-0">
          <span className={cn('text-sm font-medium', colors.text)}>
            {item.shortLabel}
          </span>
          <span className="text-xs text-slate-500 ml-2">
            {format(parseISO(item.date), 'dd/MM/yy')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {isExpired ? (
          <span className="text-xs text-red-400 font-medium">
            -{Math.abs(daysLeft)}j
          </span>
        ) : isUrgent ? (
          <span className="text-xs text-orange-400 font-medium">
            {daysLeft}j
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            {daysLeft}j
          </span>
        )}
        
        {isExpired ? (
          <div className="w-2 h-2 rounded-full bg-red-500" />
        ) : isUrgent ? (
          <div className="w-2 h-2 rounded-full bg-orange-500" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </div>
    </div>
  );
}
