'use server';

/**
 * Server Actions - Compliance Dashboard
 * Récupère les échéances réglementaires pour le dashboard
 * 
 * PRINCIPE: Utilise getVehicleComplianceDeadlines depuis calculate-deadlines.ts
 * ZERO RÉGRESSION: Véhicules sans activité gardent le comportement legacy
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { 
  getVehicleComplianceDeadlines, 
  type ComplianceDeadline,
  type VehicleComplianceData 
} from '@/lib/compliance/calculate-deadlines';
import type { Database } from '@/types/supabase';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ComplianceDashboardItem {
  id: string;
  vehicleId: string;
  vehicleInfo: {
    registrationNumber: string;
    brand: string;
    model: string;
    type: string;
  };
  document: string;
  documentCode: string;
  expiryDate: string;
  daysLeft: number;
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
  isMandatory: boolean;
  equipment: string[] | null;
  lastDate: string | null;
  frequencyMonths: number;
}

/**
 * Récupère le statut de compliance d'un véhicule
 * Utilise getVehicleComplianceDeadlines pour le calcul des échéances
 * 
 * RLS: Lecture autorisée si le véhicule appartient à l'entreprise du user
 */
export async function getVehicleComplianceStatus(
  vehicleId: string
): Promise<ActionResult<ComplianceDashboardItem[]>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer le profil pour vérifier l'entreprise
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { success: false, error: 'Profil ou entreprise non trouvé' };
    }

    // Récupérer le véhicule avec ses données de compliance
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        id,
        company_id,
        type,
        registration_number,
        brand,
        model,
        technical_control_date,
        technical_control_expiry,
        tachy_control_date,
        tachy_control_expiry,
        atp_date,
        atp_expiry
      `)
      .eq('id', vehicleId)
      .eq('company_id', profile.company_id)
      .single();

    if (vehicleError || !vehicle) {
      return { success: false, error: 'Véhicule non trouvé ou accès non autorisé' };
    }

    // Mapper vers VehicleComplianceData
    const vehicleData: VehicleComplianceData = {
      id: vehicle.id,
      company_id: vehicle.company_id,
      type: (vehicle.type as VehicleComplianceData['type']) || 'FOURGON',
      technical_control_date: vehicle.technical_control_date,
      technical_control_expiry: vehicle.technical_control_expiry,
      tachy_control_date: vehicle.tachy_control_date,
      tachy_control_expiry: vehicle.tachy_control_expiry,
      atp_date: vehicle.atp_date,
      atp_expiry: vehicle.atp_expiry,
    };

    // Utiliser la fonction de calculate-deadlines.ts
    const deadlines = await getVehicleComplianceDeadlines(
      vehicleData,
      profile.company_id,
      supabase
    );

    // Formater pour le dashboard
    const formatted: ComplianceDashboardItem[] = deadlines.map((d) => ({
      id: `${vehicleId}-${d.documentCode}`,
      vehicleId,
      vehicleInfo: {
        registrationNumber: vehicle.registration_number,
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
      },
      document: d.documentName,
      documentCode: d.documentCode,
      expiryDate: d.expiryDate,
      daysLeft: d.daysLeft,
      status: d.status,
      isMandatory: d.isMandatory,
      equipment: d.equipmentList,
      lastDate: d.lastDate,
      frequencyMonths: d.frequencyMonths,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error('CONFORMITE_ERROR [getVehicleComplianceStatus]:', error);
    logger.error('getVehicleComplianceStatus: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Récupère toutes les échéances de compliance pour tous les véhicules de l'entreprise
 * 
 * RLS: Lecture autorisée pour les membres de l'entreprise
 */
export async function getCompanyComplianceDashboard(
  companyId?: string
): Promise<ActionResult<ComplianceDashboardItem[]>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    // Déterminer le companyId
    let targetCompanyId = companyId;
    
    if (!targetCompanyId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile?.company_id) {
        return { success: false, error: 'Entreprise non trouvée' };
      }
      targetCompanyId = profile.company_id;
    }

    // Récupérer tous les véhicules de l'entreprise
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        company_id,
        type,
        registration_number,
        brand,
        model,
        technical_control_date,
        technical_control_expiry,
        tachy_control_date,
        tachy_control_expiry,
        atp_date,
        atp_expiry
      `)
      .eq('company_id', targetCompanyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      logger.error('getCompanyComplianceDashboard: Erreur véhicules', new Error(vehiclesError.message));
      return { success: false, error: vehiclesError.message };
    }

    // Calculer les échéances pour chaque véhicule
    const allDeadlines: ComplianceDashboardItem[] = [];

    for (const vehicle of (vehicles || [])) {
      const vehicleData: VehicleComplianceData = {
        id: vehicle.id,
        company_id: vehicle.company_id,
        type: (vehicle.type as VehicleComplianceData['type']) || 'FOURGON',
        technical_control_date: vehicle.technical_control_date,
        technical_control_expiry: vehicle.technical_control_expiry,
        tachy_control_date: vehicle.tachy_control_date,
        tachy_control_expiry: vehicle.tachy_control_expiry,
        atp_date: vehicle.atp_date,
        atp_expiry: vehicle.atp_expiry,
      };

      try {
        const deadlines = await getVehicleComplianceDeadlines(
          vehicleData,
          targetCompanyId!,
          supabase
        );

        const formatted = deadlines.map((d) => ({
          id: `${vehicle.id}-${d.documentCode}`,
          vehicleId: vehicle.id,
          vehicleInfo: {
            registrationNumber: vehicle.registration_number,
            brand: vehicle.brand,
            model: vehicle.model,
            type: vehicle.type,
          },
          document: d.documentName,
          documentCode: d.documentCode,
          expiryDate: d.expiryDate,
          daysLeft: d.daysLeft,
          status: d.status,
          isMandatory: d.isMandatory,
          equipment: d.equipmentList,
          lastDate: d.lastDate,
          frequencyMonths: d.frequencyMonths,
        }));

        allDeadlines.push(...formatted);
      } catch (err) {
        logger.error(`getCompanyComplianceDashboard: Erreur pour véhicule ${vehicle.id}`, 
          err instanceof Error ? err : new Error(String(err)));
        // Continuer avec les autres véhicules
      }
    }

    // Trier par priorité: EXPIRED > CRITICAL > WARNING > OK
    const statusOrder: Record<string, number> = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, OK: 3 };
    allDeadlines.sort((a, b) => {
      const priorityDiff = statusOrder[a.status] - statusOrder[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysLeft - b.daysLeft;
    });

    return { success: true, data: allDeadlines };
  } catch (error) {
    console.error('CONFORMITE_ERROR [getCompanyComplianceDashboard]:', error);
    logger.error('getCompanyComplianceDashboard: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Vérifie si un véhicule a une activité ADR assignée
 * Utile pour afficher les alertes ADR dans le dashboard
 */
export async function checkVehicleADRActivity(
  vehicleId: string
): Promise<ActionResult<{ hasADR: boolean; activityType: string | null }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vehicle_activity_assignments')
      .select('activity')
      .eq('vehicle_id', vehicleId)
      .is('end_date', null)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    const hasADR = data?.activity === 'ADR_COLIS' || data?.activity === 'ADR_CITERNE';

    return { 
      success: true, 
      data: { 
        hasADR, 
        activityType: data?.activity || null 
      } 
    };
  } catch (error) {
    console.error('CONFORMITE_ERROR [checkVehicleADRActivity]:', error);
    logger.error('checkVehicleADRActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}
