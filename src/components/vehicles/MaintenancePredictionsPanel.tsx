'use client';

/**
 * MaintenancePredictionsPanel - Version remontée et améliorée de UpcomingMaintenance
 * Affiche les maintenances préventives en priorité sur la page véhicule
 * 
 * Contrainte: Conserver la logique API de UpcomingMaintenance, améliorer le layout
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wrench, AlertCircle, Bell, CheckCircle2, ChevronRight,
  Loader2, History, Filter, Calendar, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeParseDate, formatDateFR } from '@/lib/date-utils';
import type { MaintenancePrediction } from '@/lib/maintenance-predictor';
import Link from 'next/link';
import { InitializeSingleModal } from '@/components/maintenance/InitializeSingleModal';
import { InitializeHistoryModal } from '@/components/maintenance/InitializeHistoryModal';

// ──────────────────────────────────────────────────────────────
// Config affichage selon le statut
// ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  overdue: {
    label: 'Dépassé',
    icon: AlertCircle,
    iconClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
    barClass: 'bg-red-500',
    borderClass: 'border-l-red-500',
    bgClass: 'bg-red-950/10',
  },
  due: {
    label: 'Imminent',
    icon: AlertCircle,
    iconClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    barClass: 'bg-orange-500',
    borderClass: 'border-l-orange-500',
    bgClass: 'bg-orange-950/10',
  },
  upcoming: {
    label: 'À venir',
    icon: Bell,
    iconClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    barClass: 'bg-yellow-500',
    borderClass: 'border-l-yellow-500',
    bgClass: 'bg-yellow-950/10',
  },
  ok: {
    label: 'OK',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    barClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
    bgClass: 'bg-emerald-950/10',
  },
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'CRITIQUE',
  high: 'HAUTE',
  medium: 'MOYENNE',
  low: 'BASSE',
};

const PRIORITY_CLASSES: Record<string, string> = {
  critical: 'text-red-400 font-bold',
  high: 'text-orange-400 font-semibold',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  moteur: 'Moteur',
  filtration: 'Filtration',
  freinage: 'Freinage',
  transmission: 'Transmission',
  suspension: 'Suspension',
  electricite: 'Électricité',
  carrosserie: 'Carrosserie',
  refrigeration: 'Réfrigération',
  attelage: 'Attelage',
  pneumatique: 'Pneumatiques',
  reglementaire: 'Réglementaire',
  roulement: 'Roulement',
  geometrie: 'Géométrie',
  bequilles: 'Béquilles',
  securite: 'Sécurité',
  structure: 'Structure',
  divers: 'Divers',
  conteneur: 'Conteneur',
  autre: 'Autre',
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  chassis: ['moteur', 'filtration', 'freinage', 'transmission', 'suspension', 'pneumatique', 'roulement', 'geometrie'],
  frigo: ['refrigeration'],
  securite: ['electricite', 'securite', 'attelage', 'bequilles'],
  structure: ['carrosserie', 'structure', 'divers', 'conteneur'],
  reglementaire: ['reglementaire'],
  autre: ['autre'],
};

const GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  all: { label: 'Tous', icon: '🔧' },
  chassis: { label: 'Châssis', icon: '⚙️' },
  frigo: { label: 'Frigo', icon: '❄️' },
  securite: { label: 'Sécurité', icon: '🛡️' },
  structure: { label: 'Structure', icon: '🏗️' },
  reglementaire: { label: 'Réglementaire', icon: '📋' },
  autre: { label: 'Autre', icon: '🔧' },
};

function formatKmDue(pred: MaintenancePrediction): string {
  if (pred.kmUntilDue === null) return '';
  if (pred.kmUntilDue <= 0) return `Dépassé de ${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km`;
  return `${pred.kmUntilDue.toLocaleString('fr-FR')} km restants`;
}

function formatDaysDue(pred: MaintenancePrediction): string {
  if (pred.daysUntilDue === null) return '';
  if (pred.daysUntilDue <= 0) return `Dépassé de ${Math.abs(pred.daysUntilDue)} jours`;
  if (pred.daysUntilDue < 30) return `${pred.daysUntilDue} jours`;
  const months = Math.round(pred.daysUntilDue / 30);
  return `${months} mois`;
}

function formatLastTime(pred: MaintenancePrediction): string {
  if (!pred.lastMaintenanceDate && !pred.lastMaintenanceKm) return '';
  const parts: string[] = [];
  if (pred.lastMaintenanceKm) parts.push(`${pred.lastMaintenanceKm.toLocaleString('fr-FR')} km`);
  const date = safeParseDate(pred.lastMaintenanceDate);
  if (date) {
    parts.push(formatDateFR(date));
  }
  return parts.join(' · ');
}

// ──────────────────────────────────────────────────────────────
// Carte d'une prédiction (version améliorée)
// ──────────────────────────────────────────────────────────────
interface ItemProps {
  pred: MaintenancePrediction;
  vehicleId: string;
  vehicleCurrentKm: number;
  onInitializeSingle: (pred: MaintenancePrediction) => void;
}

function PredictionItem({ pred, vehicleId, vehicleCurrentKm, onInitializeSingle }: ItemProps) {
  const cfg = STATUS_CONFIG[pred.status];
  const Icon = cfg.icon;
  const barColor = pred.usagePercent >= 100 ? 'bg-red-500'
    : pred.usagePercent >= 80 ? 'bg-orange-500'
    : 'bg-emerald-500';

  const isNeverDone = !pred.lastMaintenanceDate && !pred.lastMaintenanceKm;

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#0f172a]/60 border-l-4 p-4 space-y-3 transition-all hover:bg-[#0f172a]/80',
        cfg.borderClass,
        cfg.bgClass
      )}
    >
      {/* Ligne 1 : priorité + nom règle + badge statut */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className={cn('h-5 w-5 shrink-0', cfg.iconClass)} />
          <div className="min-w-0">
            <p className="font-semibold text-white text-base leading-tight truncate">
              {pred.ruleName}
            </p>
            <p className="text-xs text-slate-400">
              {CATEGORY_LABELS[pred.category] ?? pred.category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs', PRIORITY_CLASSES[pred.priority])}>
            {PRIORITY_LABELS[pred.priority]}
          </span>
          <Badge variant="outline" className={cn('text-xs border', cfg.badgeClass)}>
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Ligne 2 : échéances détaillées */}
      <div className="flex items-center gap-4 text-sm">
        {pred.kmUntilDue !== null && (
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-slate-400" />
            <span className={cn(
              'font-medium',
              pred.kmUntilDue <= 0 ? 'text-red-400' : 
              pred.kmUntilDue <= 2000 ? 'text-orange-400' : 'text-slate-200'
            )}>
              {formatKmDue(pred)}
            </span>
          </div>
        )}
        
        {pred.daysUntilDue !== null && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className={cn(
              'font-medium',
              pred.daysUntilDue <= 0 ? 'text-red-400' : 
              pred.daysUntilDue <= 14 ? 'text-orange-400' : 'text-slate-200'
            )}>
              {formatDaysDue(pred)}
            </span>
          </div>
        )}
      </div>

      {/* Barre de progression avec % */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">
            {isNeverDone ? (
              <button
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
                onClick={() => onInitializeSingle(pred)}
              >
                Jamais effectuée — Initialiser
              </button>
            ) : (
              <span className="text-slate-500">
                Dernier: {formatLastTime(pred)}
                {pred.isInitialized && <span className="text-slate-600 italic ml-1">(Initialisé)</span>}
              </span>
            )}
          </span>
          <span className={pred.usagePercent >= 80 ? 'text-red-400 font-medium' : 'text-slate-400'}>
            {pred.usagePercent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(100, pred.usagePercent)}%` }}
          />
        </div>
      </div>

      {/* Bouton planifier */}
      <div className="flex justify-end pt-1">
        <Button
          asChild
          size="sm"
          variant={pred.status === 'overdue' || pred.status === 'due' ? 'default' : 'outline'}
          className={cn(
            'h-8 text-sm',
            pred.status === 'overdue' ? 'bg-red-500 hover:bg-red-600 text-white' :
            pred.status === 'due' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
            'border-slate-600 text-slate-200 hover:bg-slate-700'
          )}
        >
          <Link href={`/maintenance/new?vehicleId=${vehicleId}&from_prediction=1&rule_id=${encodeURIComponent(pred.ruleId)}&rule_name=${encodeURIComponent(pred.ruleName)}&category=${pred.category}`}>
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            Planifier
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Panel principal
// ──────────────────────────────────────────────────────────────
interface Props {
  vehicleId: string;
  className?: string;
}

export function MaintenancePredictionsPanel({ vehicleId, className }: Props) {
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPred, setSelectedPred] = useState<MaintenancePrediction | null>(null);
  const [modalMode, setModalMode] = useState<'init' | 'update'>('init');

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
  }, [fetchPredictions, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Filtrer par groupe
  const filteredPredictions = filter === 'all' 
    ? predictions 
    : predictions.filter(p => CATEGORY_GROUPS[filter]?.includes(p.category));

  // Trier : overdue > due > upcoming > ok, puis par priorité
  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    const statusOrder = { overdue: 0, due: 1, upcoming: 2, ok: 3 };
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const vehicleCurrentKm = predictions[0]?.currentKm ?? 0;

  // Prédictions "jamais faites"
  const neverDone = sortedPredictions.filter(p => 
    !p.lastMaintenanceDate && !p.lastMaintenanceKm && !p.isInitialized
  );
  const hasNeverDone = neverDone.length > 0;

  // Statistiques
  const stats = {
    overdue: predictions.filter(p => p.status === 'overdue').length,
    due: predictions.filter(p => p.status === 'due').length,
    upcoming: predictions.filter(p => p.status === 'upcoming').length,
    ok: predictions.filter(p => p.status === 'ok').length,
  };

  // Groupes disponibles (qui ont des prédictions)
  const availableGroups = Object.entries(CATEGORY_GROUPS)
    .filter(([group, categories]) => 
      group === 'all' || predictions.some(p => categories.includes(p.category))
    )
    .map(([group]) => group);

  return (
    <Card className={cn('border border-slate-700 bg-slate-900/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white text-base">
              Maintenances préventives
            </CardTitle>
            {(stats.overdue > 0 || stats.due > 0) && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                {stats.overdue + stats.due} alerte{stats.overdue + stats.due > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bouton initialisation */}
            {(hasNeverDone || predictions.length > 0) && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalMode(hasNeverDone ? 'init' : 'update');
                  setShowHistoryModal(true);
                }}
                className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                {hasNeverDone ? 'Initialiser' : 'Mettre à jour'}
              </Button>
            )}
          </div>
        </div>

        {/* Filtres par groupe */}
        {predictions.length > 0 && (
          <Tabs value={filter} onValueChange={setFilter} className="mt-3">
            <TabsList className="flex h-9 items-center gap-1 rounded-lg bg-slate-800/50 p-1 border border-slate-700 w-fit flex-wrap h-auto">
              {availableGroups.map(group => (
                <TabsTrigger
                  key={group}
                  value={group}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 h-7"
                >
                  <span>{GROUP_LABELS[group]?.icon}</span>
                  <span className="hidden sm:inline">{GROUP_LABELS[group]?.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Statistiques rapides */}
        {predictions.length > 0 && !loading && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            {stats.overdue > 0 && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {stats.overdue} dépassée{stats.overdue > 1 ? 's' : ''}
              </span>
            )}
            {stats.due > 0 && (
              <span className="text-orange-400 flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {stats.due} imminente{stats.due > 1 ? 's' : ''}
              </span>
            )}
            {stats.upcoming > 0 && (
              <span className="text-yellow-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {stats.upcoming} à venir
              </span>
            )}
            <span className="text-slate-500 ml-auto">
              {predictions.length} règle{predictions.length > 1 ? 's' : ''} suivie{predictions.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Analyse des maintenances...
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-8 text-red-400 text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {error}
          </div>
        )}

        {!loading && !error && sortedPredictions.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="text-emerald-300 font-medium">
              {filter === 'all' 
                ? 'Ce véhicule est à jour sur les maintenances préventives.'
                : 'Aucune maintenance dans cette catégorie.'}
            </p>
            {filter !== 'all' && (
              <Button variant="link" size="sm" onClick={() => setFilter('all')} className="text-cyan-400">
                Voir toutes les maintenances
              </Button>
            )}
          </div>
        )}

        {!loading && !error && sortedPredictions.length > 0 && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {sortedPredictions.map(pred => (
              <PredictionItem
                key={pred.ruleId}
                pred={pred}
                vehicleId={vehicleId}
                vehicleCurrentKm={vehicleCurrentKm}
                onInitializeSingle={p => setSelectedPred(p)}
              />
            ))}
          </div>
        )}

        {/* Lien vers planning global */}
        {!loading && predictions.length > 0 && (
          <div className="pt-3 border-t border-slate-700 text-center">
            <Link
              href="/maintenance-planning"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Voir le planning global de maintenance →
            </Link>
          </div>
        )}
      </CardContent>

      {/* Modale initialisation individuelle */}
      {selectedPred && (
        <InitializeSingleModal
          open={!!selectedPred}
          onOpenChange={open => { if (!open) setSelectedPred(null); }}
          prediction={selectedPred}
          vehicleCurrentKm={vehicleCurrentKm}
          onInitialized={handleRefresh}
        />
      )}

      {/* Modale initialisation globale */}
      <InitializeHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        vehicleId={vehicleId}
        vehicleCurrentKm={vehicleCurrentKm}
        predictions={modalMode === 'init' ? neverDone : predictions}
        onInitialized={handleRefresh}
      />
    </Card>
  );
}
