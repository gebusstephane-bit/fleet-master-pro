/**
 * CRON JOB — Calcul quotidien des prédictions de maintenance préventive
 *
 * Planification : "0 5 * * *" (tous les jours à 5h UTC)
 * Auth          : x-cron-secret header ou ?secret= query param
 *
 * Logique :
 *   1. Récupère tous les véhicules actifs (toutes companies)
 *   2. Pour chaque véhicule, calcule les prédictions via predictMaintenanceForVehicle()
 *   3. UPSERT dans maintenance_predictions (cache)
 *   4. Envoie des notifications in-app pour les statuts due/overdue
 *      → Anti-doublon : pas de renvoi si alert_sent_at < 7 jours
 *   5. Retourne un rapport { processed, alerts_sent, errors }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { predictMaintenanceForVehicle } from '@/lib/maintenance-predictor'

const DEDUP_DAYS = 7

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const errors: string[] = []
  let processed = 0
  let alertsSent = 0

  try {
    // ─── 1. Récupère les véhicules nécessitant un recalcul urgent ───
    // PRIORITÉ 1: Véhicules avec needs_recalculation = true (maintenance récente)
    const { data: urgentVehicles, error: urgentErr } = await supabase
      .from('maintenance_predictions')
      .select('vehicle_id, company_id')
      .eq('needs_recalculation', true)
      .limit(50) // Traiter max 50 véhicules urgents en priorité

    if (urgentErr) errors.push(`urgent query: ${urgentErr.message}`)

    // PRIORITÉ 2: Autres véhicules actifs (si pas assez d'urgents)
    const processedUrgentIds = new Set(urgentVehicles?.map(v => v.vehicle_id) || [])
    const remainingSlots = 100 - (urgentVehicles?.length || 0)
    
    let otherVehicles: { id: string; company_id: string }[] = []
    if (remainingSlots > 0) {
      const { data: regularVehicles, error: vErr } = await supabase
        .from('vehicles')
        .select('id, company_id')
        .eq('status', 'ACTIF')
        .not('id', 'in', `(${(urgentVehicles || []).map(v => v.vehicle_id).join(',')})`)
        .limit(remainingSlots)

      if (vErr) errors.push(`regular query: ${vErr.message}`)
      otherVehicles = regularVehicles || []
    }

    // Combine les deux listes (urgents en premier)
    const urgentWithId = (urgentVehicles || []).map(v => ({ 
      id: v.vehicle_id, 
      company_id: v.company_id,
      isUrgent: true 
    }))
    const vehicles = [...urgentWithId, ...otherVehicles.map(v => ({ ...v, isUrgent: false }))]

    if (!vehicles.length) {
      return NextResponse.json({ processed: 0, alerts_sent: 0, errors: [] })
    }

    // ─── 2. Pour chaque véhicule ─────────────────────────────────────
    for (const vehicle of vehicles) {
      try {
        const predictions = await predictMaintenanceForVehicle(vehicle.id)

        for (const pred of predictions) {
          // ─── 3. UPSERT dans maintenance_predictions ──────────────
          const upsertData = {
            vehicle_id: vehicle.id,
            rule_id: pred.ruleId,
            company_id: vehicle.company_id,
            current_km: pred.currentKm,
            estimated_due_km: pred.estimatedDueKm ?? null,
            estimated_due_date: pred.estimatedDueDate
              ? pred.estimatedDueDate.toISOString().split('T')[0]
              : null,
            km_until_due: pred.kmUntilDue ?? null,
            days_until_due: pred.daysUntilDue ?? null,
            last_maintenance_date: pred.lastMaintenanceDate
              ? pred.lastMaintenanceDate.toISOString().split('T')[0]
              : null,
            last_maintenance_km: pred.lastMaintenanceKm ?? null,
            status: pred.status,
            priority: pred.priority,
            calculated_at: new Date().toISOString(),
            is_initialized: pred.isInitialized,
            // Réinitialiser le flag de recalcul car on vient de calculer
            needs_recalculation: false,
          }

          const { data: existing } = await supabase
            .from('maintenance_predictions')
            .select('id, alert_sent_at')
            .eq('vehicle_id', vehicle.id)
            .eq('rule_id', pred.ruleId)
            .maybeSingle()

          if (existing) {
            await supabase
              .from('maintenance_predictions')
              .update(upsertData)
              .eq('id', existing.id)
          } else {
            await supabase
              .from('maintenance_predictions')
              .insert(upsertData)
          }

          // ─── 4. Notifications in-app (anti-doublon 7j) ──────────
          const shouldAlert =
            (pred.status === 'overdue' || pred.status === 'due') &&
            (() => {
              if (!existing?.alert_sent_at) return true
              const lastAlert = new Date(existing.alert_sent_at)
              const diffDays = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60 * 24)
              return diffDays >= DEDUP_DAYS
            })()

          if (shouldAlert) {
            // Récupère les utilisateurs à notifier (DIRECTEUR + AGENT_DE_PARC + EXPLOITANT)
            const { data: users } = await supabase
              .from('profiles')
              .select('id')
              .eq('company_id', vehicle.company_id)
              .in('role', ['DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT', 'ADMIN'])
              .eq('is_active', true)

            if (users?.length) {
              const notifPriority = pred.priority === 'critical' || pred.priority === 'high'
                ? 'critical'
                : 'high'

              const title = pred.status === 'overdue'
                ? `⛔ Maintenance dépassée — ${pred.vehicleName.split(' — ')[0]}`
                : `⚠️ Maintenance imminente — ${pred.vehicleName.split(' — ')[0]}`

              const message = pred.status === 'overdue'
                ? `${pred.ruleName} — ${pred.kmUntilDue !== null ? `Dépassé de ${Math.abs(pred.kmUntilDue).toLocaleString('fr-FR')} km` : `Dépassé de ${Math.abs(pred.daysUntilDue ?? 0)} jours`}`
                : `${pred.ruleName} — ${pred.kmUntilDue !== null ? `${pred.kmUntilDue.toLocaleString('fr-FR')} km restants` : `${pred.daysUntilDue} jours restants`}`

              const notifs = users.map(u => ({
                user_id: u.id,
                type: 'maintenance_prediction',
                title,
                message,
                link: `/vehicles/${vehicle.id}`,
                priority: notifPriority as 'low' | 'normal' | 'high' | 'critical',
                data: {
                  vehicle_id: vehicle.id,
                  rule_id: pred.ruleId,
                  status: pred.status,
                  priority: pred.priority,
                },
              }))

              await supabase.from('notifications').insert(notifs)

              // Met à jour alert_sent_at
              await supabase
                .from('maintenance_predictions')
                .update({ alert_sent_at: new Date().toISOString() })
                .eq('vehicle_id', vehicle.id)
                .eq('rule_id', pred.ruleId)

              alertsSent++
            }
          }
        }

        processed++
        
        // Si c'était un véhicule urgent, réinitialiser le flag needs_recalculation
        if ((vehicle as any).isUrgent) {
          await supabase
            .from('maintenance_predictions')
            .update({ needs_recalculation: false })
            .eq('vehicle_id', vehicle.id)
        }
      } catch (err: any) {
        errors.push(`vehicle ${vehicle.id}: ${err.message}`)
      }
    }

    return NextResponse.json({ processed, alerts_sent: alertsSent, errors })
  } catch (err: any) {
    return NextResponse.json(
      { processed, alerts_sent: alertsSent, errors: [err.message] },
      { status: 500 }
    )
  }
}
