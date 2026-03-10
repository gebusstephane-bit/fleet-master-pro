'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import {
  computeReliabilityScore,
  type ReliabilityScore,
  type InspectionData,
  type MaintenanceData,
  type FuelData,
  type VehicleComplianceData,
} from '@/lib/reliability-score';

const NINETY_DAYS_AGO = () =>
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// ─── Score pour un seul véhicule ──────────────────────────────────────────────

export function useVehicleReliabilityScore(
  vehicleId: string,
  vehicleData?: VehicleComplianceData
) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery<ReliabilityScore>({
    queryKey: ['reliability-score', 'vehicle', vehicleId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const since = NINETY_DAYS_AGO();

      const [inspRes, maintRes, fuelRes, vehicleRes] = await Promise.all([
        supabase
          .from('vehicle_inspections')
          .select('inspection_date, score, reported_defects')
          .eq('vehicle_id', vehicleId)
          .gte('inspection_date', since),
        supabase
          .from('maintenance_records')
          .select('type, priority, status, requested_at, completed_at, final_cost, cost')
          .eq('vehicle_id', vehicleId),
        supabase
          .from('fuel_records')
          .select('date, consumption_l_per_100km')
          .eq('vehicle_id', vehicleId)
          .gte('date', since),
        vehicleData
          ? Promise.resolve({ data: vehicleData, error: null })
          : supabase
              .from('vehicles')
              .select('technical_control_expiry, insurance_expiry, tachy_control_expiry, atp_expiry')
              .eq('id', vehicleId)
              .single(),
      ]);

      return computeReliabilityScore({
        inspections: (inspRes.data ?? []) as InspectionData[],
        maintenances: (maintRes.data ?? []) as MaintenanceData[],
        fuelRecords: (fuelRes.data ?? []) as FuelData[],
        vehicle: (vehicleRes.data ?? {}) as VehicleComplianceData,
      });
    },
    enabled: !!vehicleId && !!companyId,
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 1,
  });
}

// ─── Scores batch pour toute la flotte ────────────────────────────────────────

export function useFleetReliabilityScores() {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery<Map<string, ReliabilityScore>>({
    queryKey: ['reliability-score', 'fleet', companyId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const since = NINETY_DAYS_AGO();

      // 4 requêtes parallèles pour toute la flotte
      const [vehiclesRes, inspRes, maintRes, fuelRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, technical_control_expiry, insurance_expiry, tachy_control_expiry, atp_expiry')
          .eq('company_id', companyId!),
        supabase
          .from('vehicle_inspections')
          .select('vehicle_id, inspection_date, score, reported_defects')
          .eq('company_id', companyId!)
          .gte('inspection_date', since),
        supabase
          .from('maintenance_records')
          .select('vehicle_id, type, priority, status, requested_at, completed_at, final_cost, cost')
          .eq('company_id', companyId!),
        supabase
          .from('fuel_records')
          .select('vehicle_id, date, consumption_l_per_100km')
          .eq('company_id', companyId!)
          .gte('date', since),
      ]);

      // Grouper par vehicle_id
      const inspMap = new Map<string, InspectionData[]>();
      for (const i of inspRes.data ?? []) {
        const arr = inspMap.get(i.vehicle_id) ?? [];
        arr.push(i as InspectionData);
        inspMap.set(i.vehicle_id, arr);
      }

      const maintMap = new Map<string, MaintenanceData[]>();
      for (const m of maintRes.data ?? []) {
        const arr = maintMap.get((m as any).vehicle_id) ?? [];
        arr.push(m as MaintenanceData);
        maintMap.set((m as any).vehicle_id, arr);
      }

      const fuelMap = new Map<string, FuelData[]>();
      for (const f of fuelRes.data ?? []) {
        const arr = fuelMap.get((f as any).vehicle_id) ?? [];
        arr.push(f as FuelData);
        fuelMap.set((f as any).vehicle_id, arr);
      }

      // Calculer un score par véhicule
      const scores = new Map<string, ReliabilityScore>();
      for (const vehicle of vehiclesRes.data ?? []) {
        const score = computeReliabilityScore({
          inspections: inspMap.get(vehicle.id) ?? [],
          maintenances: maintMap.get(vehicle.id) ?? [],
          fuelRecords: fuelMap.get(vehicle.id) ?? [],
          vehicle: vehicle as VehicleComplianceData,
        });
        scores.set(vehicle.id, score);
      }

      return scores;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 1,
  });
}
