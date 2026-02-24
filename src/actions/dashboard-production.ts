/**
 * Server Action: Dashboard Production
 * Récupère les vraies données pour le dashboard Beta
 * VERSION CORRIGÉE - Utilise scheduled_date
 */

'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { addDays, startOfMonth } from 'date-fns';

export interface DashboardKPIs {
  vehicles: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  drivers: {
    total: number;
    active: number;
  };
  maintenances: {
    urgent: number;
    upcoming: number;
    inProgress: number;
  };
  inspections: {
    pending: number;
    completedThisMonth: number;
  };
}

export interface MaintenanceAlert {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  due_date: string;
  days_until: number;
  priority: 'critical' | 'high' | 'medium';
}

export interface InspectionPending {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  inspection_type: string;
  created_at: string;
  days_pending: number;
}

export interface ScheduledAppointment {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  service_date: string;
  description: string;
  days_until: number;
}

export interface RiskVehicle {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  failure_probability: number;
  predicted_failure_type: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  days_until_predicted: number;
}

export interface ActivityItem {
  id: string;
  action_type: string;
  entity_name: string;
  description: string;
  created_at: string;
  user_name?: string;
}

/**
 * Récupère le company_id depuis le premier véhicule disponible
 */
async function getCompanyId(): Promise<string | null> {
  try {
    const adminClient = createAdminClient();
    
    const { data: firstVehicle, error } = await adminClient
      .from('vehicles')
      .select('company_id')
      .limit(1)
      .single();
    
    if (error) {
      logger.error('getCompanyId: Erreur', { error: error.message });
      return null;
    }
    
    return firstVehicle?.company_id || null;
  } catch (error) {
    logger.error('getCompanyId: Exception', { error: (error as Error).message });
    return null;
  }
}

/**
 * Récupère les KPIs du dashboard
 */
export async function getDashboardKPIs(): Promise<{ data?: DashboardKPIs; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    logger.info('getDashboardKPIs: DEBUT', { companyId });
    
    if (!companyId) {
      return { error: 'Company ID non trouvé' };
    }

    const adminClient = createAdminClient();

    // KPIs Véhicules
    const { data: vehicles, error: vehiclesError } = await adminClient
      .from('vehicles')
      .select('status')
      .eq('company_id', companyId);

    if (vehiclesError) {
      logger.error('getDashboardKPIs: ERREUR VEHICULES', { error: vehiclesError.message });
      throw vehiclesError;
    }

    const vehicleStats = {
      total: vehicles?.length || 0,
      active: vehicles?.filter(v => (v.status as string) === 'active' || (v.status as string) === 'ACTIF').length || 0,
      maintenance: vehicles?.filter(v => (v.status as string) === 'maintenance' || (v.status as string) === 'EN_MAINTENANCE').length || 0,
      inactive: vehicles?.filter(v => ['inactive', 'retired', 'INACTIF', 'HORS_SERVICE'].includes(v.status as string)).length || 0,
    };

    // KPIs Chauffeurs
    const { data: drivers, error: driversError } = await adminClient
      .from('drivers')
      .select('status')
      .eq('company_id', companyId);

    if (driversError) {
      logger.error('getDashboardKPIs: ERREUR CHAUFFEURS', { error: driversError.message });
    }

    const driverStats = {
      total: drivers?.length || 0,
      active: drivers?.filter(d => (d.status as string) === 'active' || (d.status as string) === 'ACTIF').length || 0,
    };

    // KPIs Maintenances - UTILISE scheduled_date
    const sevenDaysFromNow = addDays(new Date(), 7);
    const thirtyDaysFromNow = addDays(new Date(), 30);

    const { data: urgentMaintenances, error: urgentError } = await adminClient
      .from('maintenance_records')
      .select('id, rdv_date, status')
      .eq('company_id', companyId)
      .lte('rdv_date', sevenDaysFromNow.toISOString().split('T')[0])
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']);

    if (urgentError) {
      logger.error('getDashboardKPIs: ERREUR MAINTENANCES URGENTES', { error: urgentError.message });
    }

    const { data: upcomingMaintenances, error: upcomingError } = await adminClient
      .from('maintenance_records')
      .select('id')
      .eq('company_id', companyId)
      .gt('rdv_date', sevenDaysFromNow.toISOString().split('T')[0])
      .lte('rdv_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS']);

    if (upcomingError) {
      logger.error('getDashboardKPIs: ERREUR MAINTENANCES A VENIR', { error: upcomingError.message });
    }

    const { data: inProgressMaintenances, error: inProgressError } = await adminClient
      .from('maintenance_records')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'EN_COURS');

    if (inProgressError) {
      logger.error('getDashboardKPIs: ERREUR MAINTENANCES EN COURS', { error: inProgressError.message });
    }

    // KPIs Inspections
    const { data: pendingInspections, error: inspectError } = await adminClient
      .from('inspections')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (inspectError) {
      logger.error('getDashboardKPIs: ERREUR INSPECTIONS', { error: inspectError.message });
    }

    const startOfCurrentMonth = startOfMonth(new Date());
    const { data: completedInspections, error: completedError } = await adminClient
      .from('inspections')
      .select('id, completed_at')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('completed_at', startOfCurrentMonth.toISOString());

    if (completedError) {
      logger.error('getDashboardKPIs: ERREUR INSPECTIONS TERMINEES', { error: completedError.message });
    }

    const kpis: DashboardKPIs = {
      vehicles: vehicleStats,
      drivers: driverStats,
      maintenances: {
        urgent: urgentMaintenances?.length || 0,
        upcoming: upcomingMaintenances?.length || 0,
        inProgress: inProgressMaintenances?.length || 0,
      },
      inspections: {
        pending: pendingInspections?.length || 0,
        completedThisMonth: completedInspections?.length || 0,
      },
    };

    logger.info('getDashboardKPIs: SUCCES', { companyId, ...kpis });

    return { data: kpis };

  } catch (error) {
    logger.error('getDashboardKPIs: EXCEPTION', { error: (error as Error).message });
    return { error: 'Erreur lors du chargement des KPIs' };
  }
}

/**
 * Récupère les alertes maintenance prioritaires
 */
export async function getMaintenanceAlerts(): Promise<{ data?: MaintenanceAlert[]; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    if (!companyId) return { data: [] };

    const adminClient = createAdminClient();
    const now = new Date();
    const thirtyDaysFromNow = addDays(new Date(), 30);

    const { data: maintenances, error } = await adminClient
      .from('maintenance_records')
      .select(`
        id,
        vehicle_id,
        type,
        rdv_date,
        status,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'])
      .order('rdv_date', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('getMaintenanceAlerts: Erreur', { error: error.message });
      throw error;
    }

    const alerts: MaintenanceAlert[] = (maintenances || []).map(m => {
      const rdvDate = (m as any).rdv_date;
      const dueDate = rdvDate ? new Date(rdvDate) : new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let priority: 'critical' | 'high' | 'medium' = 'medium';
      if (daysUntil < 0) priority = 'critical';
      else if (daysUntil <= 3) priority = 'critical';
      else if (daysUntil <= 7) priority = 'high';

      const vehicle = (m as any).vehicles;

      return {
        id: m.id,
        vehicle_id: m.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        service_type: translateMaintenanceType(m.type as string),
        due_date: rdvDate || '',
        days_until: daysUntil,
        priority,
      };
    });

    return { data: alerts };

  } catch (error) {
    logger.error('Erreur getMaintenanceAlerts:', { error: (error as Error).message });
    return { data: [] };
  }
}

/**
 * Récupère les inspections en attente
 */
export async function getPendingInspections(): Promise<{ data?: InspectionPending[]; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    if (!companyId) return { data: [] };

    const adminClient = createAdminClient();
    const now = new Date();

    const { data: inspections, error } = await adminClient
      .from('inspections')
      .select(`
        id,
        vehicle_id,
        inspection_type,
        created_at,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('getPendingInspections: Erreur', { error: error.message });
      throw error;
    }

    const pending: InspectionPending[] = (inspections || []).map(i => {
      const createdDate = new Date(i.created_at);
      const daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const vehicle = i.vehicles as any;

      return {
        id: i.id,
        vehicle_id: i.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        inspection_type: i.inspection_type || 'Inspection',
        created_at: i.created_at,
        days_pending: daysPending,
      };
    });

    return { data: pending };

  } catch (error) {
    logger.error('Erreur getPendingInspections:', { error: (error as Error).message });
    return { data: [] };
  }
}

/**
 * Récupère les RDV programmés
 */
export async function getScheduledAppointments(): Promise<{ data?: ScheduledAppointment[]; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    if (!companyId) return { data: [] };

    const adminClient = createAdminClient();
    const now = new Date();
    const sixtyDaysFromNow = addDays(new Date(), 60);

    const { data: maintenances, error } = await adminClient
      .from('maintenance_records')
      .select(`
        id,
        vehicle_id,
        type,
        rdv_date,
        description,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .eq('company_id', companyId)
      .gte('rdv_date', now.toISOString().split('T')[0])
      .lte('rdv_date', sixtyDaysFromNow.toISOString().split('T')[0])
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS'])
      .order('rdv_date', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('getScheduledAppointments: Erreur', { error: error.message });
      throw error;
    }

    const appointments: ScheduledAppointment[] = (maintenances || []).map(m => {
      const rdvDate = (m as any).rdv_date;
      const serviceDate = rdvDate ? new Date(rdvDate) : new Date();
      const daysUntil = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const vehicle = (m as any).vehicles;

      return {
        id: m.id,
        vehicle_id: m.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        service_type: translateMaintenanceType(m.type as string),
        service_date: rdvDate || '',
        description: (m as any).description || '',
        days_until: daysUntil,
      };
    });

    return { data: appointments };

  } catch (error) {
    logger.error('Erreur getScheduledAppointments:', { error: (error as Error).message });
    return { data: [] };
  }
}

/**
 * Récupère les véhicules à risque selon l'IA
 */
export async function getRiskVehicles(): Promise<{ data?: RiskVehicle[]; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    if (!companyId) return { data: [] };

    const adminClient = createAdminClient();

    const { data: companyVehicles } = await adminClient
      .from('vehicles')
      .select('id')
      .eq('company_id', companyId);

    const vehicleIds = companyVehicles?.map(v => v.id) || [];

    if (vehicleIds.length === 0) return { data: [] };

    const { data: predictions, error } = await adminClient
      .from('ai_predictions')
      .select(`
        id,
        vehicle_id,
        failure_probability,
        predicted_failure_type,
        urgency_level,
        prediction_horizon_days,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .in('vehicle_id', vehicleIds)
      .gte('failure_probability', 0.3)
      .order('failure_probability', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('getRiskVehicles: Erreur', { error: error.message });
      return { data: [] };
    }

    const riskVehicles: RiskVehicle[] = (predictions || []).map((p: any) => {
      const vehicle = p.vehicles as any;
      return {
        id: p.id,
        vehicle_id: p.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        failure_probability: Math.round(p.failure_probability * 100),
        predicted_failure_type: p.predicted_failure_type || 'Panne imprévue',
        urgency_level: p.urgency_level || 'medium',
        days_until_predicted: p.prediction_horizon_days || 7,
      };
    });

    return { data: riskVehicles };

  } catch (error) {
    logger.error('Erreur getRiskVehicles:', { error: (error as Error).message });
    return { data: [] };
  }
}

/**
 * Récupère l'activité récente
 */
export async function getRecentActivity(): Promise<{ data?: ActivityItem[]; error?: string }> {
  try {
    const companyId = await getCompanyId();
    
    if (!companyId) return { data: [] };

    const adminClient = createAdminClient();

    const { data: activities, error } = await adminClient
      .from('activity_logs')
      .select(`
        id,
        action_type,
        entity_name,
        description,
        created_at,
        profiles:user_id (first_name, last_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      if (error.code === '42P01') {
        logger.info('getRecentActivity: Table activity_logs non trouvée');
        return { data: [] };
      }
      logger.error('getRecentActivity: Erreur', { error: error.message });
      return { data: [] };
    }

    const items: ActivityItem[] = (activities || []).map((a: any) => {
      const user = a.profiles as any;
      return {
        id: a.id,
        action_type: a.action_type,
        entity_name: a.entity_name || '',
        description: a.description || '',
        created_at: a.created_at,
        user_name: user ? `${user.first_name} ${user.last_name}` : undefined,
      };
    });

    return { data: items };

  } catch (error) {
    logger.error('Erreur getRecentActivity:', { error: (error as Error).message });
    return { data: [] };
  }
}

function translateMaintenanceType(type: string): string {
  const translations: Record<string, string> = {
    'routine': 'Entretien régulier',
    'repair': 'Réparation',
    'inspection': 'Inspection',
    'tire_change': 'Changement pneus',
    'oil_change': 'Vidange',
    'preventive': 'Maintenance préventive',
    'corrective': 'Maintenance corrective',
    'revision': 'Révision',
  };
  return translations[type] || type;
}
