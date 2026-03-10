import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface TCOData {
  vehicleId: string;
  period: { from: Date; to: Date };

  // Carburant
  fuelCost: number;
  fuelLiters: number;
  avgConsumption: number; // L/100km

  // Maintenance
  maintenanceCost: number;
  maintenanceCount: number;
  avgMaintenanceCost: number;

  // Total
  totalCost: number;
  costPerKm: number;     // €/km
  costPerMonth: number;  // moyenne mensuelle

  // Répartition %
  breakdown: {
    fuel: number;
    maintenance: number;
    other: number;
  };

  // Historique mensuel
  monthlyData: {
    month: string;        // "Jan 2025"
    fuelCost: number;
    maintenanceCost: number;
    total: number;
  }[];
}

export async function calculateTCO(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  months: 3 | 6 | 12 | 24 = 12,
): Promise<TCOData> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);

  const fromDateStr = fromDate.toISOString().slice(0, 10);

  // 1. Fuel records
  const { data: fuelData } = await supabase
    .from('fuel_records')
    .select('date, price_total, quantity_liters, mileage_at_fill, consumption_l_per_100km')
    .eq('vehicle_id', vehicleId)
    .gte('date', fromDateStr)
    .order('date', { ascending: true });

  // 2. Maintenance records
  const { data: maintenanceData } = await supabase
    .from('maintenance_records')
    .select('completed_at, created_at, final_cost, cost, status')
    .eq('vehicle_id', vehicleId)
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: true });

  // — Process fuel —
  const fuelByMonth: Record<string, { cost: number; liters: number }> = {};
  let totalFuelCost = 0;
  let totalFuelLiters = 0;
  let minMileage = Infinity;
  let maxMileage = 0;
  const consumptions: number[] = [];

  for (const r of fuelData ?? []) {
    const key = monthKey(r.date);
    if (!fuelByMonth[key]) fuelByMonth[key] = { cost: 0, liters: 0 };
    fuelByMonth[key].cost += r.price_total ?? 0;
    fuelByMonth[key].liters += r.quantity_liters ?? 0;
    totalFuelCost += r.price_total ?? 0;
    totalFuelLiters += r.quantity_liters ?? 0;
    if (r.mileage_at_fill) {
      if (r.mileage_at_fill < minMileage) minMileage = r.mileage_at_fill;
      if (r.mileage_at_fill > maxMileage) maxMileage = r.mileage_at_fill;
    }
    if (r.consumption_l_per_100km) consumptions.push(r.consumption_l_per_100km);
  }

  // — Process maintenance —
  const maintByMonth: Record<string, { cost: number; count: number }> = {};
  let totalMaintenanceCost = 0;
  let maintenanceCount = 0;

  for (const r of maintenanceData ?? []) {
    const dateStr = r.completed_at ?? r.created_at;
    const key = monthKey(dateStr);
    if (!maintByMonth[key]) maintByMonth[key] = { cost: 0, count: 0 };
    const cost = r.final_cost ?? r.cost ?? 0;
    maintByMonth[key].cost += cost;
    maintByMonth[key].count += 1;
    totalMaintenanceCost += cost;
    maintenanceCount += 1;
  }

  // — Totals —
  const totalCost = totalFuelCost + totalMaintenanceCost;
  const kmDriven = maxMileage > minMileage && minMileage !== Infinity ? maxMileage - minMileage : 0;
  const costPerKm = kmDriven > 0 ? totalCost / kmDriven : 0;
  const costPerMonth = totalCost / months;
  const avgConsumption =
    consumptions.length > 0
      ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
      : 0;

  const fuelPct = totalCost > 0 ? Math.round((totalFuelCost / totalCost) * 100) : 0;
  const maintPct = totalCost > 0 ? Math.round((totalMaintenanceCost / totalCost) * 100) : 0;
  const breakdown = { fuel: fuelPct, maintenance: maintPct, other: 100 - fuelPct - maintPct };

  // — Monthly data —
  const allMonths = buildMonthRange(fromDate, toDate);
  const monthlyData = allMonths.map(({ key, label }) => {
    const fuel = fuelByMonth[key]?.cost ?? 0;
    const maint = maintByMonth[key]?.cost ?? 0;
    return { month: label, fuelCost: fuel, maintenanceCost: maint, total: fuel + maint };
  });

  return {
    vehicleId,
    period: { from: fromDate, to: toDate },
    fuelCost: totalFuelCost,
    fuelLiters: totalFuelLiters,
    avgConsumption,
    maintenanceCost: totalMaintenanceCost,
    maintenanceCount,
    avgMaintenanceCost: maintenanceCount > 0 ? totalMaintenanceCost / maintenanceCount : 0,
    totalCost,
    costPerKm,
    costPerMonth,
    breakdown,
    monthlyData,
  };
}

export async function calculateFleetAvgCostPerMonth(
  supabase: SupabaseClient<Database>,
  companyId: string,
  months: 3 | 6 | 12 | 24 = 12,
): Promise<number> {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);
  const fromDateStr = fromDate.toISOString().slice(0, 10);

  const [{ data: fuelData }, { data: maintData }, { data: vehicleData }] = await Promise.all([
    supabase
      .from('fuel_records')
      .select('price_total')
      .eq('company_id', companyId)
      .gte('date', fromDateStr),
    supabase
      .from('maintenance_records')
      .select('final_cost, cost')
      .eq('company_id', companyId)
      .gte('created_at', fromDate.toISOString()),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ]);

  const totalFuel = (fuelData ?? []).reduce((s, r) => s + (r.price_total ?? 0), 0);
  const totalMaint = (maintData ?? []).reduce((s, r) => s + (r.final_cost ?? r.cost ?? 0), 0);
  const vehicleCount = (vehicleData as any)?.length ?? (vehicleData as any)?.count ?? 1;

  if (!vehicleCount) return 0;
  return (totalFuel + totalMaint) / vehicleCount / months;
}

// — Helpers —
function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthRange(from: Date, to: Date): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS_FR[cur.getMonth()]} ${cur.getFullYear()}`;
    result.push({ key, label });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}
