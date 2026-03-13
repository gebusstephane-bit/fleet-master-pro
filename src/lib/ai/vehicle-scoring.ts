/**
 * Vehicle AI Global Scoring — Algorithme pondéré + types
 *
 * Pondération :
 *   - Maintenance : 40%  (historique + prédictions)
 *   - Inspection  : 35%  (score moyen + défauts critiques)
 *   - Consommation: 25%  (écart vs flotte + régularité)
 *
 * Calcul pur, sans accès DB. Les données sont injectées par le cron.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VehicleAIScore {
  score: number;                   // 0-100 global
  maintenance_score: number;       // 0-100
  inspection_score: number;        // 0-100
  consumption_score: number;       // 0-100
  flags: string[];                 // alertes textuelles courtes
}

export interface VehicleScoringInput {
  vehicleId: string;
  registration: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  companyId: string;
  // Maintenance data (last 90 days)
  maintenances: {
    type: string;
    priority: string;
    status: string;
    requested_at: string;
    completed_at: string | null;
  }[];
  // Maintenance predictions
  predictions: {
    status: string;   // overdue | due | upcoming | ok
    priority: string; // CRITICAL | HIGH | NORMAL | LOW
  }[];
  // Inspections (last 90 days)
  inspections: {
    score: number | null;
    reported_defects: unknown;
    inspection_date: string;
  }[];
  // Fuel records (last 90 days)
  fuelRecords: {
    consumption_l_per_100km: number | null;
  }[];
  // Fleet average consumption (for comparison)
  fleetAvgConsumption: number;
}

// ─── Sous-scores ─────────────────────────────────────────────────────────────

function calcMaintenanceScore(input: VehicleScoringInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const { maintenances, predictions } = input;

  // 1. Ratio préventif vs correctif (40%)
  let preventiveRatio = 0.5; // neutre si pas de données
  if (maintenances.length > 0) {
    const preventiveKeywords = ['preventive', 'revision', 'entretien', 'vidange', 'preventif'];
    const preventiveCount = maintenances.filter(m =>
      preventiveKeywords.some(k => m.type?.toLowerCase().includes(k))
    ).length;
    preventiveRatio = preventiveCount / maintenances.length;
  }
  const preventiveScore = Math.min(100, (preventiveRatio / 0.7) * 100);

  // 2. Délai résolution urgences (30%)
  const urgent = maintenances.filter(
    m => (m.priority === 'HIGH' || m.priority === 'CRITICAL') && m.completed_at
  );
  let resolutionScore = 80;
  if (urgent.length > 0) {
    const avgDays = urgent.reduce((sum, m) => {
      const days = (new Date(m.completed_at!).getTime() - new Date(m.requested_at).getTime())
        / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / urgent.length;
    if (avgDays <= 3) resolutionScore = 100;
    else if (avgDays <= 7) resolutionScore = 70;
    else if (avgDays <= 14) resolutionScore = 40;
    else {
      resolutionScore = 10;
      flags.push('Délais de résolution longs');
    }
  }

  // 3. Prédictions en retard (30%)
  const overdue = predictions.filter(p => p.status === 'overdue').length;
  const criticalOverdue = predictions.filter(
    p => p.status === 'overdue' && (p.priority === 'CRITICAL' || p.priority === 'HIGH')
  ).length;
  let predictionScore = 100;
  if (overdue > 0) {
    predictionScore = Math.max(0, 100 - overdue * 15);
    flags.push(`${overdue} maintenance(s) en retard`);
  }
  if (criticalOverdue > 0) {
    predictionScore = Math.max(0, predictionScore - criticalOverdue * 10);
    flags.push('Maintenance critique en retard');
  }

  const score = Math.min(100, Math.round(
    preventiveScore * 0.4 + resolutionScore * 0.3 + predictionScore * 0.3
  ));

  return { score, flags };
}

function calcInspectionScore(input: VehicleScoringInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const { inspections } = input;

  if (inspections.length === 0) {
    flags.push('Aucune inspection récente');
    return { score: 50, flags };
  }

  // 1. Score moyen des inspections (60%)
  const avgScore = inspections.reduce((sum, i) => sum + (i.score ?? 75), 0) / inspections.length;
  const scoreComponent = Math.min(100, (avgScore / 100) * 100);

  if (avgScore < 60) {
    flags.push('Scores d\'inspection bas');
  }

  // 2. Défauts critiques (40%)
  const criticalCount = inspections.reduce((count, i) => {
    if (!i.reported_defects || !Array.isArray(i.reported_defects)) return count;
    return count + (i.reported_defects as Array<{ severity?: string }>).filter(
      d => d.severity === 'critical' || d.severity === 'CRITICAL'
    ).length;
  }, 0);

  let defectScore: number;
  if (criticalCount === 0) defectScore = 100;
  else if (criticalCount === 1) { defectScore = 70; flags.push('1 défaut critique'); }
  else if (criticalCount === 2) { defectScore = 40; flags.push(`${criticalCount} défauts critiques`); }
  else { defectScore = 0; flags.push(`${criticalCount} défauts critiques`); }

  const score = Math.min(100, Math.round(scoreComponent * 0.6 + defectScore * 0.4));
  return { score, flags };
}

function calcConsumptionScore(input: VehicleScoringInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const consumptions = input.fuelRecords
    .map(r => r.consumption_l_per_100km)
    .filter((c): c is number => c !== null && c > 0);

  if (consumptions.length === 0) {
    return { score: 50, flags: ['Pas de données carburant'] };
  }

  const driverAvg = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;

  // 1. Écart vs flotte (50%)
  let deviationScore = 50;
  if (input.fleetAvgConsumption > 0) {
    const deviation = ((driverAvg - input.fleetAvgConsumption) / input.fleetAvgConsumption) * 100;
    deviationScore = Math.max(0, Math.min(100, 50 - deviation));
    if (deviation > 20) flags.push('Surconsommation vs flotte');
  }

  // 2. Régularité (coefficient de variation) (50%)
  let consistencyScore = 75;
  if (consumptions.length >= 2) {
    const variance = consumptions.reduce((sum, c) => sum + (c - driverAvg) ** 2, 0) / consumptions.length;
    const cv = driverAvg > 0 ? Math.sqrt(variance) / driverAvg : 0;
    if (cv < 0.1) consistencyScore = 100;
    else if (cv < 0.2) consistencyScore = 80;
    else if (cv < 0.3) consistencyScore = 55;
    else {
      consistencyScore = 25;
      flags.push('Consommation irrégulière');
    }
  }

  const score = Math.min(100, Math.round(deviationScore * 0.5 + consistencyScore * 0.5));
  return { score, flags };
}

// ─── Calcul principal ────────────────────────────────────────────────────────

export function computeVehicleWeightedScore(input: VehicleScoringInput): VehicleAIScore {
  const maint = calcMaintenanceScore(input);
  const insp = calcInspectionScore(input);
  const cons = calcConsumptionScore(input);

  const allFlags = [...maint.flags, ...insp.flags, ...cons.flags];

  const score = Math.min(100, Math.max(0, Math.round(
    maint.score * 0.40 +
    insp.score * 0.35 +
    cons.score * 0.25
  )));

  return {
    score,
    maintenance_score: maint.score,
    inspection_score: insp.score,
    consumption_score: cons.score,
    flags: allFlags,
  };
}
