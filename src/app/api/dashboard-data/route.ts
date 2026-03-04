/**
 * API Route Dashboard - VERSION CORRIGÉE
 * Utilise rdv_date et les vrais statuts de la DB
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { addDays, startOfMonth } from 'date-fns';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

// Types pour les jointures Supabase (souples pour contourner SelectQueryError)
interface VehicleSubset {
  registration_number: string;
  brand: string;
  model: string;
}

interface ProfileSubset {
  first_name: string;
  last_name: string;
}

// Type pour les maintenances avec jointure vehicle
type MaintenanceWithVehicle = Database['public']['Tables']['maintenance_records']['Row'] & {
  vehicles: VehicleSubset | null;
};

// Type pour les prédictions avec jointure vehicle  
type PredictionWithVehicle = Database['public']['Tables']['ai_predictions']['Row'] & {
  vehicles: VehicleSubset | null;
};

// Type pour les activités avec jointure profile
type ActivityWithProfile = Database['public']['Tables']['activity_logs']['Row'] & {
  profiles: ProfileSubset | null;
};

// Types de retour API
interface AlertItem {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  due_date: string | null;
  days_until: number;
  priority: 'critical' | 'high' | 'medium';
  garage: string | null;
}

interface AppointmentItem {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  service_date: string | null;
  service_time: string | null;
  description: string;
  garage: string | null;
  days_until: number;
}

interface RiskVehicleItem {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  failure_probability: number;
  predicted_failure_type: string;
  urgency_level: string;
  days_until_predicted: number;
}

interface ActivityItem {
  id: string;
  action_type: string;
  entity_name: string;
  description: string;
  created_at: string;
  user_name: string | undefined;
}

function translateMaintenanceType(type: string | null): string {
  const translations: Record<string, string> = {
    'vidange': 'Vidange',
    'revision': 'Révision',
    'pneumatiques': 'Pneumatiques',
    'freins': 'Freins',
    'batterie': 'Batterie',
    'climatisation': 'Climatisation',
    'courroie': 'Courroie distribution',
    'echappement': 'Échappement',
    'suspension': 'Suspension',
    'transmission': 'Transmission',
    'autre': 'Autre entretien',
  };
  return type ? (translations[type.toLowerCase()] || type) : 'Entretien';
}

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Company ID
    const { data: firstVehicle } = await adminClient
      .from('vehicles')
      .select('company_id')
      .limit(1)
      .single();

    const companyId = firstVehicle?.company_id;
    
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // 2. KPIs Véhicules
    const { data: vehicles } = await adminClient
      .from('vehicles')
      .select('status')
      .eq('company_id', companyId);

    const vehicleStats = {
      total: vehicles?.length || 0,
      active: vehicles?.filter(v => v.status === 'ACTIF').length || 0,
      maintenance: vehicles?.filter(v => v.status === 'EN_MAINTENANCE').length || 0,
      inactive: vehicles?.filter(v => v.status === 'INACTIF' || v.status === 'ARCHIVE').length || 0,
    };

    // 3. KPIs Chauffeurs
    const { data: drivers } = await adminClient
      .from('drivers')
      .select('status')
      .eq('company_id', companyId);

    const driverStats = {
      total: drivers?.length || 0,
      active: drivers?.filter(d => d.status === 'active').length || 0,
    };

    // 4. KPIs Maintenances - UTILISE rdv_date et les vrais statuts
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = addDays(new Date(), 7).toISOString().split('T')[0];
    const thirtyDaysFromNow = addDays(new Date(), 30).toISOString().split('T')[0];

    // Récupérer toutes les maintenances avec rdv_date
    const { data: allMaintenances } = await adminClient
      .from('maintenance_records')
      .select('id, rdv_date, status, type, description, vehicle_id')
      .eq('company_id', companyId)
      .not('rdv_date', 'is', null);

    // Compter manuellement avec les vrais statuts
    const urgentCount = allMaintenances?.filter(m => {
      if (!m.rdv_date) return false;
      const date = new Date(m.rdv_date);
      return date <= new Date(sevenDaysFromNow) && m.status !== 'TERMINEE';
    }).length || 0;

    const upcomingCount = allMaintenances?.filter(m => {
      if (!m.rdv_date) return false;
      const date = new Date(m.rdv_date);
      return date > new Date(sevenDaysFromNow) && 
             date <= new Date(thirtyDaysFromNow) && 
             m.status !== 'TERMINEE';
    }).length || 0;

    const inProgressCount = allMaintenances?.filter(m => 
      m.status === 'EN_COURS' || m.status === 'in_progress'
    ).length || 0;

    // 5. KPIs Inspections
    const { data: allInspections } = await adminClient
      .from('inspections')
      .select('id, status, completed_at')
      .eq('company_id', companyId);

    const pendingCount = allInspections?.filter(i => 
      !i.status || i.status === 'pending' || i.status === 'EN_ATTENTE'
    ).length || 0;

    const startOfCurrentMonth = startOfMonth(new Date());
    const completedCount = allInspections?.filter(i => {
      if (i.status !== 'completed' && i.status !== 'TERMINEE') return false;
      if (!i.completed_at) return false;
      return new Date(i.completed_at) >= startOfCurrentMonth;
    }).length || 0;

    // 6. Alertes maintenance (prochains RDV)
    const { data: maintenanceAlerts } = await adminClient
      .from('maintenance_records')
      .select(`
        id,
        vehicle_id,
        type,
        rdv_date,
        rdv_time,
        status,
        garage_name,
        description,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .eq('company_id', companyId)
      .not('rdv_date', 'is', null)
      .gte('rdv_date', today)
      .lte('rdv_date', thirtyDaysFromNow)
      .not('status', 'eq', 'TERMINEE')
      .order('rdv_date', { ascending: true })
      .limit(10);

    const alerts: AlertItem[] = ((maintenanceAlerts as unknown) as MaintenanceWithVehicle[] || []).map(m => {
      const dueDate = m.rdv_date ? new Date(m.rdv_date) : new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      let priority: 'critical' | 'high' | 'medium' = 'medium';
      if (daysUntil <= 3) priority = 'critical';
      else if (daysUntil <= 7) priority = 'high';
      const vehicle = m.vehicles;
      return {
        id: m.id,
        vehicle_id: m.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        service_type: translateMaintenanceType(m.type),
        due_date: m.rdv_date,
        days_until: daysUntil,
        priority,
        garage: m.garage_name,
      };
    });

    // 7. RDV programmés (60 prochains jours)
    const sixtyDaysFromNow = addDays(new Date(), 60).toISOString().split('T')[0];
    const { data: appointmentsData } = await adminClient
      .from('maintenance_records')
      .select(`
        id,
        vehicle_id,
        type,
        rdv_date,
        rdv_time,
        description,
        garage_name,
        vehicles:vehicle_id (
          registration_number,
          brand,
          model
        )
      `)
      .eq('company_id', companyId)
      .not('rdv_date', 'is', null)
      .gte('rdv_date', today)
      .lte('rdv_date', sixtyDaysFromNow)
      .order('rdv_date', { ascending: true })
      .limit(10);

    const appointments: AppointmentItem[] = ((appointmentsData as unknown) as MaintenanceWithVehicle[] || []).map(m => {
      const serviceDate = m.rdv_date ? new Date(m.rdv_date) : new Date();
      const daysUntil = Math.ceil((serviceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const vehicle = m.vehicles;
      return {
        id: m.id,
        vehicle_id: m.vehicle_id,
        vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` : 'Véhicule inconnu',
        service_type: translateMaintenanceType(m.type),
        service_date: m.rdv_date,
        service_time: m.rdv_time,
        description: m.description || '',
        garage: m.garage_name,
        days_until: daysUntil,
      };
    });

    // 8. Véhicules à risque IA
    const { data: companyVehicles } = await adminClient
      .from('vehicles')
      .select('id')
      .eq('company_id', companyId);

    const vehicleIds = companyVehicles?.map(v => v.id) || [];
    let riskVehicles: RiskVehicleItem[] = [];

    if (vehicleIds.length > 0) {
      const { data: predictions } = await adminClient
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

      riskVehicles = ((predictions as unknown) as PredictionWithVehicle[] || []).map(p => {
        const vehicle = p.vehicles;
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
    }

    // 9. Activité récente
    const { data: activitiesData } = await adminClient
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

    const activities: ActivityItem[] = ((activitiesData as unknown) as ActivityWithProfile[] || []).map(a => {
      const user = a.profiles;
      return {
        id: a.id,
        action_type: a.action_type,
        entity_name: a.entity_name || '',
        description: a.description || '',
        created_at: a.created_at,
        user_name: user ? `${user.first_name} ${user.last_name}` : undefined,
      };
    });

    return NextResponse.json({
      kpis: {
        vehicles: vehicleStats,
        drivers: driverStats,
        maintenances: {
          urgent: urgentCount,
          upcoming: upcomingCount,
          inProgress: inProgressCount,
        },
        inspections: {
          pending: pendingCount,
          completedThisMonth: completedCount,
        },
      },
      alerts,
      pendingInspections: [],
      appointments,
      riskVehicles,
      activities,
    });

  } catch (error) {
    logger.error('Dashboard data error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
