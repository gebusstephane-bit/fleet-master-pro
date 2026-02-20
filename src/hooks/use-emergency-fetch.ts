/**
 * Hook de secours pour récupérer les données quand RLS est cassé
 * Utilise l'API REST directement comme contournement
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import { apiQuery } from '@/lib/supabase/rls-bypass';
import { getSupabaseClient } from '@/lib/supabase/client';

// Types
export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  status: string;
  created_at: string;
}

export interface Driver {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
}

export interface Route {
  id: string;
  company_id: string;
  name: string;
  status: string;
  route_date: string;
  created_at: string;
}

// Hook de secours pour véhicules
export function useEmergencyVehicles() {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['emergency', 'vehicles', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      logger.warn('Using emergency fetch for vehicles');

      // Essayer d'abord avec le client Supabase normal
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Vehicle[];
      }

      // Si erreur RLS, essayer l'API REST directe
      if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        logger.warn('RLS error, trying API bypass');
        
        const { data: apiData, error: apiError } = await apiQuery<Vehicle>('vehicles', {
          select: '*',
          eq: { column: 'company_id', value: companyId },
          order: { column: 'created_at', ascending: false },
          limit: 1000,
        });

        if (apiError) {
          logger.error('API bypass also failed', apiError);
          throw new Error('Impossible de récupérer les véhicules');
        }

        return apiData || [];
      }

      throw new Error(error?.message || 'Erreur inconnue');
    },
    enabled: !!companyId,
    retry: 1,
  });
}

// Hook de secours pour chauffeurs
export function useEmergencyDrivers() {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['emergency', 'drivers', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      logger.warn('Using emergency fetch for drivers');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Driver[];
      }

      if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        logger.warn('RLS error, trying API bypass');
        
        const { data: apiData, error: apiError } = await apiQuery<Driver>('drivers', {
          select: '*',
          eq: { column: 'company_id', value: companyId },
          order: { column: 'created_at', ascending: false },
          limit: 1000,
        });

        if (apiError) {
          throw new Error('Impossible de récupérer les chauffeurs');
        }

        return apiData || [];
      }

      throw new Error(error?.message || 'Erreur inconnue');
    },
    enabled: !!companyId,
    retry: 1,
  });
}

// Hook de secours pour routes
export function useEmergencyRoutes() {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['emergency', 'routes', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      logger.warn('Using emergency fetch for routes');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicles(registration_number, brand, model),
          drivers(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('route_date', { ascending: false });

      if (!error && data) {
        return data as Route[];
      }

      if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        logger.warn('RLS error, trying API bypass');
        
        const { data: apiData, error: apiError } = await apiQuery<Route>('routes', {
          select: '*,vehicles(registration_number,brand,model),drivers(first_name,last_name)',
          eq: { column: 'company_id', value: companyId },
          order: { column: 'route_date', ascending: false },
          limit: 1000,
        });

        if (apiError) {
          throw new Error('Impossible de récupérer les tournées');
        }

        return apiData || [];
      }

      throw new Error(error?.message || 'Erreur inconnue');
    },
    enabled: !!companyId,
    retry: 1,
  });
}
