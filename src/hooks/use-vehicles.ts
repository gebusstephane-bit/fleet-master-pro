/**
 * Hook useVehicles - VERSION UNIFIÉE (comme useRoutes)
 * Utilise le même pattern que useRoutes qui fonctionne
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import { createVehicle, deleteVehicle as deleteVehicleAction } from '@/actions/vehicles';
import { cacheTimes } from '@/lib/query-config';
import { toast } from 'sonner';
import { safeQuery } from '@/lib/supabase/client-safe';

// Types
export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  fuel_type: string;
  status: string;
  purchase_date?: string;
  created_at: string;
  updated_at: string;
  qr_code_data?: string;
  qr_code_url?: string;
  vin?: string;
  year?: number;
  color?: string;
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface VehicleWithDriver extends Vehicle {
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null | undefined;
}

// Clés de cache
const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: (companyId: string) => [...vehicleKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...vehicleKeys.all, 'detail', id] as const,
};

// Hook principal - MEME PATTERN QUE useRoutes
export function useVehicles(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: vehicleKeys.lists(companyId || ''),
    queryFn: async () => {
      console.log('[useVehicles] Fetching with companyId:', companyId?.slice(0, 8));
      
      if (!companyId) {
        console.warn('[useVehicles] No companyId available');
        return [];
      }
      
      // Tentative 1 : Requête directe (comme useRoutes)
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
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (!error) {
        console.log('[useVehicles] Direct query SUCCESS:', data?.length, 'records');
        return (data || []) as VehicleWithDriver[];
      }
      
      // Tentative 2 : Fallback avec safeQuery si RLS error
      console.warn('[useVehicles] Direct query failed:', error.code, error.message?.slice(0, 50));
      
      if (error.message?.includes('infinite recursion') || error.code === '42P17') {
        console.warn('[useVehicles] RLS recursion, trying safeQuery fallback...');
        
        const { data: vehiclesData, error: vehiclesError, debug } = await safeQuery<Vehicle>('vehicles', companyId, {
          orderBy: { column: 'created_at', ascending: false },
          limit: 1000,
        });
        
        console.log('[useVehicles] safeQuery result:', { 
          count: vehiclesData?.length, 
          error: vehiclesError?.message?.slice(0, 50),
          debug 
        });
        
        if (vehiclesError) {
          throw new Error(vehiclesError.message);
        }
        
        return vehiclesData || [];
      }
      
      throw new Error(error.message);
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.vehicles,
  });
}

// Hook détail
export function useVehicle(vehicleId: string, options?: any) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: vehicleKeys.detail(vehicleId),
    queryFn: async () => {
      if (!vehicleId || !companyId) return null;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error fetching vehicle', error);
        throw new Error(error.message);
      }
      
      return data as Vehicle;
    },
    enabled: !!vehicleId && !!companyId,
    ...cacheTimes.vehicles,
    ...options,
  });
}

// Hook création
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vehicle: any) => {
      const result = await createVehicle(vehicle);
      
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur création');
      }
      
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Véhicule créé avec succès');
    },
    onError: (error: any) => {
      logger.error('Error creating vehicle', error);
      toast.error(error.message || 'Impossible de créer le véhicule');
    },
  });
}

// Hook mise à jour
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const supabase = getSupabaseClient();
      
      const { data: updated, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating vehicle', error);
        throw new Error(error.message);
      }
      
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Véhicule mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur mise à jour');
    },
  });
}

// Hook suppression
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const result = await deleteVehicleAction(id);
      
      if (!(result as any)?.success) {
        throw new Error((result as any)?.error || 'Erreur suppression');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Véhicule supprimé');
    },
    onError: (error: any) => {
      logger.error('Error deleting vehicle', error);
      toast.error(error.message || 'Impossible de supprimer');
    },
  });
}

export type { VehicleWithDriver };
