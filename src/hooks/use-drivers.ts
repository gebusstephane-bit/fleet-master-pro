/**
 * Hooks React Query pour les chauffeurs
 * VERSION CORRIGÉE - Jointure supprimée (n'existe pas dans drivers)
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { safeQuery } from '@/lib/supabase/client-safe';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import {
  createDriver,
  updateDriver,
  deleteDriver,
  type CreateDriverInput,
  type UpdateDriverInput,
} from '@/actions/drivers';
import { cacheTimes } from '@/lib/query-config';
import { Driver } from '@/types';
import { ApiResponse } from '@/types';

// Re-export du type Driver depuis types/index
export type { Driver };

// Clés de cache
export const driverKeys = {
  all: ['drivers'] as const,
  lists: (companyId: string) => [...driverKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...driverKeys.all, 'detail', id] as const,
};

// Hook récupération liste chauffeurs - CORRIGÉ (sans jointure invalide)
export function useDrivers(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: driverKeys.lists(companyId || ''),
    queryFn: async () => {
      console.log('[useDrivers] Fetching with companyId:', companyId?.slice(0, 8));
      
      if (!companyId) {
        console.warn('[useDrivers] No companyId available');
        return [];
      }
      
      // Tentative 1 : Requête directe SANS jointure (elle n'existe pas dans drivers)
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('drivers')
        .select('*')  // ← CORRIGÉ: Pas de jointure sur vehicles
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (!error) {
        console.log('[useDrivers] Direct query SUCCESS:', data?.length, 'records');
        return (data || []) as unknown as Driver[];
      }
      
      // Tentative 2 : Fallback avec safeQuery si RLS error
      console.warn('[useDrivers] Direct query failed:', error.code, error.message?.slice(0, 50));
      
      if (error.message?.includes('infinite recursion') || error.code === '42P17') {
        console.warn('[useDrivers] RLS recursion, trying safeQuery fallback...');
        
        const { data: driversData, error: driversError, debug } = await safeQuery<Driver>('drivers', companyId, {
          orderBy: { column: 'created_at', ascending: false },
          limit: 1000,
        });
        
        console.log('[useDrivers] safeQuery result:', { 
          count: driversData?.length, 
          error: driversError?.message?.slice(0, 50),
          debug 
        });
        
        if (driversError) {
          throw new Error(driversError.message);
        }
        
        return driversData || [];
      }
      
      throw new Error(error.message);
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.drivers,
  });
}

// Hook récupération détail chauffeur
export function useDriver(id: string, options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: async () => {
      if (!id || !companyId) return null;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error fetching driver', error);
        throw new Error(error.message);
      }
      
      return data as unknown as Driver;
    },
    enabled: options?.enabled !== false && !!id && !!companyId,
    ...cacheTimes.drivers,
  });
}

// Hook création chauffeur
export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: CreateDriverInput) => {
      const result = await createDriver(data);
      const typedResult = result as ApiResponse<Driver>;
      if (!typedResult?.success) {
        throw new Error(typedResult?.error || 'Erreur création');
      }
      return typedResult.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: driverKeys.lists(companyId) });
      }
      toast.success('Chauffeur créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook mise à jour chauffeur
export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: UpdateDriverInput) => {
      const result = await updateDriver(data);
      const typedResult = result as ApiResponse<Driver>;
      if (!typedResult?.success) {
        throw new Error(typedResult?.error || 'Erreur mise à jour');
      }
      return typedResult.data;
    },
    onSuccess: (_, variables) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: driverKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.id) });
      toast.success('Chauffeur mis à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook suppression chauffeur
export function useDeleteDriver() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDriver({ id });
      const typedResult = result as ApiResponse<Driver>;
      if (!typedResult?.success) {
        throw new Error(typedResult?.error || 'Erreur suppression');
      }
      return typedResult.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: driverKeys.lists(companyId) });
      }
      toast.success('Chauffeur supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
