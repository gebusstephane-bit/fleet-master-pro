/**
 * Moteur de prédiction de maintenance préventive
 * Prompt #13 V2 — FleetMaster Pro
 *
 * - Lit les règles de maintenance (système + personnalisées)
 * - Cherche la dernière maintenance correspondante par mots-clés dans `description`
 * - Calcule l'échéance et le statut (ok / upcoming / due / overdue)
 */

import { createClient } from '@/lib/supabase/server'

export interface MaintenancePrediction {
  vehicleId: string
  vehicleName: string         // ex: "AB-123-CD — Renault Kangoo"
  ruleId: string
  ruleName: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'

  lastMaintenanceDate: Date | null
  lastMaintenanceKm: number | null
  currentKm: number

  estimatedDueDate: Date | null
  estimatedDueKm: number | null
  kmUntilDue: number | null
  daysUntilDue: number | null

  /** 0-100+ : % de l'intervalle consommé (pour barre de progression) */
  usagePercent: number

  status: 'ok' | 'upcoming' | 'due' | 'overdue'

  /** Infos règle (utiles pour les modales d'initialisation) */
  triggerType: 'km' | 'time' | 'both'
  intervalKm: number | null
  intervalMonths: number | null

  /** true si les données viennent d'une initialisation manuelle et non d'un vrai maintenance_record */
  isInitialized: boolean
}

// ──────────────────────────────────────────────────────────────
// Mots-clés par catégorie pour matcher les maintenances existantes
// Le champ recherché est `description` (pas de champ `title` dans maintenance_records)
// ──────────────────────────────────────────────────────────────
const RULE_KEYWORDS: Record<string, string[]> = {
  moteur:        ['vidange', 'huile moteur', 'refroidissement', 'liquide', 'courroie', 'distribution'],
  filtration:    ['filtre', 'adblue', 'scr', 'filter'],
  freinage:      ['frein', 'garniture', 'plaquette', 'disque', 'tambour', 'abs', 'ebs'],
  transmission:  ['boite', 'boîte', 'embrayage', 'pont', 'differentiel', 'différentiel', 'transmission'],
  attelage:      ['cinquieme roue', 'cinquième roue', 'pivot', 'kingpin', 'béquille', 'bequille', 'attelage'],
  refrigeration: ['groupe froid', 'groupe frigorifique', 'froid', 'frigo', 'refriger', 'frigorigene', 'frigorigène', 'atp'],
  suspension:    ['suspension', 'soufflet', 'amortisseur', 'roulement', 'moyeu'],
  electricite:   ['faisceau', 'electrique', 'électrique', 'eclairage', 'éclairage', 'feu', 'clignotant'],
  carrosserie:   ['chassis', 'châssis', 'longeron', 'caisse', 'porte', 'ridelle'],
  pneumatique:   ['pneu', 'pneumatique', 'gomme', 'roue'],
  reglementaire: ['controle technique', 'contrôle technique', 'tachygraphe', 'tachy', 'atp'],
  autre:         [],
  // Nouvelles catégories pour remorques spécifiques (2026-03-08)
  roulement:     ['moyeu', 'roulement', 'joint spi', 'graissage train'],
  geometrie:     ['alignement', 'parallélisme', 'geometrie', 'géométrie'],
  bequilles:     ['béquille', 'bequille', 'vérin', 'verin', 'pied', 'support'],
  securite:      ['ebs', 'abs', 'diagnostic', 'iso 7638'],
  structure:     ['soudure', 'fissure', 'corrosion', 'longeron'],
  divers:        ['extincteur', 'sangle', 'arrimage', 'barre', 'rail'],
  conteneur:     ['twistlock', 'verrou tournant', 'coin conteneur'],
}

// ──────────────────────────────────────────────────────────────
// Prédicateur pour UN véhicule
// Utilisé par : page détail véhicule + cron quotidien
// ──────────────────────────────────────────────────────────────
export async function predictMaintenanceForVehicle(
  vehicleId: string,
  onlyActionable = false   // si true : ne retourne que upcoming/due/overdue
): Promise<MaintenancePrediction[]> {
  const supabase = await createClient()

  // 1. Infos du véhicule
  // NOTE: Récupération des dates réglementaires pour fallback (CT, Tachygraphe)
  const { data: vehicle, error: vErr } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model, type, detailed_type, fuel_type, mileage, purchase_date, created_at, technical_control_date, tachy_control_date, atp_date')
    .eq('id', vehicleId)
    .single()

  if (vErr || !vehicle) return []

  const currentKm = vehicle.mileage ?? 0

  // 2. Règles applicables (système + règles perso de la company)
  // Filtre : type véhicule dans applicable_vehicle_types (ou null = tous)
  // Rétrocompatibilité : Si detailed_type existe et diffère de type, on l'ajoute au filtre
  // pour matcher les règles spécifiques (ex: REMORQUE_TAUTLINER en plus de REMORQUE)
  const orConditions = [
    `applicable_vehicle_types.cs.{"${vehicle.type}"}`,
    `applicable_vehicle_types.is.null`
  ]
  
  if (vehicle.detailed_type && vehicle.detailed_type !== vehicle.type) {
    orConditions.push(`applicable_vehicle_types.cs.{"${vehicle.detailed_type}"}`)
  }
  
  const { data: rules, error: rErr } = await supabase
    .from('maintenance_rules')
    .select('*')
    .eq('is_active', true)
    .or(orConditions.join(','))

  if (rErr || !rules?.length) return []

  // Pré-charger les prédictions initialisées manuellement pour ce véhicule
  // (utilisé comme fallback si aucun maintenance_record ne correspond à une règle)
  const { data: initializedRecs } = await supabase
    .from('maintenance_predictions')
    .select('rule_id, last_maintenance_km, last_maintenance_date')
    .eq('vehicle_id', vehicleId)
    .eq('is_initialized', true)
  const initMap = new Map(
    (initializedRecs ?? []).map(p => [p.rule_id as string, p])
  )

  const predictions: MaintenancePrediction[] = []

  for (const rule of rules) {
    // 3. Cherche la dernière maintenance terminée correspondant à cette règle
    const keywords = RULE_KEYWORDS[rule.category as string] ?? [rule.name.toLowerCase()]
    const orFilter = keywords.map(k => `description.ilike.%${k}%`).join(',')

    const { data: lastMaint } = await supabase
      .from('maintenance_records')
      .select('id, created_at, mileage_at_maintenance, description')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'TERMINEE')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let lastKm: number | null = lastMaint?.mileage_at_maintenance ?? null
    let lastDate: Date | null = lastMaint?.created_at ? new Date(lastMaint.created_at) : null
    let isInitialized = false

    // Si aucune intervention réelle trouvée, vérifier s'il y a une initialisation manuelle
    if (!lastMaint) {
      const init = initMap.get(rule.id as string)
      if (init) {
        lastKm = init.last_maintenance_km ?? null
        lastDate = init.last_maintenance_date ? new Date(init.last_maintenance_date) : null
        isInitialized = true
      }
    }

    // PRIORITÉ AUX DATES DU VÉHICULE pour CT/Tachygraphe/ATP
    // Si les champs technical_control_date, tachy_control_date ou atp_date sont renseignés sur le véhicule,
    // ils prennent le pas sur les initialisations manuelles (source de vérité)
    const ruleNameLower = (rule.name as string).toLowerCase()
    const isCT = ruleNameLower.includes('contrôle technique') || ruleNameLower.includes('controle technique')
    const isTachy = ruleNameLower.includes('tachygraphe') || ruleNameLower.includes('tachy')
    const isATP = ruleNameLower.includes('atp') || ruleNameLower.includes('attestation transporteur')
    
    if (!lastMaint && (isCT || isTachy || isATP)) {
      if (isCT && vehicle.technical_control_date) {
        // Utiliser la date du véhicule même si une initialisation manuelle existe
        lastDate = new Date(vehicle.technical_control_date)
        isInitialized = true
      }
      if (isTachy && vehicle.tachy_control_date) {
        lastDate = new Date(vehicle.tachy_control_date)
        isInitialized = true
      }
      if (isATP && vehicle.atp_date) {
        lastDate = new Date(vehicle.atp_date)
        isInitialized = true
      }
    }

    const triggerType: 'km' | 'time' | 'both' =
      rule.interval_km && rule.interval_months ? 'both' :
      rule.interval_km ? 'km' : 'time'

    // Gestion des véhicules neufs (jamais de maintenance faite)
    // Si le véhicule a une date d'achat OU date de création récente, on l'utilise comme point de départ (0%)
    // Cela évite d'afficher "100% dépassé" pour un véhicule neuf de 1050 km
    let isNewVehicle = false
    if (!lastMaint && !isInitialized && !lastDate) {
      // Priorité 1: purchase_date si disponible
      // Priorité 2: created_at (date d'ajout dans le système) - véhicule neuf créé récemment
      const referenceDate = vehicle.purchase_date || vehicle.created_at
      if (referenceDate) {
        lastDate = new Date(referenceDate)
        lastKm = 0 // Véhicule neuf = on part de 0 km
        isNewVehicle = true // Marquer comme véhicule neuf pour la logique de statut
        // On ne met PAS isInitialized = true car ce n'est pas une vraie maintenance,
        // juste un point de départ logique pour le calcul
      }
    }

    // 4. Calcul des échéances
    let estimatedDueKm: number | null = null
    let estimatedDueDate: Date | null = null
    let kmUntilDue: number | null = null
    let daysUntilDue: number | null = null
    let usagePercent = 0

    if (rule.interval_km && lastKm !== null) {
      estimatedDueKm = lastKm + rule.interval_km
      kmUntilDue = estimatedDueKm - currentKm
      usagePercent = Math.min(120, Math.round(((currentKm - lastKm) / rule.interval_km) * 100))
    }

    if (rule.interval_months && lastDate) {
      estimatedDueDate = new Date(lastDate)
      estimatedDueDate.setMonth(estimatedDueDate.getMonth() + (rule.interval_months as number))
      const now = new Date()
      daysUntilDue = Math.round(
        (estimatedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (!usagePercent) {
        const totalDays = (rule.interval_months as number) * 30
        const elapsedDays = Math.round(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        usagePercent = Math.min(120, Math.round((elapsedDays / totalDays) * 100))
      }
    }

    // Si vraiment aucune donnée ni date d'achat ni date de création → overdue avec 100% (véhicule inconnu)
    if (!lastMaint && !isInitialized && !lastDate && !vehicle.purchase_date && !vehicle.created_at) {
      usagePercent = 100
    }

    // 5. Statut
    const alertKm = (rule.alert_km_before as number) ?? 2000
    const alertDays = (rule.alert_days_before as number) ?? 30

    const isKmOverdue   = kmUntilDue !== null && kmUntilDue <= 0
    const isDateOverdue = daysUntilDue !== null && daysUntilDue <= 0
    const isKmDue       = kmUntilDue !== null && kmUntilDue > 0 && kmUntilDue <= alertKm / 2
    const isDateDue     = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= alertDays / 2
    const isKmUpcoming  = kmUntilDue !== null && kmUntilDue > 0 && kmUntilDue <= alertKm
    const isDateUpcoming = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= alertDays

    let status: 'ok' | 'upcoming' | 'due' | 'overdue' = 'ok'
    // "Jamais fait" sans initialisation et sans date de référence = overdue
    // Si on a une date (purchase_date ou created_at), on calcule normalement
    // CORRECTION P1: Véhicule neuf ne doit jamais être "overdue" - forcer "upcoming" max
    if (isKmOverdue || isDateOverdue) {
      // Si c'est un véhicule neuf, on ne doit pas afficher "overdue"
      if (isNewVehicle) {
        status = 'upcoming'
      } else {
        status = 'overdue'
      }
    } else if (!lastMaint && !isInitialized && !lastDate && !isNewVehicle) {
      // Aucune donnée ET ce n'est pas un véhicule neuf → overdue
      status = 'overdue'
    } else if (isKmDue || isDateDue) {
      status = 'due'
    } else if (isKmUpcoming || isDateUpcoming) {
      status = 'upcoming'
    }

    if (onlyActionable && status === 'ok') continue

    predictions.push({
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.registration_number?.toUpperCase()} — ${vehicle.brand} ${vehicle.model}`,
      ruleId: rule.id as string,
      ruleName: rule.name as string,
      category: rule.category as string,
      priority: rule.priority as 'low' | 'medium' | 'high' | 'critical',
      lastMaintenanceDate: lastDate,
      lastMaintenanceKm: lastKm,
      currentKm,
      estimatedDueDate,
      estimatedDueKm,
      kmUntilDue,
      daysUntilDue,
      usagePercent,
      status,
      triggerType,
      intervalKm: (rule.interval_km as number | null) ?? null,
      intervalMonths: (rule.interval_months as number | null) ?? null,
      isInitialized,
    })
  }

  // Tri : overdue > due > upcoming > ok, puis par priorité
  const statusOrder = { overdue: 0, due: 1, upcoming: 2, ok: 3 }
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

  return predictions.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status]
    if (s !== 0) return s
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ──────────────────────────────────────────────────────────────
// Prédicateur GLOBAL pour le dashboard (top N urgences, toute flotte)
// Utilisé uniquement côté client via un hook ou API route
// ──────────────────────────────────────────────────────────────
export async function predictTopUrgencies(
  companyId: string,
  limit = 5
): Promise<MaintenancePrediction[]> {
  const supabase = await createClient()

  // Lire depuis le cache maintenance_predictions (alimenté par le cron)
  const { data: predictions } = await supabase
    .from('maintenance_predictions')
    .select(`
      id,
      vehicle_id,
      rule_id,
      current_km,
      estimated_due_km,
      estimated_due_date,
      km_until_due,
      days_until_due,
      status,
      priority,
      last_maintenance_date,
      last_maintenance_km,
      vehicles ( registration_number, brand, model ),
      maintenance_rules ( name, category )
    `)
    .eq('company_id', companyId)
    .in('status', ['overdue', 'due', 'upcoming'])
    .order('status', { ascending: true })
    .order('priority', { ascending: true })
    .limit(limit)

  if (!predictions?.length) return []

  return predictions.map((p: any) => ({
    vehicleId: p.vehicle_id,
    vehicleName: `${p.vehicles?.registration_number?.toUpperCase() ?? '?'} — ${p.vehicles?.brand ?? ''} ${p.vehicles?.model ?? ''}`,
    ruleId: p.rule_id,
    ruleName: p.maintenance_rules?.name ?? '',
    category: p.maintenance_rules?.category ?? '',
    priority: p.priority,
    lastMaintenanceDate: p.last_maintenance_date ? new Date(p.last_maintenance_date) : null,
    lastMaintenanceKm: p.last_maintenance_km,
    currentKm: p.current_km,
    estimatedDueDate: p.estimated_due_date ? new Date(p.estimated_due_date) : null,
    estimatedDueKm: p.estimated_due_km,
    kmUntilDue: p.km_until_due,
    daysUntilDue: p.days_until_due,
    usagePercent: p.estimated_due_km && p.last_maintenance_km
      ? Math.min(120, Math.round(((p.current_km - p.last_maintenance_km) / (p.estimated_due_km - p.last_maintenance_km)) * 100))
      : 100,
    status: p.status,
    triggerType: p.trigger_type ?? 'both',
    intervalKm: p.interval_km ?? null,
    intervalMonths: p.interval_months ?? null,
    isInitialized: p.is_initialized ?? false,
  }))
}

// ──────────────────────────────────────────────────────────────
// Recalcule les prédictions pour UN véhicule et persiste en base
// Utilisé après une maintenance terminée (recalcul immédiat)
// ──────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js'

export async function recalculatePredictionsForVehicle(
  vehicleId: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  // Utiliser le client fourni ou créer un nouveau
  const supabase = supabaseClient ?? await createClient()

  // Récupérer le company_id du véhicule
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('company_id')
    .eq('id', vehicleId)
    .single()

  if (!vehicle?.company_id) return

  // Calculer les prédictions (sans filtre onlyActionable pour tout recalculer)
  const predictions = await predictMaintenanceForVehicle(vehicleId, false)

  // Persister chaque prédiction (upsert)
  for (const pred of predictions) {
    const upsertData = {
      vehicle_id: vehicleId,
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
      is_initialized: pred.isInitialized,
      calculated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('maintenance_predictions')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('rule_id', pred.ruleId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('maintenance_predictions')
        .update(upsertData)
        .eq('id', existing.id)
    } else {
      await supabase.from('maintenance_predictions').insert(upsertData)
    }
  }
}
