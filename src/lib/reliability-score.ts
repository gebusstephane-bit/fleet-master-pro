/**
 * Algorithme de scoring de fiabilité véhicule — Fleet-Master
 * Calcul pur, sans accès DB. Les données sont injectées par le hook.
 */

export interface ReliabilityScore {
  score: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;          // hex
  label: string;          // "Excellent" | "Bon" | "Moyen" | "Faible" | "Critique"
  breakdown: {
    inspection: number;   // 0-100, poids 30%
    maintenance: number;  // 0-100, poids 35%
    fuel: number;         // 0-100, poids 20%
    compliance: number;   // 0-100, poids 15%
  };
  trend: 'improving' | 'stable' | 'declining';
  lastCalculated: Date;
}

export interface InspectionData {
  inspection_date: string;
  score: number | null;
  reported_defects: unknown;
}

export interface MaintenanceData {
  type: string;
  priority: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  final_cost: number | null;
  cost: number | null;
}

export interface FuelData {
  date: string;
  consumption_l_per_100km: number | null;
}

export interface VehicleComplianceData {
  technical_control_expiry: string | null;
  insurance_expiry: string | null;
  tachy_control_expiry: string | null;
  atp_expiry: string | null;
}

// ─── Grade & Couleur ──────────────────────────────────────────────────────────

export function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function getScoreColor(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  const colors: Record<string, string> = {
    A: '#16a34a',
    B: '#22c55e',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444',
  };
  return colors[grade] ?? '#94a3b8';
}

export function getScoreLabel(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  const labels: Record<string, string> = {
    A: 'Excellent',
    B: 'Bon',
    C: 'Moyen',
    D: 'Faible',
    F: 'Critique',
  };
  return labels[grade] ?? 'Inconnu';
}

// ─── Sous-scores ──────────────────────────────────────────────────────────────

function calcInspectionScore(inspections: InspectionData[]): number {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recent = inspections.filter(i => new Date(i.inspection_date).getTime() >= cutoff);

  if (recent.length === 0) return 50; // neutre si pas de données

  // Composante 1 : score moyen des inspections (60%)
  const avgScore = recent.reduce((sum, i) => sum + (i.score ?? 75), 0) / recent.length;
  const scoreComponent = (avgScore / 100) * 100;

  // Composante 2 : défauts critiques (40%)
  const criticalCount = recent.reduce((count, i) => {
    if (!i.reported_defects || !Array.isArray(i.reported_defects)) return count;
    return count + (i.reported_defects as Array<{ severity?: string }>).filter(
      d => d.severity === 'critical' || d.severity === 'CRITICAL'
    ).length;
  }, 0);

  let defectScore: number;
  if (criticalCount === 0) defectScore = 100;
  else if (criticalCount === 1) defectScore = 70;
  else if (criticalCount === 2) defectScore = 40;
  else defectScore = 0;

  return Math.min(100, Math.round(scoreComponent * 0.6 + defectScore * 0.4));
}

function calcMaintenanceScore(maintenances: MaintenanceData[]): number {
  if (maintenances.length === 0) return 70; // neutre

  // Ratio préventif / total (50%)
  const preventiveKeywords = ['preventive', 'revision', 'entretien', 'vidange', 'preventif'];
  const preventiveCount = maintenances.filter(m =>
    preventiveKeywords.some(k => m.type?.toLowerCase().includes(k))
  ).length;
  const ratio = preventiveCount / maintenances.length;
  const preventiveScore = Math.min(100, (ratio / 0.7) * 100);

  // Délai résolution urgences (20%)
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
    else resolutionScore = 10;
  }

  // Score coût (30%) — neutre sans valeur véhicule connue
  const costScore = 75;

  return Math.min(100, Math.round(preventiveScore * 0.5 + costScore * 0.3 + resolutionScore * 0.2));
}

function calcFuelScore(fuelRecords: FuelData[]): number {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recent = fuelRecords.filter(r => r.date && new Date(r.date).getTime() >= cutoff);

  if (recent.length === 0) return 65; // neutre

  // Cohérence consommation via coefficient de variation (60%)
  const consumptions = recent
    .map(r => r.consumption_l_per_100km)
    .filter((c): c is number => c !== null && c > 0);

  let consistencyScore = 75;
  if (consumptions.length >= 2) {
    const avg = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
    const variance = consumptions.reduce((sum, c) => sum + (c - avg) ** 2, 0) / consumptions.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
    if (cv < 0.1) consistencyScore = 100;
    else if (cv < 0.2) consistencyScore = 80;
    else if (cv < 0.3) consistencyScore = 55;
    else consistencyScore = 25;
  }

  // Heuristique anomalie : consommation > 2× la médiane (40%)
  let anomalyScore = 100;
  if (consumptions.length >= 3) {
    const sorted = [...consumptions].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const anomalies = consumptions.filter(c => c > median * 2 || c < median * 0.5).length;
    if (anomalies === 0) anomalyScore = 100;
    else if (anomalies <= 2) anomalyScore = 70;
    else if (anomalies <= 5) anomalyScore = 40;
    else anomalyScore = 10;
  }

  return Math.min(100, Math.round(consistencyScore * 0.6 + anomalyScore * 0.4));
}

function calcComplianceScore(vehicle: VehicleComplianceData): number {
  const now = new Date();
  const checks = [
    vehicle.technical_control_expiry,
    vehicle.insurance_expiry,
    vehicle.tachy_control_expiry,
    vehicle.atp_expiry,
  ].filter(Boolean) as string[];

  if (checks.length === 0) return 50;

  const valid = checks.filter(d => new Date(d) >= now).length;
  return Math.round((valid / checks.length) * 100);
}

// ─── Calcul principal ─────────────────────────────────────────────────────────

export function computeReliabilityScore(data: {
  inspections: InspectionData[];
  maintenances: MaintenanceData[];
  fuelRecords: FuelData[];
  vehicle: VehicleComplianceData;
  previousScore?: number;
}): ReliabilityScore {
  const inspection = calcInspectionScore(data.inspections);
  const maintenance = calcMaintenanceScore(data.maintenances);
  const fuel = calcFuelScore(data.fuelRecords);
  const compliance = calcComplianceScore(data.vehicle);

  const score = Math.min(100, Math.max(0, Math.round(
    inspection * 0.30 +
    maintenance * 0.35 +
    fuel * 0.20 +
    compliance * 0.15
  )));

  let trend: ReliabilityScore['trend'] = 'stable';
  if (data.previousScore !== undefined) {
    if (score > data.previousScore + 5) trend = 'improving';
    else if (score < data.previousScore - 5) trend = 'declining';
  }

  const grade = calculateGrade(score);

  return {
    score,
    grade,
    color: getScoreColor(grade),
    label: getScoreLabel(grade),
    breakdown: { inspection, maintenance, fuel, compliance },
    trend,
    lastCalculated: new Date(),
  };
}
