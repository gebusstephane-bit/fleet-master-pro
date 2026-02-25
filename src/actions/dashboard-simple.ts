/**
 * Server Action: Dashboard SIMPLE (version test)
 * Sans filtre company_id - pour déboguer
 */

'use server';

import { addDays, startOfMonth } from 'date-fns';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

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
    
    const supabase = await createClient();

    // Récupérer les véhicules (RLS gère le filtre company_id)
    const { data: vehicles, error: vehiclesError, count } = await supabase
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

    // Chauffeurs (RLS gère le filtre company_id)
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id');

    if (driversError) {
      logger.error('getSimpleKPIs: ERREUR CHAUFFEURS', { error: driversError.message });
    }

    // Maintenances (RLS gère le filtre company_id)
    const { data: maintenances, error: maintError } = await supabase
      .from('maintenance_records')
      .select('id');

    if (maintError) {
      logger.error('getSimpleKPIs: ERREUR MAINTENANCES', { error: maintError.message });
    }

    // Inspections (RLS gère le filtre company_id)
    const { data: inspections, error: inspectError } = await supabase
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
    
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Non authentifié' };
    }

    // Véhicules (RLS gère le filtre company_id)
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*');

    if (vehiclesError) {
      logger.error('getKPIsWithFallback: ERREUR VEHICULES', { error: vehiclesError.message });
      throw vehiclesError;
    }

    // Chauffeurs (RLS gère le filtre company_id)
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id');

    // Maintenances (RLS gère le filtre company_id)
    const { data: maintenances } = await supabase
      .from('maintenance_records')
      .select('id');

    // Inspections (RLS gère le filtre company_id)
    const { data: inspections } = await supabase
      .from('inspections')
      .select('id');

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
