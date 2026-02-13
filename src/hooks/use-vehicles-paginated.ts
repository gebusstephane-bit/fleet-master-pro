/**
 * Hook useVehicles avec pagination cursor-based
 * Supporte 1000+ véhicules avec infinite scroll
 */

'use client';

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { cacheTimes, paginationConfig } from '@/lib/query-config';
import { logger } from '@/lib/logger';
import type { Vehicle } from './use-vehicles';

export interface VehicleWithDriver extends Vehicle {
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null;
}

interface VehiclesPage {
  data: VehicleWithDriver[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

// Clés de query
const vehicleKeys = {
  all: ['vehicles'] as const,
  paginated: (companyId: string, filters?: Record<string, unknown>) => 
    [...vehicleKeys.all, 'paginated', companyId, filters] as const,
  detail: (id: string) => [...vehicleKeys.all, 'detail', id] as const,
};

/**
 * Hook pour la pagination infinite scroll des véhicules
 * Utilise cursor-based pagination (plus efficace que offset)
 */
export function useVehiclesInfinite(options: {
  pageSize?: number;
  status?: string;
  enabled?: boolean;
} = {}) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  const pageSize = Math.min(
    options.pageSize || paginationConfig.defaultPageSize,
    paginationConfig.maxPageSize
  );
  
  return useInfiniteQuery({
    queryKey: vehicleKeys.paginated(companyId || '', { 
      pageSize, 
      status: options.status 
    }),
    queryFn: async ({ pageParam }): Promise<VehiclesPage> => {
      if (!companyId) {
        return { data: [], nextCursor: null, hasNextPage: false };
      }
      
      const supabase = getSupabaseClient();
      
      let query = supabase
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
      
      // Cursor-based pagination
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }
      
      // Filtrer par status
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching vehicles', error);
        throw new Error(error.message);
      }
      
      const vehicles = (data || []) as VehicleWithDriver[];
      const hasNextPage = vehicles.length === pageSize;
      const nextCursor = hasNextPage 
        ? vehicles[vehicles.length - 1].created_at 
        : null;
      
      return {
        data: vehicles,
        nextCursor,
        hasNextPage,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: options.enabled !== false && !!companyId,
    ...cacheTimes.vehicles,
  });
}

/**
 * Hook pour récupérer un véhicule spécifique avec prefetching
 */
export function useVehicleDetail(vehicleId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: vehicleKeys.detail(vehicleId || ''),
    queryFn: async (): Promise<VehicleWithDriver | null> => {
      if (!vehicleId) return null;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
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
        .eq('id', vehicleId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      return data as VehicleWithDriver;
    },
    enabled: !!vehicleId,
    ...cacheTimes.vehicles,
  });
  
  // Fonction pour prefetch le véhicule suivant (pour navigation rapide)
  const prefetchNext = (nextVehicleId: string) => {
    queryClient.prefetchQuery({
      queryKey: vehicleKeys.detail(nextVehicleId),
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('vehicles')
          .select('*, drivers:assigned_driver_id(id, first_name, last_name)')
          .eq('id', nextVehicleId)
          .single();
        return data;
      },
      staleTime: cacheTimes.vehicles.staleTime,
    });
  };
  
  return { ...query, prefetchNext };
}

/**
 * Hook pour créer un véhicule avec optimistic update
 */
export function useCreateVehicleOptimistic() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (vehicle: Omit<VehicleWithDriver, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      const supabase = getSupabaseClient();
      
      if (!companyId) {
        throw new Error('Company ID not found');
      }
      
      const vehicleId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          ...vehicle,
          id: vehicleId,
          company_id: companyId,
          qr_code_data: `fleetmaster://vehicle/${vehicleId}`,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data as VehicleWithDriver;
    },
    // Optimistic update
    onMutate: async (newVehicle) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.paginated(companyId || '') });
      
      const previousData = queryClient.getQueryData(vehicleKeys.paginated(companyId || ''));
      
      // Ajouter temporairement le véhicule à la liste
      queryClient.setQueryData(vehicleKeys.paginated(companyId || ''), (old: any) => {
        if (!old) return old;
        const optimisticVehicle = {
          ...newVehicle,
          id: 'temp-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => 
            index === 0 
              ? { ...page, data: [optimisticVehicle, ...page.data] }
              : page
          ),
        };
      });
      
      return { previousData };
    },
    onError: (err, newVehicle, context) => {
      // Rollback en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(vehicleKeys.paginated(companyId || ''), context.previousData);
      }
    },
    onSettled: () => {
      // Invalider le cache pour recharger les données réelles
      queryClient.invalidateQueries({ queryKey: vehicleKeys.paginated(companyId || '') });
    },
  });
}

/**
 * Hook pour mettre à jour avec optimistic update
 */
export function useUpdateVehicleOptimistic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehicleWithDriver> & { id: string }) => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data as VehicleWithDriver;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.detail(id) });
      
      const previousData = queryClient.getQueryData(vehicleKeys.detail(id));
      
      // Mettre à jour optimistiquement
      queryClient.setQueryData(vehicleKeys.detail(id), (old: any) => ({
        ...old,
        ...updates,
      }));
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(vehicleKeys.detail(variables.id), context.previousData);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

/**
 * Hook pour supprimer avec optimistic update
 */
export function useDeleteVehicleOptimistic() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.paginated(companyId || '') });
      
      const previousData = queryClient.getQueryData(vehicleKeys.paginated(companyId || ''));
      
      // Supprimer optimistiquement
      queryClient.setQueryData(vehicleKeys.paginated(companyId || ''), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((v: VehicleWithDriver) => v.id !== id),
          })),
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(vehicleKeys.paginated(companyId || ''), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.paginated(companyId || '') });
    },
  });
}
