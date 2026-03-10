'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import {
  calculateTCO,
  calculateFleetAvgCostPerMonth,
  type TCOData,
} from '@/lib/tco-calculator';

export type { TCOData };

export function useTCO(vehicleId: string, months: 3 | 6 | 12 | 24 = 12) {
  return useQuery({
    queryKey: ['tco', vehicleId, months],
    queryFn: () => {
      const supabase = getSupabaseClient();
      return calculateTCO(supabase, vehicleId, months);
    },
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFleetAvgCostPerMonth(months: 3 | 6 | 12 | 24 = 12) {
  const { user } = useUserContext();
  return useQuery({
    queryKey: ['fleet-avg-cost', months, user?.company_id],
    queryFn: () => {
      const supabase = getSupabaseClient();
      return calculateFleetAvgCostPerMonth(supabase, user!.company_id!, months);
    },
    enabled: !!user?.company_id,
    staleTime: 10 * 60 * 1000,
  });
}

export interface FleetVehicleTCO {
  vehicle: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
    type: string;
    status: string;
  };
  tco: TCOData;
}

export function useFleetTCO(months: 3 | 6 | 12 | 24 = 12) {
  const { user } = useUserContext();
  return useQuery({
    queryKey: ['fleet-tco', months, user?.company_id],
    queryFn: async (): Promise<FleetVehicleTCO[]> => {
      const supabase = getSupabaseClient();

      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, registration_number, brand, model, type, status')
        .eq('company_id', user!.company_id!);

      if (!vehicles || vehicles.length === 0) return [];

      const results = await Promise.all(
        vehicles.map(async (v) => {
          const tco = await calculateTCO(supabase, v.id, months);
          return { vehicle: v, tco };
        }),
      );

      return results.sort((a, b) => b.tco.totalCost - a.tco.totalCost);
    },
    enabled: !!user?.company_id,
    staleTime: 5 * 60 * 1000,
  });
}
