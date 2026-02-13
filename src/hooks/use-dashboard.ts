/**
 * Hooks React Query pour le Dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/actions/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const result = await getDashboardStats();
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }
      return result.data;
    },
    refetchInterval: 10 * 1000,
    retry: 1,
  });
}
