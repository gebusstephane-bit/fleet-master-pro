/**
 * Server-side Supabase avec optimisations N+1
 * Charge les relations en une seule requête
 */

import { createClient, createAdminClient } from './server';
import { logger } from '@/lib/logger';

export interface UserWithCompanyOptimized {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  is_active: boolean;
  avatar_url?: string | null;
  company?: {
    id: string;
    name: string;
    logo_url?: string | null;
    subscription_plan?: string;
    max_vehicles?: number;
    max_drivers?: number;
  } | null;
}

/**
 * Récupère l'utilisateur avec sa company en UNE SEULE requête (pas de N+1)
 * Utilise une jointure via la relation foreign key
 */
export async function getUserWithCompanyOptimized(): Promise<UserWithCompanyOptimized | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    const adminClient = createAdminClient();
    
    // UNE SEULE requête avec jointure sur companies via FK
    // Pas de N+1 problem ici
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select(`
        *,
        companies:company_id (
          id,
          name,
          logo_url,
          subscription_plan,
          max_vehicles,
          max_drivers
        )
      `)
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      logger.error('getUserWithCompanyOptimized: Profile not found', profileError);
      return null;
    }
    
    // Transformer le résultat
    const { companies, ...userData } = profile;
    
    return {
      ...userData,
      company: companies || null,
    } as UserWithCompanyOptimized;
  } catch (error) {
    logger.error('getUserWithCompanyOptimized: Error', error);
    return null;
  }
}

/**
 * Récupère les véhicules avec leurs drivers en UNE SEULE requête
 * Optimisé pour la liste paginée
 */
export async function getVehiclesWithDrivers(
  companyId: string,
  options: {
    cursor?: string | null;
    pageSize?: number;
    status?: string;
  } = {}
) {
  const { cursor, pageSize = 20, status } = options;
  
  const adminClient = createAdminClient();
  
  let query = adminClient
    .from('vehicles')
    .select(`
      *,
      drivers:assigned_driver_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(pageSize);
  
  // Filtrer par curseur (pour pagination)
  if (cursor) {
    query = query.lt('created_at', cursor); // plus ancien que le curseur
  }
  
  // Filtrer par status si fourni
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  // Déterminer le nextCursor
  const nextCursor = data && data.length === pageSize 
    ? data[data.length - 1].created_at 
    : null;
  
  return {
    data: data || [],
    nextCursor,
    hasNextPage: data?.length === pageSize,
  };
}

/**
 * Récupère les maintenances avec les infos véhicules en UNE requête
 */
export async function getMaintenancesWithVehicles(
  companyId: string,
  options: {
    cursor?: string | null;
    pageSize?: number;
    status?: string;
  } = {}
) {
  const { cursor, pageSize = 20, status } = options;
  
  const adminClient = createAdminClient();
  
  // Requête qui joint vehicles pour obtenir les maintenances
  let query = adminClient
    .from('maintenance_records')
    .select(`
      *,
      vehicles!inner(
        id,
        registration_number,
        brand,
        model,
        company_id
      )
    `)
    .eq('vehicles.company_id', companyId)
    .order('service_date', { ascending: false })
    .limit(pageSize);
  
  if (cursor) {
    query = query.lt('service_date', cursor);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  const nextCursor = data && data.length === pageSize
    ? data[data.length - 1].service_date
    : null;
  
  return {
    data: data || [],
    nextCursor,
    hasNextPage: data?.length === pageSize,
  };
}
