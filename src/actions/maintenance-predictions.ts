'use server'

/**
 * Actions serveur pour l'initialisation manuelle de l'historique maintenance
 * PROMPT #13-C — FleetMaster Pro
 *
 * Cas d'usage : véhicule neuf ou repris sans historique.
 * Permet de remettre le compteur à zéro sans créer de faux maintenance_records.
 * Les données d'initialisation sont stockées dans maintenance_predictions avec
 * is_initialized=true et utilisées comme fallback par le prédicateur.
 */

import { createClient } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────
// Initialiser UNE prédiction individuelle
// ──────────────────────────────────────────────────────────────
export async function initializePrediction(params: {
  vehicleId: string
  ruleId: string
  lastDoneKm?: number        // km exact de la dernière intervention (optionnel)
  lastDoneDate?: string      // date exacte YYYY-MM-DD (optionnel)
  approximateOnly?: boolean  // true = km actuel comme ancre, date = aujourd'hui
  notes?: string
}): Promise<{
  success?: boolean
  error?: string
  next_due_km?: number | null
  next_due_date?: string | null
}> {
  const supabase = await createClient()

  // Vérification auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Récupérer le véhicule (km actuel + company_id)
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('mileage, company_id')
    .eq('id', params.vehicleId)
    .single()

  if (!vehicle) return { error: 'Véhicule introuvable' }

  // Récupérer la règle pour calculer les prochaines échéances
  const { data: rule } = await supabase
    .from('maintenance_rules')
    .select('id, name, priority, interval_km, interval_months, trigger_type')
    .eq('id', params.ruleId)
    .single()

  if (!rule) return { error: 'Règle introuvable' }

  // Ancre de référence
  const referenceDate =
    params.lastDoneDate ?? new Date().toISOString().split('T')[0]
  const referenceKm =
    params.approximateOnly
      ? (vehicle.mileage ?? null)
      : (params.lastDoneKm ?? null)

  // Calcul prochaine échéance km
  let next_due_km: number | null = null
  if ((rule as any).interval_km && referenceKm !== null) {
    next_due_km = referenceKm + (rule as any).interval_km
  }

  // Calcul prochaine échéance date
  let next_due_date: string | null = null
  if ((rule as any).interval_months) {
    const nd = new Date(referenceDate)
    nd.setMonth(nd.getMonth() + (rule as any).interval_months)
    next_due_date = nd.toISOString().split('T')[0]
  }

  // km_until_due et days_until_due pour cohérence du cache
  const currentKm = vehicle.mileage ?? 0
  const km_until_due = next_due_km !== null ? next_due_km - currentKm : null
  const days_until_due = next_due_date !== null
    ? Math.round((new Date(next_due_date).getTime() - Date.now()) / 86_400_000)
    : null

  // Détermination du statut
  let status: 'ok' | 'upcoming' | 'due' | 'overdue' = 'ok'
  const alertKm = (rule as any).alert_km_before ?? 2000
  const alertDays = (rule as any).alert_days_before ?? 30
  if ((km_until_due !== null && km_until_due <= 0) || (days_until_due !== null && days_until_due <= 0)) {
    status = 'overdue'
  } else if ((km_until_due !== null && km_until_due <= alertKm / 2) || (days_until_due !== null && days_until_due <= alertDays / 2)) {
    status = 'due'
  } else if ((km_until_due !== null && km_until_due <= alertKm) || (days_until_due !== null && days_until_due <= alertDays)) {
    status = 'upcoming'
  }

  const upsertData = {
    vehicle_id: params.vehicleId,
    rule_id: params.ruleId,
    company_id: vehicle.company_id,
    current_km: currentKm,
    last_maintenance_km: referenceKm,
    last_maintenance_date: referenceDate,
    estimated_due_km: next_due_km,
    estimated_due_date: next_due_date,
    km_until_due,
    days_until_due,
    status: status as 'ok' | 'upcoming' | 'due' | 'overdue',
    priority: (rule.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
    is_initialized: true,
    initialization_note: params.notes ?? 'Initialisé manuellement',
    alert_sent_at: null,
    calculated_at: new Date().toISOString(),
  }

  // Vérifier si une entrée existe déjà pour ce vehicle+rule
  const { data: existing } = await supabase
    .from('maintenance_predictions')
    .select('id')
    .eq('vehicle_id', params.vehicleId)
    .eq('rule_id', params.ruleId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('maintenance_predictions')
      .update(upsertData)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('maintenance_predictions')
      .insert(upsertData)
    if (error) return { error: error.message }
  }

  return { success: true, next_due_km, next_due_date }
}

// ──────────────────────────────────────────────────────────────
// Initialiser TOUTES les prédictions sélectionnées d'un véhicule
// ──────────────────────────────────────────────────────────────
export async function initializeAllPredictions(params: {
  vehicleId: string
  entries: {
    ruleId: string
    lastDoneKm?: number
    lastDoneDate?: string
    approximateOnly?: boolean
    skip?: boolean
  }[]
}): Promise<{ succeeded: number; failed: number }> {
  const toProcess = params.entries.filter(e => !e.skip)

  const results = await Promise.allSettled(
    toProcess.map(e =>
      initializePrediction({
        vehicleId: params.vehicleId,
        ruleId: e.ruleId,
        lastDoneKm: e.lastDoneKm,
        lastDoneDate: e.lastDoneDate,
        approximateOnly: e.approximateOnly ?? (!e.lastDoneKm && !e.lastDoneDate),
        notes: 'Initialisé lors de la reprise du véhicule',
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled' && !(r.value as any).error).length
  const failed = results.length - succeeded
  return { succeeded, failed }
}
