/**
 * RegulatoryTimeline - Affichage compact des échéances réglementaires en ligne
 * Utilise le composant RegulatoryDatesCard existant mais en version timeline
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Wrench,
  Gauge,
  Snowflake,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { vehicleTypeConfig, type VehicleType } from '@/lib/vehicle/calculate-dates';

interface RegulatoryTimelineProps {
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
  lastDate: string | null;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'cyan' | 'orange';
  required: boolean;
  description: string;
}

export function RegulatoryTimeline({ vehicle }: RegulatoryTimelineProps) {
  const vehicleType = vehicle.type as VehicleType | undefined;
  const typeConfig = vehicleType ? vehicleTypeConfig[vehicleType] : null;

  // Construire la liste des échéances
  const items: RegulatoryItem[] = [
    {
      id: 'ct',
      label: 'Contrôle Technique',
      shortLabel: 'CT',
      date: vehicle.technical_control_expiry || null,
      lastDate: vehicle.technical_control_date || null,
      icon: <Wrench className="h-4 w-4" />,
      color: 'green',
      required: true,
      description: typeConfig ? `Périodicité: ${typeConfig.ctPeriodicity}` : 'Périodicité selon type',
    },
    {
      id: 'tachy',
      label: 'Tachygraphe',
      shortLabel: 'Tachy',
      date: vehicle.tachy_control_expiry || null,
      lastDate: vehicle.tachy_control_date || null,
      icon: <Gauge className="h-4 w-4" />,
      color: 'blue',
      required: typeConfig?.requiresTachy ?? false,
      description: 'Vérification tous les 2 ans',
    },
    {
      id: 'atp',
      label: 'ATP Frigorifique',
      shortLabel: 'ATP',
      date: vehicle.atp_expiry || null,
      lastDate: vehicle.atp_date || null,
      icon: <Snowflake className="h-4 w-4" />,
      color: 'cyan',
      required: typeConfig?.requiresATP ?? false,
      description: 'Attestation transporteur frigorifique',
    },
    {
      id: 'adr',
      label: 'Certificat ADR',
      shortLabel: 'ADR',
      date: vehicle.adr_certificate_expiry || null,
      lastDate: vehicle.adr_certificate_date || null,
      icon: <ShieldAlert className="h-4 w-4" />,
      color: 'orange',
      required: false, // Dépend de l'activité, pas seulement du type
      description: 'Matières dangereuses',
    },
  ];

  // Filtrer : toujours afficher CT, les autres seulement si requis ou configurés
  const visibleItems = items.filter(item => {
    if (item.id === 'ct') return true; // CT toujours visible
    if (item.date) return true; // Si une date est configurée, afficher
    if (item.required) return true; // Si requis pour le type, afficher
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

  const globalStatus = hasExpired ? 'expired' : hasUrgent ? 'urgent' : 'ok';

  return (
    <Card className="border border-slate-700 bg-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-cyan-400" />
            Échéances réglementaires
            {typeConfig && (
              <span className="text-sm font-normal text-slate-400">
                {typeConfig.emoji} {typeConfig.label}
              </span>
            )}
          </CardTitle>
          
          {/* Badge de statut global */}
          {globalStatus === 'expired' && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Expiré
            </Badge>
          )}
          {globalStatus === 'urgent' && (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              <Clock className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
          {globalStatus === 'ok' && visibleItems.every(i => i.date) && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              À jour
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Version ligne/desktop */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleItems.map(item => (
            <RegulatoryItemCard key={item.id} item={item} />
          ))}
        </div>
        
        {/* Version mobile/stack */}
        <div className="md:hidden space-y-2">
          {visibleItems.map(item => (
            <RegulatoryItemRow key={item.id} item={item} />
          ))}
        </div>
        
        {/* Message si des échéances requises sont manquantes */}
        {visibleItems.some(item => item.required && !item.date) && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-xs text-amber-400/80 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Certaines échéances requises ne sont pas configurées. 
              <a href="#" className="underline hover:text-amber-300">Compléter la fiche</a>
            </p>
          </div>
        )}
        
        {/* Récap des périodicités */}
        {typeConfig && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              <Info className="h-3 w-3 inline mr-1" />
              <strong>Périodicités {typeConfig.label}:</strong>
              <span className="ml-2">
                CT {typeConfig.ctPeriodicity}
                {typeConfig.requiresTachy && ' · Tachy 2 ans'}
                {typeConfig.requiresATP && ' · ATP 5 ans'}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegulatoryItemCard({ item }: { item: RegulatoryItem }) {
  const daysLeft = item.date ? differenceInDays(parseISO(item.date), new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 30;
  const isWarning = daysLeft !== null && daysLeft >= 30 && daysLeft < 60;

  const colorClasses = {
    green: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-emerald-500/10',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-emerald-500/30',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-emerald-400',
      icon: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-emerald-400',
    },
    blue: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-blue-500/10',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-blue-500/30',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-blue-400',
      icon: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-blue-400',
    },
    cyan: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-cyan-500/10',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-cyan-500/30',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-cyan-400',
      icon: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-cyan-400',
    },
    orange: {
      bg: isExpired ? 'bg-red-500/10' : isUrgent ? 'bg-orange-500/10' : 'bg-orange-500/10',
      border: isExpired ? 'border-red-500/30' : isUrgent ? 'border-orange-500/30' : 'border-orange-500/30',
      text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-orange-400',
      icon: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-orange-400',
    },
  };

  const colors = colorClasses[item.color];

  if (!item.date) {
    return (
      <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded bg-slate-700 text-slate-400">
            {item.icon}
          </div>
          <span className="font-medium text-slate-400 text-sm">{item.shortLabel}</span>
        </div>
        <p className="text-xs text-slate-500">Non configuré</p>
        {item.required && (
          <Badge variant="outline" className="mt-2 text-xs border-amber-500/30 text-amber-400">
            Requis
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all',
      colors.bg,
      colors.border
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded', colors.bg, colors.icon)}>
            {item.icon}
          </div>
          <span className={cn('font-medium text-sm', colors.text)}>{item.shortLabel}</span>
        </div>
        {isExpired ? (
          <Badge variant="destructive" className="text-xs">Expiré</Badge>
        ) : isUrgent ? (
          <Badge className="bg-orange-500 text-white text-xs">{daysLeft}j</Badge>
        ) : (
          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">OK</Badge>
        )}
      </div>
      
      <p className={cn('text-lg font-bold', colors.text)}>
        {format(parseISO(item.date), 'dd/MM/yyyy')}
      </p>
      
      <p className="text-xs text-slate-400 mt-1">
        {isExpired ? (
          <span className="text-red-400">Expiré depuis {Math.abs(daysLeft)} jours</span>
        ) : isUrgent ? (
          <span className="text-orange-400">Expire dans {daysLeft} jours</span>
        ) : isWarning ? (
          <span>Expire dans {daysLeft} jours</span>
        ) : (
          <span>Valide encore {daysLeft} jours</span>
        )}
      </p>
      
      {item.lastDate && (
        <p className="text-xs text-slate-500 mt-1">
          Dernier: {format(parseISO(item.lastDate), 'dd/MM/yyyy')}
        </p>
      )}
    </div>
  );
}

function RegulatoryItemRow({ item }: { item: RegulatoryItem }) {
  const daysLeft = item.date ? differenceInDays(parseISO(item.date), new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 30;

  const colorClasses = {
    green: { text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-emerald-400' },
    blue: { text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-blue-400' },
    cyan: { text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-cyan-400' },
    orange: { text: isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-orange-400' },
  };

  const colors = colorClasses[item.color];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/30">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-slate-700 text-slate-400">
          {item.icon}
        </div>
        <div>
          <p className="font-medium text-white text-sm">{item.label}</p>
          {!item.date ? (
            <p className="text-xs text-slate-500">Non configuré</p>
          ) : (
            <p className={cn('text-xs', colors.text)}>
              {format(parseISO(item.date), 'dd/MM/yyyy')}
              {isExpired ? ` (expiré depuis ${Math.abs(daysLeft!)}j)` : 
               isUrgent ? ` (dans ${daysLeft}j)` : ` (${daysLeft}j restants)`}
            </p>
          )}
        </div>
      </div>
      
      {!item.date ? (
        item.required && (
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
            Requis
          </Badge>
        )
      ) : isExpired ? (
        <Badge variant="destructive" className="text-xs">Expiré</Badge>
      ) : isUrgent ? (
        <Badge className="bg-orange-500 text-white text-xs">Urgent</Badge>
      ) : (
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">OK</Badge>
      )}
    </div>
  );
}
