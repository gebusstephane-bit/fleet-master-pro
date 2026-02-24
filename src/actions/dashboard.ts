'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface DashboardStats {
  vehicles: {
    total: number;
    active: number;
    list: unknown[];
    totalMileage: number;
  };
  drivers: {
    total: number;
    active: number;
  };
  routes: {
    today: number;
    ongoing: number;
  };
  costs: {
    fuel: number;
    maintenance: number;
    total: number;
  };
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    // Récupérer l'utilisateur authentifié
    const authClient = await createClient();
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !authUser) {
      logger.error('getDashboardStats: Utilisateur non authentifié', authError ? new Error(authError.message) : undefined);
      return { success: false, error: 'Non authentifié' };
    }
    
    // Récupérer les données utilisateur avec admin client
    const supabase = createAdminClient();
    
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', authUser.id)
      .single();
    
    if (userError || !userData?.company_id) {
      logger.error('getDashboardStats: Pas de company_id', userError ? new Error(userError.message) : undefined);
      return { success: false, error: 'Entreprise non trouvée' };
    }
    
    const companyId = userData.company_id;
    logger.info('getDashboardStats: Chargement pour company', { companyId });
    
    // Récupérer les véhicules
    const { data: vehicles, error: vErr } = await supabase
      .from('vehicles')
      .select('id, registration_number, status, mileage, fuel_type, brand, model')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (vErr) logger.error('Erreur véhicules', new Error(vErr.message));
    
    // Récupérer les chauffeurs
    const { data: drivers, error: dErr } = await supabase
      .from('drivers')
      .select('id, status, first_name, last_name')
      .eq('company_id', companyId);
    
    if (dErr) logger.error('Erreur chauffeurs', new Error(dErr.message));
    
    // Tournées du jour
    const today = new Date().toISOString().split('T')[0];
    const { data: routes, error: rErr } = await supabase
      .from('routes')
      .select('id, status, name')
      .eq('company_id', companyId)
      .gte('route_date', today);
    
    if (rErr) logger.error('Erreur routes', new Error(rErr.message));
    
    // Coûts ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const { data: fuel } = await supabase
      .from('fuel_records')
      .select('price_total')
      .eq('company_id', companyId)
      .gte('date', startOfMonth.toISOString());
    
    const { data: maintenance } = await supabase
      .from('maintenance_records')
      .select('cost')
      .eq('company_id', companyId)
      .gte('created_at', startOfMonth.toISOString());
    
    const totalFuel = fuel?.reduce((s, r) => s + (r.price_total || 0), 0) || 0;
    const totalMaint = maintenance?.reduce((s, r) => s + (r.cost || 0), 0) || 0;
    
    logger.info('getDashboardStats: Données chargées', {
      vehicles: vehicles?.length || 0,
      drivers: drivers?.length || 0,
      routes: routes?.length || 0
    });
    
    return {
      success: true,
      data: {
        vehicles: {
          total: vehicles?.length || 0,
          active: vehicles?.filter(v => (v.status as string) === 'active' || (v.status as string) === 'ACTIF').length || 0,
          list: vehicles || [],
          totalMileage: vehicles?.reduce((s, v) => s + (v.mileage || 0), 0) || 0
        },
        drivers: {
          total: drivers?.length || 0,
          active: drivers?.filter(d => (d.status as string) === 'active' || (d.status as string) === 'ACTIF').length || 0
        },
        routes: {
          today: routes?.length || 0,
          ongoing: routes?.filter(r => (r.status as string) === 'in_progress' || (r.status as string) === 'EN_COURS').length || 0
        },
        costs: {
          fuel: totalFuel,
          maintenance: totalMaint,
          total: totalFuel + totalMaint
        }
      }
    };
    
  } catch (e: unknown) {
    logger.error('Dashboard error', e instanceof Error ? e : new Error(String(e)));
    return { success: false, error: e instanceof Error ? e.message : 'Erreur inconnue' };
  }
}
