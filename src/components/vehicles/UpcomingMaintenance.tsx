'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Wrench, AlertCircle, Bell, CheckCircle2, ChevronRight,
  Loader2, History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { safeParseDate, formatDateFR } from '@/lib/date-utils'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'
import Link from 'next/link'
import { InitializeSingleModal } from '@/components/maintenance/InitializeSingleModal'
import { InitializeHistoryModal } from '@/components/maintenance/InitializeHistoryModal'

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
  },
  due: {
    label: 'Imminent',
    icon: AlertCircle,
    iconClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    barClass: 'bg-orange-500',
    borderClass: 'border-l-orange-500',
  },
  upcoming: {
    label: 'À venir',
    icon: Bell,
    iconClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    barClass: 'bg-yellow-500',
    borderClass: 'border-l-yellow-500',
  },
  ok: {
    label: 'OK',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    barClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
  },
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'CRITIQUE',
  high: 'HAUTE',
  medium: 'MOYENNE',
  low: 'BASSE',
}

const PRIORITY_CLASSES: Record<string, string> = {
  critical: 'text-red-400 font-bold',
  high: 'text-orange-400 font-semibold',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
}

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
  autre: 'Autre',
}

function formatKmDue(pred: MaintenancePrediction): string {
  if (pred.kmUntilDue === null) return ''
  if (pred.kmUntilDue <= 0) return `Dépassé de ${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km`
  return `Dans ${pred.kmUntilDue.toLocaleString('fr-FR')} km`
}

function formatDaysDue(pred: MaintenancePrediction): string {
  if (pred.daysUntilDue === null) return ''
  if (pred.daysUntilDue <= 0) return `Dépassé de ${Math.abs(pred.daysUntilDue)} jours`
  if (pred.daysUntilDue < 30) return `Dans ${pred.daysUntilDue} jours`
  const months = Math.round(pred.daysUntilDue / 30)
  return `Dans ${months} mois`
}

function formatLastTime(pred: MaintenancePrediction): string {
  if (!pred.lastMaintenanceDate && !pred.lastMaintenanceKm) return ''
  const parts: string[] = []
  if (pred.lastMaintenanceKm) parts.push(`à ${pred.lastMaintenanceKm.toLocaleString('fr-FR')} km`)
  const date = safeParseDate(pred.lastMaintenanceDate)
  if (date) {
    parts.push(`le ${formatDateFR(date)}`)
  }
  return parts.join(' · ')
}

// ──────────────────────────────────────────────────────────────
// Carte d'une prédiction
// ──────────────────────────────────────────────────────────────
interface ItemProps {
  pred: MaintenancePrediction
  vehicleId: string
  vehicleCurrentKm: number
  onInitializeSingle: (pred: MaintenancePrediction) => void
}

function PredictionItem({ pred, vehicleId, vehicleCurrentKm, onInitializeSingle }: ItemProps) {
  const cfg = STATUS_CONFIG[pred.status]
  const Icon = cfg.icon
  const barColor = pred.usagePercent >= 100 ? 'bg-red-500'
    : pred.usagePercent >= 80 ? 'bg-yellow-500'
    : 'bg-emerald-500'

  const isNeverDone = !pred.lastMaintenanceDate && !pred.lastMaintenanceKm

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#0f172a]/40 border-l-4 p-4 space-y-3',
        cfg.borderClass
      )}
    >
      {/* Ligne 1 : priorité + nom règle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn('h-4 w-4 shrink-0', cfg.iconClass)} />
          <span className="font-medium text-white text-sm leading-tight truncate">
            {pred.ruleName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs', PRIORITY_CLASSES[pred.priority])}>
            {PRIORITY_LABELS[pred.priority]}
          </span>
          <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', cfg.badgeClass)}>
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Ligne 2 : catégorie + délais */}
      <div className="text-xs text-slate-400 space-y-0.5">
        <div className="flex items-center gap-2">
          <span>{CATEGORY_LABELS[pred.category] ?? pred.category}</span>
          {pred.isInitialized && (
            <span className="text-slate-600 italic">· Initialisé manuellement</span>
          )}
        </div>

        {/* "Jamais effectuée" → cliquable pour initialisation individuelle */}
        {isNeverDone ? (
          <button
            className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
            onClick={() => onInitializeSingle(pred)}
          >
            Jamais effectuée — Initialiser
          </button>
        ) : (
          <div className="text-slate-500">Dernière fois : {formatLastTime(pred)}</div>
        )}

        <div className={cn('font-medium', pred.status === 'overdue' ? 'text-red-400' : pred.status === 'due' ? 'text-orange-400' : 'text-yellow-300')}>
          {pred.kmUntilDue !== null && <span>{formatKmDue(pred)}</span>}
          {pred.kmUntilDue !== null && pred.daysUntilDue !== null && <span> · </span>}
          {pred.daysUntilDue !== null && <span>{formatDaysDue(pred)}</span>}
          {pred.kmUntilDue === null && pred.daysUntilDue === null && !isNeverDone && <span>—</span>}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Intervalle consommé</span>
          <span className={pred.usagePercent >= 100 ? 'text-red-400 font-medium' : ''}>
            {pred.usagePercent}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(100, pred.usagePercent)}%` }}
          />
        </div>
      </div>

      {/* Bouton planifier */}
      <div className="flex justify-end">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Link href={`/maintenance/new?vehicleId=${vehicleId}&from_prediction=1&rule_id=${encodeURIComponent(pred.ruleId)}&rule_name=${encodeURIComponent(pred.ruleName)}&category=${pred.category}`}>
            Planifier
            <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget principal
// ──────────────────────────────────────────────────────────────
interface Props {
  vehicleId: string
}

export function UpcomingMaintenance({ vehicleId }: Props) {
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Modales
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPred, setSelectedPred] = useState<MaintenancePrediction | null>(null)
  // Mode 'init' = seulement les maintenances jamais faites, 'update' = toutes les maintenances actionables
  const [modalMode, setModalMode] = useState<'init' | 'update'>('init')

  const fetchPredictions = useCallback(() => {
    if (!vehicleId) return
    setLoading(true)
    fetch(`/api/vehicles/${vehicleId}/maintenance-predictions`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setPredictions(data.predictions ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Afficher toutes les prédictions, triées par statut et priorité
  // Les maintenances 'ok' sont affichées en dernier
  const sortedPredictions = [...predictions].sort((a, b) => {
    const statusOrder = { overdue: 0, due: 1, upcoming: 2, ok: 3 }
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  
  // Filtrer: d'abord les actionable (pas 'ok'), puis les 3 premières 'ok' pour ne pas surcharger
  const actionable = sortedPredictions.filter((p, index) => {
    if (p.status !== 'ok') return true
    // Afficher max 3 maintenances 'ok' pour ne pas surcharger l'interface
    const okCount = sortedPredictions.slice(0, index).filter(x => x.status === 'ok').length
    return okCount < 3
  })
  const vehicleCurrentKm = predictions[0]?.currentKm ?? 0

  // Prédictions "jamais faites" (sans historique, non initialisées)
  const neverDone = actionable.filter(p => !p.lastMaintenanceDate && !p.lastMaintenanceKm && !p.isInitialized)
  const hasNeverDone = neverDone.length > 0

  return (
    <>
      <Card className="bg-[#0d1526]/80 border border-white/10 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <Wrench className="h-5 w-5 text-cyan-400" />
            Maintenances préventives
            <div className="ml-auto flex items-center gap-2">
              {/* Bouton initialisation globale — visible si ≥1 prédiction "jamais faite" OU si on veut réinitialiser */}
              {(hasNeverDone || predictions.length > 0) && !loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalMode(hasNeverDone ? 'init' : 'update')
                    setShowHistoryModal(true)
                  }}
                  className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                  title={hasNeverDone ? "Initialiser l'historique" : "Mettre à jour l'historique"}
                >
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  {hasNeverDone ? "Initialiser l'historique" : "Mettre à jour"}
                </Button>
              )}
              {actionable.length > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 border text-xs">
                  {actionable.length} alerte{actionable.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Calcul des prédictions...
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-6 text-red-400 text-sm">{error}</div>
          )}

          {!loading && !error && actionable.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-emerald-300 font-medium text-sm">
                Ce véhicule est à jour sur les maintenances préventives.
              </p>
              <p className="text-slate-500 text-xs">
                {predictions.length} règle{predictions.length > 1 ? 's' : ''} vérifiée{predictions.length > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {!loading && !error && actionable.length > 0 && (
            <>
              {actionable.map(pred => (
                <PredictionItem
                  key={pred.ruleId}
                  pred={pred}
                  vehicleId={vehicleId}
                  vehicleCurrentKm={vehicleCurrentKm}
                  onInitializeSingle={p => setSelectedPred(p)}
                />
              ))}
              <div className="pt-1 text-center">
                <Link
                  href="/maintenance-planning"
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Voir le planning global →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modale initialisation individuelle */}
      {selectedPred && (
        <InitializeSingleModal
          open={!!selectedPred}
          onOpenChange={open => { if (!open) setSelectedPred(null) }}
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
    </>
  )
}
