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
} from '@/actions/drivers';
import { cacheTimes } from '@/lib/query-config';

// Types
export interface Driver {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  license_type: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  address?: string;
  city?: string;
  hire_date?: string;
  cqc_card_number?: string;
  cqc_expiry_date?: string;
  cqc_category?: 'PASSENGER' | 'GOODS' | 'BOTH';
  created_at: string;
  updated_at: string;
}

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
        return (data || []) as Driver[];
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
      
      return data as Driver;
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
    mutationFn: async (data: any) => {
      const result = await createDriver(data);
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur création');
      }
      return (result as any).data;
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
    mutationFn: async (data: any) => {
      const result = await updateDriver(data);
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur mise à jour');
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: driverKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: driverKeys.detail((variables as any).id) });
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
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur suppression');
      }
      return (result as any).data;
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
