'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertCircle, Bell, CheckCircle2, ChevronRight,
  Filter, Loader2, Wrench, X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'

// ──────────────────────────────────────────────────────────────
// Config affichage
// ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  overdue:  { label: 'Dépassé',  color: 'bg-red-500/20 text-red-300 border-red-500/30',     dot: 'bg-red-500',     Icon: AlertCircle },
  due:      { label: 'Imminent', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', dot: 'bg-orange-500', Icon: AlertCircle },
  upcoming: { label: 'À venir',  color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-500', Icon: Bell },
  ok:       { label: 'OK',       color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500', Icon: CheckCircle2 },
}

const PRIORITY_CFG: Record<string, string> = {
  critical: 'text-red-400 font-bold',
  high:     'text-orange-400 font-semibold',
  medium:   'text-yellow-400',
  low:      'text-slate-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse',
}

const CATEGORY_LABELS: Record<string, string> = {
  moteur: 'Moteur', filtration: 'Filtration', freinage: 'Freinage',
  transmission: 'Transmission', suspension: 'Suspension', electricite: 'Électricité',
  carrosserie: 'Carrosserie', refrigeration: 'Réfrigération', attelage: 'Attelage',
  pneumatique: 'Pneumatiques', reglementaire: 'Réglementaire', autre: 'Autre',
}

function formatDue(pred: MaintenancePrediction): string {
  if (pred.kmUntilDue !== null) {
    if (pred.kmUntilDue <= 0) return `−${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km`
    return `+${pred.kmUntilDue.toLocaleString('fr-FR')} km`
  }
  if (pred.daysUntilDue !== null) {
    if (pred.daysUntilDue <= 0) return `−${Math.abs(pred.daysUntilDue)} j`
    if (pred.daysUntilDue < 30) return `+${pred.daysUntilDue} j`
    return `+${Math.round(pred.daysUntilDue / 30)} mois`
  }
  return '—'
}

function formatEstimatedDate(pred: MaintenancePrediction): string {
  if (pred.estimatedDueDate) {
    return new Date(pred.estimatedDueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (pred.estimatedDueKm) {
    return `${pred.estimatedDueKm.toLocaleString('fr-FR')} km`
  }
  return '—'
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────
export default function MaintenancePlanningPage() {
  const [all, setAll] = useState<MaintenancePrediction[]>([])
  const [loading, setLoading] = useState(true)

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/maintenance-predictions/all')
      .then(r => r.json())
      .then(d => setAll(d.predictions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return all.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false
      return true
    })
  }, [all, statusFilter, categoryFilter, priorityFilter])

  const stats = useMemo(() => ({
    overdue:  all.filter(p => p.status === 'overdue').length,
    due:      all.filter(p => p.status === 'due').length,
    upcoming: all.filter(p => p.status === 'upcoming').length,
    total:    all.filter(p => p.status !== 'ok').length,
  }), [all])

  const categories = useMemo(() =>
    Array.from(new Set(all.map(p => p.category))).sort(),
    [all]
  )

  const hasFilters = statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wrench className="h-6 w-6 text-cyan-400" />
          Planning maintenance préventive
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Règles kilométriques et temporelles pour toute la flotte
        </p>
      </div>

      {/* Compteurs statut */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Dépassés', count: stats.overdue, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Imminents', count: stats.due,     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'À venir',   count: stats.upcoming, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Total urgences', count: stats.total, color: 'text-white', bg: 'bg-white/5 border-white/10' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <div className={cn('text-2xl font-bold', s.color)}>{s.count}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm bg-[#0d1526] border-white/10 text-white">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1526] border-white/10">
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="overdue">Dépassé</SelectItem>
            <SelectItem value="due">Imminent</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 h-8 text-sm bg-[#0d1526] border-white/10 text-white">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1526] border-white/10">
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 h-8 text-sm bg-[#0d1526] border-white/10 text-white">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1526] border-white/10">
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-slate-400 hover:text-white"
            onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setPriorityFilter('all') }}
          >
            <X className="h-3 w-3 mr-1" />
            Réinitialiser
          </Button>
        )}

        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <Card className="bg-[#0d1526]/80 border border-white/10">
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Chargement des prédictions...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-500 gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-50" />
              <p>Aucune maintenance à planifier avec ces filtres</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Véhicule</th>
                    <th className="text-left px-4 py-3 font-medium">Maintenance</th>
                    <th className="text-left px-4 py-3 font-medium">Catégorie</th>
                    <th className="text-left px-4 py-3 font-medium">Priorité</th>
                    <th className="text-left px-4 py-3 font-medium">Statut</th>
                    <th className="text-left px-4 py-3 font-medium">Délai / Échéance</th>
                    <th className="text-left px-4 py-3 font-medium">Date / KM estimé</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pred, i) => {
                    const scfg = STATUS_CFG[pred.status]
                    const Icon = scfg.Icon
                    return (
                      <tr
                        key={`${pred.vehicleId}-${pred.ruleId}`}
                        className={cn(
                          'border-b border-white/5 hover:bg-white/5 transition-colors',
                          i % 2 === 0 ? '' : 'bg-white/[0.02]'
                        )}
                      >
                        {/* Véhicule */}
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-white">
                            {pred.vehicleName.split(' — ')[0]}
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {pred.vehicleName.split(' — ').slice(1).join(' — ')}
                          </div>
                        </td>

                        {/* Nom règle */}
                        <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                          {pred.ruleName}
                        </td>

                        {/* Catégorie */}
                        <td className="px-4 py-3 text-slate-400">
                          {CATEGORY_LABELS[pred.category] ?? pred.category}
                        </td>

                        {/* Priorité */}
                        <td className={cn('px-4 py-3', PRIORITY_CFG[pred.priority])}>
                          {PRIORITY_LABELS[pred.priority] ?? pred.priority}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs border', scfg.color)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {scfg.label}
                          </Badge>
                        </td>

                        {/* Délai */}
                        <td className={cn(
                          'px-4 py-3 font-mono text-sm font-medium',
                          pred.status === 'overdue' ? 'text-red-400' :
                          pred.status === 'due'     ? 'text-orange-400' :
                          pred.status === 'upcoming'? 'text-yellow-400' : 'text-slate-400'
                        )}>
                          {formatDue(pred)}
                        </td>

                        {/* Échéance estimée */}
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {formatEstimatedDate(pred)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                          >
                            <Link href={`/vehicles/${pred.vehicleId}?tab=maintenance`}>
                              Planifier
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lien paramètres règles */}
      <div className="text-center">
        <Link
          href="/settings/maintenance-rules"
          className="text-xs text-slate-400 hover:text-cyan-400 transition-colors hover:underline"
        >
          Configurer les règles de maintenance personnalisées →
        </Link>
      </div>
    </div>
  )
}
