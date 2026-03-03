'use client';

/**
 * Hooks React Query — Affectations conducteur-véhicule
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { assignDriver, unassignDriver, type AssignDriverInput } from '@/actions/assignments';
import { DriverAssignment } from '@/types';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const assignmentKeys = {
  byVehicle: (vehicleId: string) => ['assignments', 'vehicle', vehicleId] as const,
  byDriver:  (driverId: string)  => ['assignments', 'driver',  driverId]  as const,
};

// ─── useVehicleAssignments ────────────────────────────────────────────────────

/** Toutes les affectations d'un véhicule (actives + historique), avec les données conducteur. */
export function useVehicleAssignments(vehicleId: string) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: assignmentKeys.byVehicle(vehicleId),
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vehicle_driver_assignments')
        .select(`
          *,
          drivers:driver_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DriverAssignment[];
    },
    enabled: !!vehicleId && !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── useDriverAssignments ─────────────────────────────────────────────────────

/** Toutes les affectations d'un conducteur (actives + historique), avec les données véhicule. */
export function useDriverAssignments(driverId: string) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: assignmentKeys.byDriver(driverId),
    queryFn: async () => {
      if (!driverId || !companyId) return [];
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vehicle_driver_assignments')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            registration_number,
            brand,
            model,
            year
          )
        `)
        .eq('driver_id', driverId)
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DriverAssignment[];
    },
    enabled: !!driverId && !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── useAssignDriver ──────────────────────────────────────────────────────────

function unwrapAction<T>(result: unknown): T {
  const r = result as { data?: { success?: boolean; data?: T; error?: string }; serverError?: string } | undefined;
  if (r?.serverError) throw new Error(r.serverError);
  if (!r?.data?.success) throw new Error(r?.data?.error || "Erreur affectation");
  return r.data.data as T;
}

export function useAssignDriver(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignDriverInput) => {
      const result = await assignDriver(input);
      return unwrapAction<DriverAssignment>(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.byVehicle(vehicleId) });
      if (data?.driver_id) {
        queryClient.invalidateQueries({ queryKey: assignmentKeys.byDriver(data.driver_id) });
      }
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Conducteur affecté avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── useUnassignDriver ────────────────────────────────────────────────────────

export function useUnassignDriver(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignment_id }: { assignment_id: string }) => {
      const result = await unassignDriver({ assignment_id, vehicle_id: vehicleId });
      const r = result as { data?: { success?: boolean }; serverError?: string } | undefined;
      if (r?.serverError) throw new Error(r.serverError);
      if (!r?.data?.success) throw new Error("Erreur lors de la clôture");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.byVehicle(vehicleId) });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Affectation clôturée');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
