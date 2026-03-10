/**
 * Hooks React Query pour le Dashboard
 * Extension avec analytics - refetch 10s préservé sur stats
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/actions/dashboard';
import { getDashboardAnalytics, DashboardAnalytics } from '@/actions/dashboard-analytics';
import { useUser } from './use-user';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  analytics: (companyId: string) => [...dashboardKeys.all, 'analytics', companyId] as const,
};

// EXISTANT - préservé avec refetch 10s
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
    refetchInterval: 10 * 1000, // PRÉSERVÉ
    retry: 1,
  });
}

// NOUVEAU - Analytics avec staleTime différent (5min)
export function useDashboardAnalytics() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const companyId = user?.company_id;

  return useQuery<DashboardAnalytics, Error>({
    queryKey: dashboardKeys.analytics(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Pas de company_id');
      return getDashboardAnalytics(companyId);
    },
    enabled: !!companyId && !isUserLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes (≠ des stats 10s)
    retry: 1,
  });
}

// Combiné pour utilisation facile
export function useDashboard() {
  const stats = useDashboardStats();
  const analytics = useDashboardAnalytics();

  return {
    stats,
    analytics,
    isLoading: stats.isLoading || analytics.isLoading,
    isError: stats.isError || analytics.isError,
  };
}
