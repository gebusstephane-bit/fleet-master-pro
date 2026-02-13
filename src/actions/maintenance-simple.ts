'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

interface CreateMaintenanceData {
  vehicleId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE';
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  garageName?: string;
  notes?: string;
}

export async function createMaintenanceSimple(data: CreateMaintenanceData, userId: string, companyId: string) {
  try {
    const adminClient = createAdminClient();
    
    // Vérifier le véhicule
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, registration_number, brand, model, company_id')
      .eq('id', data.vehicleId)
      .eq('company_id', companyId)
      .single();
    
    if (vehicleError || !vehicle) {
      return { success: false, error: 'Véhicule non trouvé' };
    }
    
    // Créer la maintenance directement avec admin (bypass triggers)
    const { data: maintenance, error } = await adminClient
      .from('maintenance_records')
      .insert({
        vehicle_id: data.vehicleId,
        company_id: companyId,
        requested_by: userId,
        type: data.type,
        description: data.description,
        priority: data.priority,
        estimated_cost: data.estimatedCost,
        garage_name: data.garageName,
        notes_request: data.notes,
        status: 'DEMANDE_CREEE',
        requested_at: new Date().toISOString(),
      })
      .select('*, vehicle:vehicles(registration_number, brand, model)')
      .single();
    
    if (error) {
      logger.error('createMaintenanceSimple: Error', error);
      return { success: false, error: error.message };
    }
    
    // Logger l'activité manuellement
    try {
      await adminClient.from('activity_logs').insert({
        company_id: companyId,
        user_id: userId,
        action_type: 'MAINTENANCE_CREATED',
        entity_type: 'maintenance',
        entity_id: maintenance.id,
        entity_name: vehicle.registration_number,
        description: `Maintenance créée : ${data.type}`,
      });
    } catch (logError) {
      // On ignore l'erreur de logging
      logger.warn('Activity log failed', logError);
    }
    
    revalidatePath('/maintenance');
    return { success: true, data: maintenance };
    
  } catch (error: any) {
    logger.error('createMaintenanceSimple: Exception', error);
    return { success: false, error: error.message };
  }
}
