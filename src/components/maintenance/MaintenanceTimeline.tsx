'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { CheckCircle2, AlertCircle, Bell, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateFR } from '@/lib/date-utils'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'

interface MaintenanceRecord {
  id: string
  description: string
  status: string
  mileage_at_maintenance?: number
  completed_at?: string
  service_date?: string
}

interface MaintenanceTimelineProps {
  vehicleId: string
  vehicleCurrentKm: number
}

interface TimelineItem {
  id: string
  type: 'past' | 'today' | 'future'
  title: string
  km?: number | null
  date?: Date | null
  status?: 'ok' | 'upcoming' | 'due' | 'overdue'
  isCompleted?: boolean
}

export function MaintenanceTimeline({ vehicleId, vehicleCurrentKm }: MaintenanceTimelineProps) {
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch predictions (futur)
        const predRes = await fetch(`/api/vehicles/${vehicleId}/maintenance-predictions`)
        const predData = await predRes.json()
        setPredictions(predData.predictions ?? [])

        // Fetch maintenance records (passé)
        const recRes = await fetch(`/api/vehicles/${vehicleId}/maintenance-history`)
        const recData = await recRes.json()
        setRecords(recData.maintenances?.filter((m: any) => m.status === 'TERMINEE') ?? [])
      } catch (error) {
        console.error('Error fetching timeline data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vehicleId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-400">Chargement de la timeline...</div>
      </div>
    )
  }

  // Construire la liste des items de la timeline
  const pastItems: TimelineItem[] = records
    .slice(0, 10)
    .map((record) => ({
      id: record.id,
      type: 'past' as const,
      title: record.description.split(' ').slice(0, 3).join(' ') + '...',
      km: record.mileage_at_maintenance,
      date: record.completed_at ? new Date(record.completed_at) : null,
      isCompleted: true,
    }))
    .sort((a, b) => (b.km ?? 0) - (a.km ?? 0))

  const futureItems: TimelineItem[] = predictions
    .slice(0, 10)
    .map((pred) => ({
      id: pred.ruleId,
      type: 'future' as const,
      title: pred.ruleName,
      km: pred.estimatedDueKm,
      date: pred.estimatedDueDate,
      status: pred.status,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))

  const todayItem: TimelineItem = {
    id: 'today',
    type: 'today',
    title: 'Aujourd\'hui',
    km: vehicleCurrentKm,
    date: new Date(),
  }

  // Combiner : passé (inversé pour ordre chronologique) + aujourd'hui + futur
  const allItems = [...pastItems.reverse(), todayItem, ...futureItems]

  if (allItems.length <= 1) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Aucune donnée de maintenance disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Effectué</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-dashed border-slate-400" />
          <span>Aujourd'hui</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span> critique</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>À faire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>À prévoir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span>Planifié</span>
        </div>
      </div>

      {/* Timeline horizontale */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-4 pt-2 px-2">
          {/* Flèche passé */}
          <div className="flex items-center text-slate-500 text-xs shrink-0">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Passé</span>
          </div>

          {/* Items */}
          {allItems.map((item, index) => (
            <TimelineNode
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === allItems.length - 1}
            />
          ))}

          {/* Flèche futur */}
          <div className="flex items-center text-slate-500 text-xs shrink-0">
            <span className="hidden sm:inline">Futur</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Info du véhicule actuel */}
      <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-700/50 pt-4">
        <span>Kilométrage actuel</span>
        <span className="font-mono text-white">{vehicleCurrentKm.toLocaleString('fr-FR')} km</span>
      </div>
    </div>
  )
}

function TimelineNode({
  item,
  isFirst,
  isLast,
}: {
  item: TimelineItem
  isFirst: boolean
  isLast: boolean
}) {
  // Configuration visuelle selon le type
  const config = {
    past: {
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400',
      icon: CheckCircle2,
      dot: 'bg-emerald-500',
    },
    today: {
      bg: 'bg-slate-800',
      border: 'border-dashed border-slate-400',
      text: 'text-slate-300',
      icon: Calendar,
      dot: 'bg-transparent border-2 border-dashed border-slate-400',
    },
    future: {
      ok: {
        bg: 'bg-slate-800',
        border: 'border-slate-600',
        text: 'text-slate-400',
        icon: Calendar,
        dot: 'bg-slate-500',
      },
      upcoming: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: Bell,
        dot: 'bg-yellow-500',
      },
      due: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: AlertCircle,
        dot: 'bg-orange-500',
      },
      overdue: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: AlertCircle,
        dot: 'bg-red-500',
      },
    },
  }

  const style =
    item.type === 'past'
      ? config.past
      : item.type === 'today'
        ? config.today
        : config.future[item.status ?? 'ok']

  const Icon = style.icon

  return (
    <div className="flex items-center shrink-0">
      {/* Ligne de connexion (gauche) */}
      {!isFirst && <div className="w-4 h-0.5 bg-slate-700" />}

      {/* Node */}
      <div
        className={cn(
          'relative flex flex-col items-center p-3 rounded-xl border min-w-[120px] max-w-[160px] transition-all hover:scale-105',
          style.bg,
          style.border
        )}
      >
        {/* Dot indicateur */}
        <div
          className={cn(
            'absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-[#0f172a]',
            style.dot
          )}
        />

        {/* Icon */}
        <Icon className={cn('h-5 w-5 mb-2', style.text)} />

        {/* Title */}
        <p className={cn('text-xs font-medium text-center line-clamp-2 mb-1', style.text)}>
          {item.title}
        </p>

        {/* KM */}
        {item.km !== null && item.km !== undefined && (
          <p className="text-[10px] text-slate-500 font-mono">{item.km.toLocaleString('fr-FR')} km</p>
        )}

        {/* Date */}
        {item.date && item.type !== 'today' && (
          <p className="text-[10px] text-slate-600">{formatDateFR(item.date)}</p>
        )}

        {/* Badge spécial pour aujourd'hui */}
        {item.type === 'today' && (
          <Badge variant="outline" className="text-[10px] mt-1 border-slate-600 text-slate-400">
            Maintenant
          </Badge>
        )}
      </div>

      {/* Ligne de connexion (droite) */}
      {!isLast && <div className="w-4 h-0.5 bg-slate-700" />}
    </div>
  )
}
