import { createAdminClient } from '../server';

export interface DashboardStats {
  vehicles: {
    total: number;
    active: number;
    in_maintenance: number;
  };
  drivers: {
    total: number;
    active: number;
  };
  alerts: {
    total: number;
    critical: number;
  };
  routes: {
    today: number;
    pending: number;
  };
  maintenance: {
    overdue: number;
    upcoming: number;
  };
}

/**
 * Récupère les statistiques du tableau de bord en une seule requête SQL
 * Utilise des COUNT avec des filtres pour optimiser les performances
 */
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const supabase = createAdminClient();
  
  // Requête unique pour toutes les stats véhicules
  const { data: vehicleStatsRaw, error: vError } = await (supabase as any)
    .from('vehicles')
    .select(
      `
      total: count(*),
      active: count(*) filter (where status = 'active'),
      in_maintenance: count(*) filter (where status = 'maintenance')
    `
    )
    .eq('company_id', companyId)
    .single();
  const vehicleStats = vehicleStatsRaw as { total: number; active: number; in_maintenance: number } | null;

  if (vError) {
    console.error('Erreur stats véhicules:', vError);
  }

  // Requête unique pour les chauffeurs
  const { data: driverStatsRaw, error: dError } = await (supabase as any)
    .from('drivers')
    .select(
      `
      total: count(*),
      active: count(*) filter (where status = 'active')
    `
    )
    .eq('company_id', companyId)
    .single();
  const driverStats = driverStatsRaw as { total: number; active: number } | null;

  if (dError) {
    console.error('Erreur stats chauffeurs:', dError);
  }

  // Requête pour les alertes
  const { data: alertStatsRaw, error: aError } = await (supabase as any)
    .from('alerts')
    .select(
      `
      total: count(*),
      critical: count(*) filter (where severity = 'critical' and is_read = false)
    `
    )
    .eq('company_id', companyId)
    .eq('is_read', false)
    .single();
  const alertStats = alertStatsRaw as { total: number; critical: number } | null;

  if (aError) {
    console.error('Erreur stats alertes:', aError);
  }

  // Requête pour les tournées du jour
  const today = new Date().toISOString().split('T')[0];
  const { data: routeStatsRaw, error: rError } = await (supabase as any)
    .from('routes')
    .select(
      `
      today: count(*) filter (where route_date = '${today}'),
      pending: count(*) filter (where route_date = '${today}' and status = 'pending')
    `
    )
    .eq('company_id', companyId)
    .single();
  const routeStats = routeStatsRaw as { today: number; pending: number } | null;

  if (rError) {
    console.error('Erreur stats tournées:', rError);
  }

  // Requête pour les maintenances
  const { data: maintenanceStatsRaw, error: mError } = await (supabase as any)
    .from('maintenance')
    .select(
      `
      overdue: count(*) filter (where status = 'overdue'),
      upcoming: count(*) filter (where status = 'scheduled' and scheduled_date <= (now() + interval '7 days'))
    `
    )
    .eq('company_id', companyId)
    .single();
  const maintenanceStats = maintenanceStatsRaw as { overdue: number; upcoming: number } | null;

  if (mError) {
    console.error('Erreur stats maintenances:', mError);
  }

  return {
    vehicles: {
      total: vehicleStats?.total ?? 0,
      active: vehicleStats?.active ?? 0,
      in_maintenance: vehicleStats?.in_maintenance ?? 0,
    },
    drivers: {
      total: driverStats?.total ?? 0,
      active: driverStats?.active ?? 0,
    },
    alerts: {
      total: alertStats?.total ?? 0,
      critical: alertStats?.critical ?? 0,
    },
    routes: {
      today: routeStats?.today ?? 0,
      pending: routeStats?.pending ?? 0,
    },
    maintenance: {
      overdue: maintenanceStats?.overdue ?? 0,
      upcoming: maintenanceStats?.upcoming ?? 0,
    },
  };
}

/**
 * Version optimisée avec une seule requête SQL complexe
 * Utilise les CTE (Common Table Expressions) pour meilleure performance
 */
export async function getDashboardStatsOptimized(
  companyId: string
): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await (supabase as any).rpc('get_dashboard_stats', {
    p_company_id: companyId,
    p_today: today,
  });

  if (error) {
    console.error('Erreur RPC get_dashboard_stats:', error);
    // Fallback vers la méthode standard
    return getDashboardStats(companyId);
  }

  const rpcData = data as unknown as Record<string, number>;

  return {
    vehicles: {
      total: rpcData.vehicles_total ?? 0,
      active: rpcData.vehicles_active ?? 0,
      in_maintenance: rpcData.vehicles_in_maintenance ?? 0,
    },
    drivers: {
      total: rpcData.drivers_total ?? 0,
      active: rpcData.drivers_active ?? 0,
    },
    alerts: {
      total: rpcData.alerts_total ?? 0,
      critical: rpcData.alerts_critical ?? 0,
    },
    routes: {
      today: rpcData.routes_today ?? 0,
      pending: rpcData.routes_pending ?? 0,
    },
    maintenance: {
      overdue: rpcData.maintenance_overdue ?? 0,
      upcoming: rpcData.maintenance_upcoming ?? 0,
    },
  };
}

/**
 * Récupère les données des graphiques du dashboard
 */
export async function getDashboardCharts(companyId: string, days = 30) {
  const supabase = createAdminClient();

  // Tournées par jour sur les X derniers jours
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: routesByDayRaw, error } = await (supabase as any)
    .from('routes')
    .select('route_date, status')
    .eq('company_id', companyId)
    .gte('route_date', startDate.toISOString().split('T')[0])
    .order('route_date', { ascending: true });
  const routesByDay = routesByDayRaw as Array<{ route_date: string; status: string }> | null;

  if (error) {
    console.error('Erreur chart tournées:', error);
    return null;
  }

  // Agréger par date
  const routesData = routesByDay?.reduce(
    (acc, route) => {
      const date = route.route_date;
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0 };
      }
      acc[date].total++;
      if (route.status === 'completed') {
        acc[date].completed++;
      }
      return acc;
    },
    {} as Record<string, { total: number; completed: number }>
  );

  return {
    routesByDay: Object.entries(routesData || {}).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  };
}

/**
 * Récupère les alertes récentes avec pagination
 */
export async function getRecentAlerts(
  companyId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 10, offset = 0, unreadOnly = false } = options;
  const supabase = createAdminClient();

  let query = supabase
    .from('alerts')
    .select('*, vehicle:vehicles(name, license_plate)', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Erreur récupération alertes:', error);
    return { alerts: [], total: 0 };
  }

  return {
    alerts: data || [],
    total: count || 0,
    hasMore: count ? offset + limit < count : false,
  };
}
