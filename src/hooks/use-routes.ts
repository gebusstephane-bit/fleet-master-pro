/**
 * Hooks React Query pour les tournées
 * VERSION SÉCURISÉE - Utilise safeQuery avec fallback RLS
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { safeQuery } from '@/lib/supabase/client-safe';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import {
  createRoute,
  updateRoute,
  deleteRoute,
  startRoute,
  completeRoute,
} from '@/actions/routes';
import { cacheTimes } from '@/lib/query-config';
import { getSupabaseClient } from '@/lib/supabase/client';

// Types
export interface Route {
  id: string;
  company_id: string;
  name: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  vehicle_id?: string;
  driver_id?: string;
  route_date?: string;
  started_at?: string;
  completed_at?: string;
  total_distance?: number;
  estimated_duration?: number;
  fuel_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
  } | null;
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  route_stops?: { count: number } | null;
}

// Clés de cache
export const routeKeys = {
  all: ['routes'] as const,
  lists: (companyId: string) => [...routeKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...routeKeys.all, 'detail', id] as const,
};

// Hook récupération liste tournées - VERSION SÉCURISÉE
export function useRoutes(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: routeKeys.lists(companyId || ''),
    queryFn: async () => {
      logger.info('useRoutes: Fetching', { companyId });
      
      if (!companyId) {
        logger.warn('No companyId available');
        return [];
      }
      
      const supabase = getSupabaseClient();
      
      // Essayer avec jointures
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicles(registration_number, brand, model),
          drivers(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('route_date', { ascending: false });
      
      if (error) {
        logger.error('Error fetching routes', error);
        
        // Fallback sans jointures
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          logger.warn('RLS recursion, trying fallback...');
          
          const { data: routesData, error: routesError } = await safeQuery<Route>('routes', companyId, {
            orderBy: { column: 'route_date', ascending: false },
            limit: 1000,
          });
          
          if (routesError) {
            throw new Error(routesError.message);
          }
          
          // Récupérer véhicules et chauffeurs séparément
          const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id, registration_number, brand, model')
            .in('id', routesData?.map(r => r.vehicle_id).filter(Boolean) || []);
          
          const { data: drivers } = await supabase
            .from('drivers')
            .select('id, first_name, last_name')
            .in('id', routesData?.map(r => r.driver_id).filter(Boolean) || []);
          
          // Fusionner
          const enriched = (routesData || []).map(route => ({
            ...route,
            vehicles: vehicles?.find(v => v.id === route.vehicle_id) || null,
            drivers: drivers?.find(d => d.id === route.driver_id) || null,
          }));
          
          return enriched;
        }
        
        throw new Error(error.message);
      }
      
      logger.info('Fetched routes', { count: data?.length || 0 });
      return (data || []) as Route[];
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 2,
    retryDelay: 1000,
    ...cacheTimes.routes,
  });
}

// Hook récupération détail tournée
export function useRoute(id: string, options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: async () => {
      if (!id || !companyId) return null;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicles(*),
          drivers(*),
          route_stops(*)
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error fetching route', error);
        throw new Error(error.message);
      }
      
      return data as Route;
    },
    enabled: options?.enabled !== false && !!id && !!companyId,
    ...cacheTimes.routes,
  });
}

// Hook création tournée
export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await createRoute(data);
      console.log('Create route raw result:', result);
      
      if (!result) {
        throw new Error('Pas de réponse du serveur');
      }
      
      if ((result as any).serverError) {
        throw new Error(`Erreur serveur: ${(result as any).serverError.message || 'Inconnue'}`);
      }
      
      if ((result as any).validationErrors) {
        throw new Error(`Erreur de validation: ${JSON.stringify((result as any).validationErrors)}`);
      }
      
      const responseData = (result as any).data;
      if (!responseData?.success) {
        const errorMsg = responseData?.error || 'Erreur création tournée';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      
      return responseData.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists(companyId) });
      }
      toast.success('Tournée créée avec succès');
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast.error(error.message);
    },
  });
}

// Hook mise à jour tournée
export function useUpdateRoute() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await updateRoute(data);
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur mise à jour');
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.detail((variables as any).id) });
      toast.success('Tournée mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook suppression tournée
export function useDeleteRoute() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRoute({ id });
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur suppression');
      }
      return (result as any).data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists(companyId) });
      }
      toast.success('Tournée supprimée');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook démarrer tournée
export function useStartRoute() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await startRoute({ id });
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur démarrage');
      }
      return (result as any).data;
    },
    onSuccess: (_, id) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(id) });
      toast.success('Tournée démarrée !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook terminer tournée
export function useCompleteRoute() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await completeRoute({ id });
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur finalisation');
      }
      return (result as any).data;
    },
    onSuccess: (_, id) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(id) });
      toast.success('Tournée terminée !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
