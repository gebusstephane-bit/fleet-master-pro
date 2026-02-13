'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { createVehicle, deleteVehicle as deleteVehicleAction } from '@/actions/vehicles';

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

// Fonction pour créer le client Supabase
function getSupabase() {
  return getSupabaseClient();
}

// Hook pour récupérer tous les véhicules de l'entreprise
export function useVehicles(companyId?: string) {
  const { user } = useUserContext();
  const effectiveCompanyId = companyId || user?.company_id;
  
  return useQuery({
    queryKey: ['vehicles', effectiveCompanyId],
    queryFn: async () => {
      logger.info('useVehicles: Fetching with company_id', { companyId: effectiveCompanyId });
      
      if (!effectiveCompanyId) {
        logger.warn('No companyId available');
        return [];
      }
      
      const supabase = getSupabase();
      
      // Methode 1: Avec la fonction RPC si elle existe
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_company_vehicles', { p_company_id: effectiveCompanyId });
        
        if (!rpcError && rpcData) {
          logger.info('Vehicles fetched via RPC', { count: rpcData.length });
          return rpcData as Vehicle[];
        }
      } catch (e) {
        logger.info('RPC not available, trying direct query');
      }
      
      // Methode 2: Requete directe
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error fetching vehicles', error);
        
        // Si erreur de recursion, essayer sans filtre (fallback)
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          logger.warn('RLS recursion detected, trying fallback...');
          
          const { data: allData, error: allError } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!allError && allData) {
            // Filtrer manuellement
            const filtered = allData.filter(v => v.company_id === effectiveCompanyId);
            logger.info('Fallback: Found vehicles', { count: filtered.length });
            return filtered as Vehicle[];
          }
        }
        
        throw new Error(error.message);
      }
      
      logger.info('Fetched vehicles', { count: data?.length || 0 });
      return (data || []) as Vehicle[];
    },
    enabled: !!effectiveCompanyId,
    retry: 1,
    retryDelay: 1000,
  });
}

// Hook pour récupérer un véhicule spécifique
export function useVehicle(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error fetching vehicle', error);
        throw new Error(error.message);
      }
      
      return data as Vehicle;
    },
    enabled: !!vehicleId,
  });
}

// Hook pour créer un véhicule
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'qr_code_data' | 'company_id'>) => {
      const result = await createVehicle(vehicle);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', user?.company_id] });
      toast({
        title: 'Succès',
        description: 'Véhicule créé avec succès',
      });
    },
    onError: (error: any) => {
      logger.error('Error creating vehicle', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le véhicule',
        variant: 'destructive',
      });
    },
  });
}

// Hook pour mettre à jour un véhicule
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vehicle> & { id: string }) => {
      const supabase = getSupabase();
      
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
      queryClient.invalidateQueries({ queryKey: ['vehicle', variables.id] });
      if (variables.company_id) {
        queryClient.invalidateQueries({ queryKey: ['vehicles', variables.company_id] });
      }
    },
  });
}

// Hook pour supprimer un véhicule
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id }: { id: string; companyId: string }) => {
      const result = await deleteVehicleAction(id);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', user?.company_id] });
      toast({
        title: 'Succès',
        description: 'Véhicule supprimé avec succès',
      });
    },
    onError: (error: any) => {
      logger.error('Error deleting vehicle', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le véhicule',
        variant: 'destructive',
      });
    },
  });
}
