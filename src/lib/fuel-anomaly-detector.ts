import type { FuelRecord } from '@/types/fuel';

const CONSUMPTION_THRESHOLDS = {
  'Camion porteur': { min: 18, max: 45 },
  'Tracteur routier': { min: 22, max: 50 },
  'Fourgon': { min: 8, max: 18 },
  'Utilitaire léger': { min: 5, max: 15 },
  'default': { min: 5, max: 50 },
} as const;

type VehicleType = keyof typeof CONSUMPTION_THRESHOLDS;

export interface AnomalyResult {
  isAnomaly: boolean;
  deviationPercent: number;
  type: 'high' | 'low' | 'none';
  severity: 'warning' | 'critical' | 'none';
  message: string;
}

/**
 * Détecte si une consommation est anormale par rapport à la moyenne historique du véhicule.
 * Anomalie haute : > moyenne * 1.20 (critical si > 1.35)
 * Anomalie basse : < moyenne * 0.80 (erreur de saisie probable)
 */
export function detectFuelAnomaly(
  consumption: number | null | undefined,
  vehicleAvg: number,
  vehicleType?: string
): AnomalyResult {
  if (consumption == null || vehicleAvg === 0) {
    return { isAnomaly: false, deviationPercent: 0, type: 'none', severity: 'none', message: '' };
  }

  const deviationPercent = ((consumption - vehicleAvg) / vehicleAvg) * 100;
  const absDeviation = Math.abs(deviationPercent);

  const thresholds =
    CONSUMPTION_THRESHOLDS[(vehicleType as VehicleType) ?? 'default'] ??
    CONSUMPTION_THRESHOLDS['default'];

  // Anomalie critique : +35% ou dépasse le seuil absolu du type de véhicule
  if (consumption > vehicleAvg * 1.35 || consumption > thresholds.max) {
    return {
      isAnomaly: true,
      deviationPercent,
      type: 'high',
      severity: 'critical',
      message: `Consommation anormalement élevée : ${consumption.toFixed(1)} L/100km vs ${vehicleAvg.toFixed(1)} L/100km en moyenne (+${absDeviation.toFixed(0)}%)`,
    };
  }

  // Anomalie warning : +20%
  if (consumption > vehicleAvg * 1.2) {
    return {
      isAnomaly: true,
      deviationPercent,
      type: 'high',
      severity: 'warning',
      message: `Consommation élevée : ${consumption.toFixed(1)} L/100km vs ${vehicleAvg.toFixed(1)} L/100km en moyenne (+${absDeviation.toFixed(0)}%)`,
    };
  }

  // Anomalie basse : -20% (probable erreur de saisie)
  if (consumption < vehicleAvg * 0.8) {
    return {
      isAnomaly: true,
      deviationPercent,
      type: 'low',
      severity: 'warning',
      message: `Consommation anormalement basse : ${consumption.toFixed(1)} L/100km vs ${vehicleAvg.toFixed(1)} L/100km en moyenne (${deviationPercent.toFixed(0)}%)`,
    };
  }

  return { isAnomaly: false, deviationPercent, type: 'none', severity: 'none', message: '' };
}

/**
 * Calcule la consommation moyenne par véhicule à partir d'une liste de records.
 * Requiert au moins 2 records par véhicule pour avoir une moyenne significative.
 */
export function computeVehicleAverages(
  records: Pick<FuelRecord, 'vehicle_id' | 'consumption_l_per_100km'>[]
): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const record of records) {
    if (record.consumption_l_per_100km == null) continue;
    const current = sums.get(record.vehicle_id) ?? { total: 0, count: 0 };
    sums.set(record.vehicle_id, {
      total: current.total + record.consumption_l_per_100km,
      count: current.count + 1,
    });
  }
  const averages = new Map<string, number>();
  sums.forEach(({ total, count }, vehicleId) => {
    if (count > 1) averages.set(vehicleId, total / count);
  });
  return averages;
}
