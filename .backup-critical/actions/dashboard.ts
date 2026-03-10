'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function getDashboardStats() {
  try {
    // Récupérer l'utilisateur authentifié
    const authClient = await createClient();
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !authUser) {
      logger.error('getDashboardStats: Utilisateur non authentifié', authError || undefined);
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
      logger.error('getDashboardStats: Pas de company_id', userError || undefined);
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
    
    if (vErr) logger.error('Erreur véhicules', vErr);
    
    // Récupérer les chauffeurs
    const { data: drivers, error: dErr } = await supabase
      .from('drivers')
      .select('id, status, first_name, last_name')
      .eq('company_id', companyId);
    
    if (dErr) logger.error('Erreur chauffeurs', dErr);
    
    // Tournées du jour
    const today = new Date().toISOString().split('T')[0];
    const { data: routes, error: rErr } = await supabase
      .from('routes')
      .select('id, status, name')
      .eq('company_id', companyId)
      .gte('route_date', today);
    
    if (rErr) logger.error('Erreur routes', rErr);
    
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
          active: vehicles?.filter(v => v.status === 'active' || v.status === 'ACTIF').length || 0,
          list: vehicles || [],
          totalMileage: vehicles?.reduce((s, v) => s + (v.mileage || 0), 0) || 0
        },
        drivers: {
          total: drivers?.length || 0,
          active: drivers?.filter(d => d.status === 'active' || d.status === 'ACTIF').length || 0
        },
        routes: {
          today: routes?.length || 0,
          ongoing: routes?.filter(r => r.status === 'in_progress' || r.status === 'EN_COURS').length || 0
        },
        costs: {
          fuel: totalFuel,
          maintenance: totalMaint,
          total: totalFuel + totalMaint
        }
      }
    };
    
  } catch (e: any) {
    logger.error('Dashboard error', e);
    return { success: false, error: e.message };
  }
}
