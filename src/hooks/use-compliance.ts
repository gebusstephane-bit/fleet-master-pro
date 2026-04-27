'use client';

/**
 * Hook React Query pour la conformité réglementaire
 * Récupère les données des véhicules et conducteurs avec leurs dates réglementaires
 */

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { cacheTimes } from '@/lib/query-config';
import { safeQuery } from '@/lib/supabase/client-safe';
import type { Vehicle, Driver } from '@/types';

// Types spécifiques pour la conformité
export interface VehicleComplianceData {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type?: string | null; // Type de véhicule (VL, PL, etc.)
  technical_control_date: string | null;
  technical_control_expiry: string | null;
  tachy_control_date: string | null;
  tachy_control_expiry: string | null;
  atp_date: string | null;
  atp_expiry: string | null;
  insurance_expiry: string | null;
  // Champs pour activités spéciales (ADR, Frigo)
  adr_certificate_date?: string | null;
  adr_certificate_expiry?: string | null;
  adr_equipment_check_date?: string | null;
  adr_equipment_expiry?: string | null;
  frigo_calibration_date?: string | null;
}

export interface DriverComplianceData {
  id: string;
  first_name: string;
  last_name: string;
  license_expiry: string | null;
  driver_card_expiry: string | null;
  fimo_date: string | null;
  fimo_expiry: string | null;
  fcos_expiry: string | null;
  medical_certificate_expiry: string | null;
  adr_certificate_expiry: string | null;
  cqc_expiry: string | null;
  cqc_expiry_date: string | null; // Champ legacy pour rétrocompatibilité
}

export interface ComplianceData {
  vehicles: VehicleComplianceData[];
  drivers: DriverComplianceData[];
}

// Clés de cache
const complianceKeys = {
  all: ['compliance'] as const,
  lists: (companyId: string) => [...complianceKeys.all, 'list', companyId] as const,
};

/**
 * Hook principal pour récupérer les données de conformité
 * Combine les données des véhicules et des conducteurs
 */
export function useCompliance(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery<ComplianceData>({
    queryKey: complianceKeys.lists(companyId || ''),
    queryFn: async () => {
      if (!companyId) {
        console.warn('[useCompliance] No companyId available');
        return { vehicles: [], drivers: [] };
      }

      const supabase = getSupabaseClient();

      // Récupérer les véhicules avec leurs dates réglementaires
      const vehiclesPromise = supabase
        .from('vehicles')
        .select(`
          id,
          registration_number,
          brand,
          model,
          type,
          technical_control_date,
          technical_control_expiry,
          tachy_control_date,
          tachy_control_expiry,
          atp_date,
          atp_expiry,
          insurance_expiry
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Récupérer les conducteurs avec leurs dates réglementaires
      const driversPromise = supabase
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          license_expiry,
          driver_card_expiry,
          fimo_date,
          fimo_expiry,
          fcos_expiry,
          medical_certificate_expiry,
          adr_certificate_expiry,
          cqc_expiry_date
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const [vehiclesResult, driversResult] = await Promise.all([vehiclesPromise, driversPromise]);

      let vehicleData = vehiclesResult.data || [];
      let driverData = driversResult.data || [];

      // Gestion des erreurs avec fallback
      if (vehiclesResult.error) {
        console.error('[useCompliance] Error fetching vehicles:', vehiclesResult.error);
        
        // Tentative fallback avec safeQuery
        if (vehiclesResult.error.message?.includes('infinite recursion') || vehiclesResult.error.code === '42P17') {
          const { data: fallbackVehicles, error: fallbackError } = await safeQuery<Vehicle>('vehicles', companyId, {
            orderBy: { column: 'created_at', ascending: false },
            limit: 1000,
          });
          
          if (!fallbackError && fallbackVehicles) {
            vehicleData = fallbackVehicles as any[];
          }
        } else {
          throw new Error(vehiclesResult.error.message);
        }
      }

      if (driversResult.error) {
        console.error('[useCompliance] Error fetching drivers:', driversResult.error);
        
        // Tentative fallback avec safeQuery
        if (driversResult.error.message?.includes('infinite recursion') || driversResult.error.code === '42P17') {
          const { data: fallbackDrivers, error: fallbackError } = await safeQuery<Driver>('drivers', companyId, {
            orderBy: { column: 'created_at', ascending: false },
            limit: 1000,
          });
          
          if (!fallbackError && fallbackDrivers) {
            driverData = fallbackDrivers as any[];
          }
        } else {
          throw new Error(driversResult.error.message);
        }
      }

      // Mapper les données vers le format attendu
      const vehicles: VehicleComplianceData[] = vehicleData.map((v: any) => ({
        id: v.id,
        immatriculation: v.registration_number,
        marque: v.brand,
        modele: v.model,
        type: v.type,
        technical_control_date: v.technical_control_date,
        technical_control_expiry: v.technical_control_expiry,
        tachy_control_date: v.tachy_control_date,
        tachy_control_expiry: v.tachy_control_expiry,
        atp_date: v.atp_date,
        atp_expiry: v.atp_expiry,
        insurance_expiry: v.insurance_expiry,
      }));

      const drivers: DriverComplianceData[] = driverData.map((d: any) => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        license_expiry: d.license_expiry,
        driver_card_expiry: d.driver_card_expiry,
        fimo_date: d.fimo_date,
        fimo_expiry: d.fimo_expiry,
        fcos_expiry: d.fcos_expiry,
        medical_certificate_expiry: d.medical_certificate_expiry,
        adr_certificate_expiry: d.adr_certificate_expiry,
        cqc_expiry: d.cqc_expiry_date,
        cqc_expiry_date: d.cqc_expiry_date || null,
      }));

      return { vehicles, drivers };
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.compliance,
  });
}

/**
 * Hook pour compter les documents critiques (à renouveler dans 30 jours ou expirés)
 */
export function useCriticalDocumentsCount(options?: { enabled?: boolean }) {
  const { data } = useCompliance(options);
  
  if (!data) {
    return {
      critical30Days: 0,
      warning60Days: 0,
      missing: 0,
      total: 0,
    };
  }

  // Importer dynamiquement pour éviter les dépendances circulaires
  const { getDocumentStatus } = require('@/lib/compliance-utils');

  let critical30Days = 0;
  let warning60Days = 0;
  let missing = 0;
  let total = 0;

  // Vérifier les véhicules
  for (const vehicle of data.vehicles) {
    const dates = [
      vehicle.technical_control_expiry || vehicle.technical_control_date,
      vehicle.tachy_control_expiry || vehicle.tachy_control_date,
      vehicle.atp_expiry || vehicle.atp_date,
      vehicle.insurance_expiry,
    ];

    for (const date of dates) {
      if (!date) {
        missing++;
        total++;
        continue;
      }
      total++;
      const status = getDocumentStatus(date);
      if (status.status === 'expired') critical30Days++;
      else if (status.status === 'warning') warning60Days++;
    }
  }

  // Vérifier les conducteurs
  for (const driver of data.drivers) {
    const dates = [
      driver.license_expiry,
      driver.driver_card_expiry,
      driver.fimo_expiry || driver.fimo_date,
      driver.fcos_expiry,
      driver.medical_certificate_expiry,
      driver.adr_certificate_expiry,
    ];

    for (const date of dates) {
      if (!date) {
        missing++;
        total++;
        continue;
      }
      total++;
      const status = getDocumentStatus(date);
      if (status.status === 'expired') critical30Days++;
      else if (status.status === 'warning') warning60Days++;
    }
  }

  return {
    critical30Days,
    warning60Days,
    missing,
    total,
  };
}
