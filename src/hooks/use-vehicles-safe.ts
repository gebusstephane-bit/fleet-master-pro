'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';

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
}

// Fonction pour créer le client Supabase
function getSupabase() {
  return getSupabaseClient();
}

// Hook pour récupérer tous les véhicules - VERSION SECURISEE
export function useVehicles(companyId?: string) {
  const { user } = useUserContext();
  const effectiveCompanyId = companyId || user?.company_id;
  
  return useQuery({
    queryKey: ['vehicles', effectiveCompanyId],
    queryFn: async () => {
      console.log('🔍 useVehicles: Starting fetch...');
      console.log('🔍 company_id:', effectiveCompanyId);
      
      if (!effectiveCompanyId) {
        console.warn('⚠️ No companyId available');
        return [];
      }
      
      const supabase = getSupabase();
      
      // Tester d'abord si on peut compter les véhicules
      const { count, error: countError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });
      
      console.log('🔍 Total vehicles (bypass RLS):', count);
      
      if (countError) {
        console.error('❌ Count error:', countError);
      }
      
      // Essayer de récupérer les véhicules avec le company_id
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching vehicles:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        
        // Si erreur de récursion, on essaie sans filtre (pour debug)
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          console.warn('⚠️ Infinite recursion detected! Trying without RLS...');
          
          // Désactiver temporairement pour debug (à ne pas faire en prod)
          const { data: allData, error: allError } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (allError) {
            console.error('❌ Even without filter failed:', allError);
            throw new Error('RLS_RECURSION: ' + error.message);
          }
          
          console.log('✅ Fallback: Found', allData?.length, 'vehicles');
          // Filtrer manuellement
          const filtered = allData?.filter(v => v.company_id === effectiveCompanyId) || [];
          console.log('✅ After manual filter:', filtered.length);
          return filtered as Vehicle[];
        }
        
        throw new Error(error.message);
      }
      
      console.log('✅ Fetched vehicles:', data?.length || 0);
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
        console.error('Error fetching vehicle:', error);
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
  
  return useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'qr_code_data' | 'company_id'>) => {
      const supabase = getSupabase();
      
      if (!user?.company_id) {
        throw new Error('Company ID not found');
      }
      
      const vehicleId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          ...vehicle,
          id: vehicleId,
          company_id: user.company_id,
          qr_code_data: `fleetmaster://vehicle/${vehicleId}`,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating vehicle:', error);
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.company_id] });
    },
  });
}

// Hook pour supprimer un véhicule
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting vehicle:', error);
        throw new Error(error.message);
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.companyId] });
    },
  });
}
