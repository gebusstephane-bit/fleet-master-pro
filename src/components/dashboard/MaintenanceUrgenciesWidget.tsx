'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Bell, ChevronRight, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'

const STATUS_CONFIG = {
  overdue: { label: 'Dépassé', color: 'bg-red-500/20 text-red-300 border-red-500/30', dot: 'bg-red-500' },
  due:     { label: 'Imminent', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', dot: 'bg-orange-500' },
  upcoming:{ label: 'À venir', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-500' },
  ok:      { label: 'OK', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' },
}

function formatDue(pred: MaintenancePrediction): string {
  if (pred.kmUntilDue !== null) {
    if (pred.kmUntilDue <= 0) return `Dépassé ${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km`
    return `${pred.kmUntilDue.toLocaleString('fr-FR')} km restants`
  }
  if (pred.daysUntilDue !== null) {
    if (pred.daysUntilDue <= 0) return `Dépassé ${Math.abs(pred.daysUntilDue)}j`
    if (pred.daysUntilDue < 30) return `${pred.daysUntilDue} jours`
    return `${Math.round(pred.daysUntilDue / 30)} mois`
  }
  return 'Jamais effectuée'
}

export function MaintenanceUrgenciesWidget() {
  const [items, setItems] = useState<MaintenancePrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/maintenance-predictions/top')
      .then(r => r.json())
      .then(data => setItems(data.predictions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasOverdue = items.some(p => p.status === 'overdue')

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            {hasOverdue
              ? <AlertCircle className="h-4 w-4 text-red-400" />
              : <Bell className="h-4 w-4 text-yellow-400" />}
            Maintenances à planifier
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Top 5 situations urgentes</p>
        </div>
        <Link
          href="/maintenance-planning"
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
        >
          Voir tout <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Chargement...</span>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Aucune maintenance urgente
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <div
                key={`${item.vehicleId}-${item.ruleId}-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0f172a]/40 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-white font-mono truncate">
                      {item.vehicleName.split(' — ')[0]}
                    </span>
                    <span className="text-xs text-slate-400 truncate hidden sm:block">
                      {item.ruleName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate sm:hidden">
                    {item.ruleName}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-slate-400 hidden md:block">
                    {formatDue(item)}
                  </span>
                  <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', cfg.color)}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
