'use client';

/**
 * CriticalAlertBanner - Header critique avec la VRAIE prédiction la plus urgente
 * Remplace le faux calcul "15000 - (mileage % 15000)"
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { MaintenancePrediction } from '@/lib/maintenance-predictor';

interface CriticalAlertBannerProps {
  vehicleId: string;
  vehicleMileage: number;
}

const STATUS_CONFIG = {
  overdue: {
    label: 'Dépassé',
    icon: AlertCircle,
    iconClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
    borderClass: 'border-red-500/30',
    bgClass: 'bg-red-950/20',
    urgency: 'critical',
  },
  due: {
    label: 'Imminent',
    icon: AlertTriangle,
    iconClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    borderClass: 'border-orange-500/30',
    bgClass: 'bg-orange-950/20',
    urgency: 'high',
  },
  upcoming: {
    label: 'À venir',
    icon: Info,
    iconClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    borderClass: 'border-yellow-500/30',
    bgClass: 'bg-yellow-950/20',
    urgency: 'medium',
  },
  ok: {
    label: 'OK',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-950/20',
    urgency: 'low',
  },
};

const CATEGORY_EMOJI: Record<string, string> = {
  moteur: '🔧',
  filtration: '🫗',
  freinage: '🛑',
  transmission: '⚙️',
  suspension: '🔩',
  electricite: '⚡',
  carrosserie: '🚛',
  refrigeration: '❄️',
  attelage: '🪝',
  pneumatique: '🛞',
  reglementaire: '📋',
  roulement: '🔘',
  geometrie: '📐',
  bequilles: '🔺',
  securite: '🛡️',
  structure: '🏗️',
  divers: '📦',
  conteneur: '☸️',
  autre: '🔧',
};

function formatUrgency(pred: MaintenancePrediction): string {
  const parts: string[] = [];
  
  if (pred.kmUntilDue !== null) {
    if (pred.kmUntilDue <= 0) {
      parts.push(`Dépassé de ${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km`);
    } else {
      parts.push(`Due dans ${pred.kmUntilDue.toLocaleString('fr-FR')} km`);
    }
  }
  
  if (pred.daysUntilDue !== null) {
    if (pred.daysUntilDue <= 0) {
      parts.push(`(${Math.abs(pred.daysUntilDue)} jours)`);
    } else if (pred.daysUntilDue < 30) {
      parts.push(`(${pred.daysUntilDue} jours)`);
    } else {
      const months = Math.round(pred.daysUntilDue / 30);
      parts.push(`(${months} mois)`);
    }
  }
  
  return parts.join(' ');
}

export function CriticalAlertBanner({ vehicleId, vehicleMileage }: CriticalAlertBannerProps) {
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(() => {
    if (!vehicleId) return;
    setLoading(true);
    
    fetch(`/api/vehicles/${vehicleId}/maintenance-predictions`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPredictions(data.predictions ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  if (loading) {
    return (
      <Card className="border border-slate-700 bg-slate-900/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-slate-400">Analyse des échéances...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-700/30 bg-red-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-300">Erreur de chargement des prédictions</span>
        </CardContent>
      </Card>
    );
  }

  // Trouver la prédiction la plus urgente
  const critical = predictions
    .filter(p => p.status === 'overdue' || p.status === 'due')
    .sort((a, b) => {
      // Priorité au statut overdue, puis aux km restants
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      return (a.kmUntilDue ?? Infinity) - (b.kmUntilDue ?? Infinity);
    })[0];

  // Si pas de critique, prendre la plus urgente des upcoming
  const nextMaintenance = critical || predictions
    .filter(p => p.status === 'upcoming')
    .sort((a, b) => (a.kmUntilDue ?? Infinity) - (b.kmUntilDue ?? Infinity))[0];

  // Si aucune prédiction du tout
  if (predictions.length === 0) {
    return (
      <Card className="border border-amber-700/30 bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Info className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-200">Aucune échéance planifiée</p>
                <p className="text-sm text-amber-400/70">
                  Vérifiez les initialisations des maintenances préventives
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-300 hover:bg-amber-950/30"
            >
              <Link href={`/vehicles/${vehicleId}/edit`}>
                Configurer
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si aucune maintenance urgente mais des OK
  if (!nextMaintenance) {
    const okCount = predictions.filter(p => p.status === 'ok').length;
    return (
      <Card className="border border-emerald-700/30 bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-emerald-200">✅ Véhicule à jour</p>
              <p className="text-sm text-emerald-400/70">
                {okCount} maintenance{okCount > 1 ? 's' : ''} préventive{okCount > 1 ? 's' : ''} suivie{okCount > 1 ? 's' : ''} · Aucune échéance imminente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Afficher la prédiction la plus urgente
  const cfg = STATUS_CONFIG[nextMaintenance.status];
  const Icon = cfg.icon;
  const emoji = CATEGORY_EMOJI[nextMaintenance.category] || '🔧';
  
  // Déterminer l'icône globale selon l'urgence réelle
  const isHighlyUrgent = 
    (nextMaintenance.kmUntilDue !== null && nextMaintenance.kmUntilDue < 1000) ||
    (nextMaintenance.daysUntilDue !== null && nextMaintenance.daysUntilDue < 7);
  
  const UrgencyIcon = isHighlyUrgent ? AlertCircle : cfg.icon;
  const urgencyColor = isHighlyUrgent ? 'text-red-400' : cfg.iconClass;

  return (
    <Card className={cn(
      'border transition-all',
      cfg.borderClass,
      cfg.bgClass,
      isHighlyUrgent && 'ring-2 ring-red-500/20 animate-pulse'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn('p-2 rounded-lg shrink-0', 
              isHighlyUrgent ? 'bg-red-500/20' : cfg.bgClass
            )}>
              <UrgencyIcon className={cn('h-6 w-6', urgencyColor)} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-white truncate">
                  {emoji} {nextMaintenance.ruleName}
                </span>
                <Badge variant="outline" className={cn('text-xs', cfg.badgeClass)}>
                  {cfg.label}
                </Badge>
                {isHighlyUrgent && (
                  <Badge className="bg-red-500 text-white text-xs animate-pulse">
                    🚨 CRITIQUE
                  </Badge>
                )}
              </div>
              
              <p className={cn(
                'text-sm font-medium mt-0.5',
                isHighlyUrgent ? 'text-red-300' : 
                nextMaintenance.status === 'due' ? 'text-orange-300' : 'text-yellow-300'
              )}>
                {formatUrgency(nextMaintenance)}
              </p>
              
              {nextMaintenance.usagePercent > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-slate-700/60 overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all',
                        nextMaintenance.usagePercent >= 100 ? 'bg-red-500' :
                        nextMaintenance.usagePercent >= 80 ? 'bg-orange-500' :
                        'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(100, nextMaintenance.usagePercent)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{nextMaintenance.usagePercent}%</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              className={cn(
                'h-9',
                isHighlyUrgent 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : nextMaintenance.status === 'due'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              )}
            >
              <Link href={`/maintenance/new?vehicleId=${vehicleId}&from_prediction=1&rule_id=${encodeURIComponent(nextMaintenance.ruleId)}&rule_name=${encodeURIComponent(nextMaintenance.ruleName)}&category=${nextMaintenance.category}`}>
                <Wrench className="h-4 w-4 mr-1.5" />
                Planifier
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Si critique, afficher le nombre d'autres alertes */}
        {critical && predictions.filter(p => p.status === 'overdue' || p.status === 'due').length > 1 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400">
              + {predictions.filter(p => p.status === 'overdue' || p.status === 'due').length - 1} autre{predictions.filter(p => p.status === 'overdue' || p.status === 'due').length > 2 ? 's' : ''} alerte{predictions.filter(p => p.status === 'overdue' || p.status === 'due').length > 2 ? 's' : ''} en attente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
