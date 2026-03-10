'use server';

/**
 * Actions Dashboard - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Le company_id est récupéré depuis le profil en DB, pas depuis user_metadata
 */

import { cache } from 'react';

import { VEHICLE_STATUS } from '@/constants/enums';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES DASHBOARD STATS (legacy)
// ============================================================================

interface DashboardStats {
  vehicles: {
    total: number;
    active: number;
    list: unknown[];
    totalMileage: number;
  };
  drivers: {
    total: number;
    active: number;
  };
  routes: {
    today: number;
    ongoing: number;
  };
  costs: {
    fuel: number;
    maintenance: number;
    total: number;
  };
  inspections?: {
    pending: number;
    completedThisMonth: number;
  };
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// TYPES DASHBOARD ANALYTICS
// ============================================================================

export interface MonthlyCostData {
  month: string;
  monthLabel: string;
  cost: number;
  interventions: number;
}

export interface TopVehicleData {
  vehicleId: string;
  registrationNumber: string;
  totalCost: number;
  interventions: number;
}

export interface FleetStatusData {
  status: string;
  count: number;
  color: string;
}

export interface DashboardAnalytics {
  monthlyCosts: MonthlyCostData[];
  topVehicles: TopVehicleData[];
  totalCost6Months: number;
  avgMonthlyCost: number;
  totalInterventions: number;
}

// ============================================================================
// FONCTION : getDashboardStats (legacy)
// ============================================================================

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = await createClient();
    
    // Récupérer l'utilisateur authentifié
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      logger.error('getDashboardStats: Utilisateur non authentifié', authError ? new Error(authError.message) : undefined);
      return { success: false, error: 'Non authentifié' };
    }
    
    // Récupérer le profil pour avoir le company_id (RLS permet de lire son propre profil)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (profileError || !profile?.company_id) {
      logger.error('getDashboardStats: Profil ou company_id non trouvé', { 
        userId: authUser.id, 
        profileError,
        profile 
      });
      return { success: false, error: 'Entreprise non trouvée' };
    }
    
    const companyId = profile.company_id;
    logger.info('getDashboardStats: Chargement pour company', { companyId });
    
    // Récupérer les véhicules (RLS gère le filtre company_id)
    const { data: vehicles, error: vErr } = await supabase
      .from('vehicles')
      .select('id, registration_number, status, mileage, fuel_type, brand, model')
      .order('created_at', { ascending: false });
    
    if (vErr) {logger.error('Erreur véhicules', new Error(vErr.message));}
    
    // Récupérer les chauffeurs (RLS gère le filtre company_id)
    const { data: drivers, error: dErr } = await supabase
      .from('drivers')
      .select('id, status, first_name, last_name');
    
    if (dErr) {logger.error('Erreur chauffeurs', new Error(dErr.message));}
    
    // Tournées du jour (RLS gère le filtre company_id)
    const today = new Date().toISOString().split('T')[0];
    const { data: routes, error: rErr } = await supabase
      .from('routes')
      .select('id, status, name')
      .gte('route_date', today);
    
    if (rErr) {logger.error('Erreur routes', new Error(rErr.message));}
    
    // Coûts ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const { data: fuel } = await supabase
      .from('fuel_records')
      .select('price_total')
      .gte('date', startOfMonth.toISOString());
    
    const { data: maintenance } = await supabase
      .from('maintenance_records')
      .select('cost, final_cost')
      .gte('created_at', startOfMonth.toISOString());

    const totalFuel = fuel?.reduce((s, r) => s + (r.price_total ?? 0), 0) ?? 0;
    // Aligné sur tco-calculator.ts : final_cost (réel réglé) ?? cost (devis)
    const totalMaint = maintenance?.reduce((s, r) => s + (r.final_cost ?? r.cost ?? 0), 0) ?? 0;
    
    logger.info('getDashboardStats: Données chargées', {
      vehicles: vehicles?.length || 0,
      drivers: drivers?.length || 0,
      routes: routes?.length || 0
    });
    
    return {
      success: true,
      data: {
        vehicles: {
          total: vehicles?.length || 0,
          active: vehicles?.filter(v => v.status === VEHICLE_STATUS.ACTIF).length || 0,
          list: vehicles || [],
          totalMileage: vehicles?.reduce((s, v) => s + (v.mileage || 0), 0) || 0
        },
        drivers: {
          total: drivers?.length || 0,
          active: drivers?.filter(d => d.status === 'active').length || 0
        },
        routes: {
          today: routes?.length || 0,
          ongoing: routes?.filter(r => (r.status as string) === 'in_progress' || (r.status as string) === 'EN_COURS').length || 0
        },
        costs: {
          fuel: totalFuel,
          maintenance: totalMaint,
          total: totalFuel + totalMaint
        }
      }
    };
    
  } catch (e: unknown) {
    logger.error('Dashboard error', e instanceof Error ? e : new Error(String(e)));
    return { success: false, error: e instanceof Error ? e.message : 'Erreur inconnue' };
  }
}

// ============================================================================
// FONCTION : getDashboardAnalytics (avec cache 5 minutes)
// ============================================================================

/**
 * Récupère les analytics du dashboard
 * Cache 5 minutes côté serveur
 */
export const getDashboardAnalytics = cache(async (
  companyId: string
): Promise<DashboardAnalytics> => {
  const supabase = await createClient();

  // Fenêtre 12 mois pour maximiser les chances d'avoir des données
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  // Query 1 : Toutes les maintenances de la company sans filtre de date
  const { data: rawData, error: maintError } = await supabase
    .from("maintenance_records")
    .select("cost, final_cost, rdv_date, created_at, status, vehicle_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (maintError) {
    logger.error("[Analytics] Error fetching maintenance data:", maintError);
  }

  // Normaliser :
  // - Date : created_at en priorité (toujours dans le passé, toujours renseigné)
  //   rdv_date peut être dans le futur → exclu de la fenêtre rétrospective
  // - Coût : final_cost (coût réel réglé) ?? cost (coût direct) — ne jamais utiliser estimated_cost
  //   (estimate = devis non payé, gonflait les totaux si cost=0)
  //   Aligné sur tco-calculator.ts : final_cost ?? cost ?? 0
  const normalizedData = (rawData || []).map(r => ({
    cost: r.final_cost ?? r.cost ?? null,
    service_date: r.created_at || r.rdv_date || '',
    status: r.status,
  }));

  // Query 2 : Top véhicules — tous les records, sans filtre de date
  // Récupérer d'abord les maintenances
  const { data: maintenanceRecords, error: maintError2 } = await supabase
    .from("maintenance_records")
    .select("vehicle_id, cost, final_cost")
    .eq("company_id", companyId);

  if (maintError2) {
    logger.error("[Analytics] Error fetching maintenance for top vehicles:", maintError2);
  }

  // Récupérer les véhicules séparément pour éviter la jointure problématique
  const vehicleIds = Array.from(new Set((maintenanceRecords || []).map(m => m.vehicle_id)));
  const { data: vehiclesData, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, registration_number")
    .in("id", vehicleIds);

  if (vehiclesError) {
    logger.error("[Analytics] Top vehicles fetch error:", vehiclesError);
  }

  // Créer un map des véhicules
  const vehiclesMap = new Map((vehiclesData || []).map(v => [v.id, v]));

  // Combiner les données
  const topVehiclesRaw = (maintenanceRecords || []).map(m => ({
    vehicle_id: m.vehicle_id,
    cost: m.cost,
    final_cost: m.final_cost,
    vehicles: vehiclesMap.get(m.vehicle_id) || null,
  }));

  // Calculs d'agrégation sur 12 mois
  const monthlyCosts = aggregateByMonth(normalizedData, twelveMonthsAgo);
  const topVehicles = aggregateByVehicle(topVehiclesRaw || []);

  // Totaux
  const totalCost = monthlyCosts.reduce((sum, m) => sum + m.cost, 0);
  const totalInterventions = monthlyCosts.reduce((sum, m) => sum + m.interventions, 0);
  const activeMonths = monthlyCosts.filter(m => m.interventions > 0).length;
  const avgMonthlyCost = activeMonths > 0 ? Math.round(totalCost / activeMonths) : 0;

  return {
    monthlyCosts,
    topVehicles,
    totalCost6Months: totalCost,
    avgMonthlyCost,
    totalInterventions,
  };
});

// ============================================================================
// FONCTIONS UTILITAIRES (privées)
// ============================================================================

/**
 * Agrège les coûts par mois
 */
function aggregateByMonth(
  data: Array<{ cost: number | null; service_date: string; status: string }>,
  startDate: Date
): MonthlyCostData[] {
  const months: MonthlyCostData[] = [];
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  // Initialiser les 13 derniers mois (12 passés + mois courant)
  for (let i = 0; i < 13; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    months.push({
      month: monthKey,
      monthLabel: monthNames[date.getMonth()],
      cost: 0,
      interventions: 0,
    });
  }

  // Agréger les données
  data.forEach((record) => {
    const date = new Date(record.service_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const monthData = months.find((m) => m.month === monthKey);
    if (monthData) {
      monthData.cost += record.cost ?? 0; // cost normalisé : final_cost ?? cost ?? null
      monthData.interventions += 1;
    }
  });

  return months;
}

/**
 * Agrège les coûts par véhicule et retourne le top 5
 * Utilise final_cost ?? cost (aligné sur tco-calculator.ts — jamais estimated_cost)
 */
function aggregateByVehicle(
  data: Array<{
    vehicle_id: string;
    cost: number | null;
    final_cost?: number | null;
    vehicles: { registration_number: string } | null;
  }>
): TopVehicleData[] {
  const vehicleMap = new Map<string, TopVehicleData>();

  data.forEach((record) => {
    const cost = (record.final_cost ?? record.cost) ?? 0;
    const existing = vehicleMap.get(record.vehicle_id);
    if (existing) {
      existing.totalCost += cost;
      existing.interventions += 1;
    } else {
      vehicleMap.set(record.vehicle_id, {
        vehicleId: record.vehicle_id,
        registrationNumber: record.vehicles?.registration_number || "Inconnu",
        totalCost: cost,
        interventions: 1,
      });
    }
  });

  // Convertir en array, trier et prendre top 5
  return Array.from(vehicleMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5);
}
