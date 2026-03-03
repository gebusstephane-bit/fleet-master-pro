'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, ChevronRight, AlertCircle, Bell, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceStats {
  overdue: number
  due: number
  upcoming: number
  ok: number
}

interface VehicleAlert {
  vehicleId: string
  registrationNumber: string
  brand: string
  model: string
  criticalCount: number
  topAlert: string
  topAlertStatus: 'overdue' | 'due' | 'upcoming'
}

const STATUS_CONFIG = {
  overdue: {
    label: 'Critiques',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: AlertCircle,
    dot: 'bg-red-500',
  },
  due: {
    label: 'À faire',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: Clock,
    dot: 'bg-orange-500',
  },
  upcoming: {
    label: 'À prévoir',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: Bell,
    dot: 'bg-yellow-500',
  },
  ok: {
    label: 'OK',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
}

export function MaintenanceFleetOverview() {
  const [stats, setStats] = useState<MaintenanceStats>({ overdue: 0, due: 0, upcoming: 0, ok: 0 })
  const [topVehicles, setTopVehicles] = useState<VehicleAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()

        // Get current user's company
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) return
        setCompanyId(profile.company_id)

        // Fetch all predictions for this company
        const { data: predictions } = await supabase
          .from('maintenance_predictions')
          .select(
            `
            status,
            rule_name:maintenance_rules(name),
            vehicle:vehicles(id, registration_number, brand, model)
          `
          )
          .eq('company_id', profile.company_id)

        if (!predictions) return

        // Calculate stats
        const newStats = predictions.reduce(
          (acc, pred) => {
            acc[pred.status as keyof MaintenanceStats]++
            return acc
          },
          { overdue: 0, due: 0, upcoming: 0, ok: 0 }
        )
        setStats(newStats)

        // Calculate top 3 vehicles with most urgent alerts
        const vehicleMap = new Map<string, VehicleAlert>()

        predictions
          .filter((p) => p.status === 'overdue' || p.status === 'due')
          .forEach((pred: any) => {
            const v = pred.vehicle
            if (!v) return

            const existing = vehicleMap.get(v.id)
            if (existing) {
              existing.criticalCount++
              // Keep the most severe status
              if (pred.status === 'overdue' && existing.topAlertStatus !== 'overdue') {
                existing.topAlert = pred.rule_name?.name || 'Maintenance requise'
                existing.topAlertStatus = 'overdue'
              }
            } else {
              vehicleMap.set(v.id, {
                vehicleId: v.id,
                registrationNumber: v.registration_number,
                brand: v.brand,
                model: v.model,
                criticalCount: 1,
                topAlert: pred.rule_name?.name || 'Maintenance requise',
                topAlertStatus: pred.status,
              })
            }
          })

        // Sort by critical count and take top 3
        const sorted = Array.from(vehicleMap.values())
          .sort((a, b) => b.criticalCount - a.criticalCount)
          .slice(0, 3)

        setTopVehicles(sorted)
      } catch (error) {
        console.error('Error fetching maintenance fleet overview:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="bg-[#0d1526]/80 border-white/10">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/3" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalAlerts = stats.overdue + stats.due + stats.upcoming

  return (
    <Card className="bg-[#0d1526]/80 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white text-base">Maintenance flotte</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-cyan-400 hover:text-cyan-300">
            <Link href="/maintenance">
              Voir tout
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Les 4 compteurs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(STATUS_CONFIG) as Array<keyof MaintenanceStats>).map((status) => {
            const config = STATUS_CONFIG[status]
            const Icon = config.icon
            const count = stats[status]

            return (
              <div
                key={status}
                className={cn(
                  'flex flex-col items-center p-3 rounded-xl border',
                  config.color
                )}
              >
                <span className="text-2xl font-bold">{count}</span>
                <Icon className="h-5 w-5 my-1 opacity-80" />
                <span className="text-xs font-medium opacity-80">{config.label}</span>
              </div>
            )
          })}
        </div>

        {/* Top 3 véhicules urgents */}
        {topVehicles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-400">Top véhicules urgents</h4>
            <div className="space-y-2">
              {topVehicles.map((vehicle) => (
                <Link
                  key={vehicle.vehicleId}
                  href={`/vehicles/${vehicle.vehicleId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#0f172a]/40 border border-white/5 hover:border-cyan-500/30 hover:bg-[#0f172a]/60 transition-all"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      vehicle.topAlertStatus === 'overdue' ? 'bg-red-500' : 'bg-orange-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {vehicle.registrationNumber.toUpperCase()}
                      </span>
                      {vehicle.criticalCount > 1 && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1">
                          {vehicle.criticalCount} alertes
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{vehicle.topAlert}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Message si tout va bien */}
        {topVehicles.length === 0 && totalAlerts === 0 && (
          <div className="text-center py-4 text-slate-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm">Tous les véhicules sont à jour</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
