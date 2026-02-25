"use server";

/**
 * Dashboard Analytics - Server Actions
 * Calculs agrégés côté serveur pour éviter freeze UI
 */

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

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
  // Sélectionne aussi estimated_cost/final_cost (schéma workflow) en fallback de cost
  const { data: rawData, error: maintError } = await supabase
    .from("maintenance_records")
    .select("cost, estimated_cost, final_cost, rdv_date, service_date, created_at, status, vehicle_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (maintError) {
    console.error("[Analytics] Error fetching maintenance data:", maintError);
  }

  // Normaliser :
  // - Date : created_at en priorité (toujours dans le passé, toujours renseigné)
  //   rdv_date peut être dans le futur → exclu de la fenêtre rétrospective
  // - Coût : cost (ancien schema) || estimated_cost || final_cost (workflow)
  const normalizedData = (rawData || []).map(r => ({
    cost: r.cost || (r as any).estimated_cost || (r as any).final_cost || null,
    service_date: r.created_at || (r as any).rdv_date || r.service_date,
    status: r.status,
  }));

  // Query 2 : Top véhicules — tous les records, sans filtre de date
  const { data: topVehiclesRaw, error: vehiclesError } = await supabase
    .from("maintenance_records")
    .select(`
      vehicle_id,
      cost,
      estimated_cost,
      final_cost,
      vehicles!inner(registration_number)
    `)
    .eq("company_id", companyId);

  if (vehiclesError) {
    // Fallback sans inner join si la relation échoue
    console.error("[Analytics] Top vehicles join error:", vehiclesError);
  }

  // Calculs d'agrégation sur 12 mois
  const monthlyCosts = aggregateByMonth(normalizedData, twelveMonthsAgo);
  const topVehicles = aggregateByVehicle(topVehiclesRaw || []);

  // Totaux
  const totalCost = monthlyCosts.reduce((sum, m) => sum + m.cost, 0);
  const totalInterventions = monthlyCosts.reduce((sum, m) => sum + m.interventions, 0);
  const activeMonths = monthlyCosts.filter(m => m.interventions > 0).length;
  const avgMonthlyCost = activeMonths > 0 ? Math.round(totalCost / activeMonths) : 0;

  // Analytics computed

  return {
    monthlyCosts,
    topVehicles,
    totalCost6Months: totalCost,
    avgMonthlyCost,
    totalInterventions,
  };
});

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
      monthData.cost += record.cost || 0; // cost déjà normalisé (cost || estimated_cost || final_cost)
      monthData.interventions += 1;
    }
  });

  return months;
}

/**
 * Agrège les coûts par véhicule et retourne le top 5
 * Utilise cost || estimated_cost || final_cost pour couvrir les deux schémas
 */
function aggregateByVehicle(
  data: Array<{
    vehicle_id: string;
    cost: number | null;
    vehicles: { registration_number: string } | null;
  }>
): TopVehicleData[] {
  const vehicleMap = new Map<string, TopVehicleData>();

  data.forEach((record) => {
    const r = record as any;
    const cost = r.cost || r.estimated_cost || r.final_cost || 0;
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

// Note: Les fonctions de formatting sont dans @/lib/analytics/formatters
// pour être utilisables côté client sans async
