/**
 * Server Action: Dashboard SIMPLE (version test)
 * Sans filtre company_id - pour déboguer
 */

'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { addDays, startOfMonth } from 'date-fns';

export interface SimpleKPIs {
  vehicles: number;
  drivers: number;
  maintenances: number;
  inspections: number;
}

/**
 * Version SIMPLE - récupère tous les véhicules sans filtre company_id
 */
export async function getSimpleKPIs(): Promise<{ data?: SimpleKPIs; error?: string }> {
  try {
    logger.info('getSimpleKPIs: DEBUT - sans filtre company_id');
    
    const adminClient = createAdminClient();

    // Récupérer TOUS les véhicules (sans filtre)
    const { data: vehicles, error: vehiclesError, count } = await adminClient
      .from('vehicles')
      .select('*', { count: 'exact' });

    if (vehiclesError) {
      logger.error('getSimpleKPIs: ERREUR VEHICULES', { error: vehiclesError.message });
      throw vehiclesError;
    }

    logger.info('getSimpleKPIs: Vehicules trouves', { 
      count: vehicles?.length || 0,
      exactCount: count,
      sample: vehicles?.[0] ? { 
        id: vehicles[0].id, 
        registration: vehicles[0].registration_number,
        company_id: vehicles[0].company_id 
      } : null
    });

    // Chauffeurs
    const { data: drivers, error: driversError } = await adminClient
      .from('drivers')
      .select('id');

    if (driversError) {
      logger.error('getSimpleKPIs: ERREUR CHAUFFEURS', { error: driversError.message });
    }

    // Maintenances
    const { data: maintenances, error: maintError } = await adminClient
      .from('maintenance_records')
      .select('id');

    if (maintError) {
      logger.error('getSimpleKPIs: ERREUR MAINTENANCES', { error: maintError.message });
    }

    // Inspections
    const { data: inspections, error: inspectError } = await adminClient
      .from('inspections')
      .select('id');

    if (inspectError) {
      logger.error('getSimpleKPIs: ERREUR INSPECTIONS', { error: inspectError.message });
    }

    const result = {
      vehicles: vehicles?.length || 0,
      drivers: drivers?.length || 0,
      maintenances: maintenances?.length || 0,
      inspections: inspections?.length || 0,
    };

    logger.info('getSimpleKPIs: SUCCES', result);

    return { data: result };

  } catch (error) {
    logger.error('getSimpleKPIs: EXCEPTION', { error: (error as Error).message });
    return { error: 'Erreur lors du chargement des KPIs' };
  }
}

/**
 * Version avec company_id depuis le premier véhicule
 */
export async function getKPIsWithFallback(): Promise<{ data?: SimpleKPIs; error?: string }> {
  try {
    logger.info('getKPIsWithFallback: DEBUT');
    
    const adminClient = createAdminClient();

    // Trouver le premier company_id disponible
    const { data: firstVehicle } = await adminClient
      .from('vehicles')
      .select('company_id')
      .limit(1)
      .single();

    const companyId = firstVehicle?.company_id;
    logger.info('getKPIsWithFallback: CompanyId trouve', { companyId });

    if (!companyId) {
      return { error: 'Aucun company_id trouve' };
    }

    // Véhicules avec filtre
    const { data: vehicles, error: vehiclesError } = await adminClient
      .from('vehicles')
      .select('*')
      .eq('company_id', companyId);

    if (vehiclesError) {
      logger.error('getKPIsWithFallback: ERREUR VEHICULES', { error: vehiclesError.message });
      throw vehiclesError;
    }

    // Chauffeurs
    const { data: drivers } = await adminClient
      .from('drivers')
      .select('id')
      .eq('company_id', companyId);

    // Maintenances
    const { data: maintenances } = await adminClient
      .from('maintenance_records')
      .select('id')
      .eq('company_id', companyId);

    // Inspections
    const { data: inspections } = await adminClient
      .from('inspections')
      .select('id')
      .eq('company_id', companyId);

    const result = {
      vehicles: vehicles?.length || 0,
      drivers: drivers?.length || 0,
      maintenances: maintenances?.length || 0,
      inspections: inspections?.length || 0,
    };

    logger.info('getKPIsWithFallback: SUCCES', result);

    return { data: result };

  } catch (error) {
    logger.error('getKPIsWithFallback: EXCEPTION', { error: (error as Error).message });
    return { error: 'Erreur lors du chargement des KPIs' };
  }
}
