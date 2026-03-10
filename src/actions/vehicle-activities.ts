'use server';

/**
 * Server Actions - Gestion des activités de transport par véhicule
 * Assignation, historique, activité courante
 * 
 * PRINCIPE: Utilise RLS existante, pas de bypass sécurité
 * Clôture automatique de l'ancienne activité lors d'une nouvelle assignation
 */

import { revalidatePath } from 'next/cache';
import { USER_ROLE } from '@/constants/enums';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

// Type exporté pour réutilisation
export type TransportActivity =
  | 'MARCHANDISES_GENERALES'
  | 'FRIGORIFIQUE'
  | 'ADR_COLIS'
  | 'ADR_CITERNE'
  | 'CONVOI_EXCEPTIONNEL'
  | 'BENNE_TRAVAUX_PUBLICS'
  | 'ANIMAUX_VIVANTS';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface VehicleActivityAssignment {
  id: string;
  vehicle_id: string;
  activity: TransportActivity;
  assigned_by: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

// Type Insert depuis Supabase
 type VehicleActivityInsert = Database['public']['Tables']['vehicle_activity_assignments']['Insert'];
 type VehicleActivityUpdate = Database['public']['Tables']['vehicle_activity_assignments']['Update'];

/**
 * Récupère l'historique complet des activités d'un véhicule
 * RLS: Lecture autorisée si le véhicule appartient à l'entreprise du user
 */
export async function getVehicleActivities(
  vehicleId: string
): Promise<ActionResult<VehicleActivityAssignment[]>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('vehicle_activity_assignments')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('start_date', { ascending: false });

    if (error) {
      logger.error('getVehicleActivities: Erreur récupération', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data: data as VehicleActivityAssignment[] };
  } catch (error) {
    logger.error('getVehicleActivities: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Récupère uniquement l'activité en cours d'un véhicule
 * RLS: Lecture autorisée si le véhicule appartient à l'entreprise du user
 */
export async function getVehicleCurrentActivity(
  vehicleId: string
): Promise<ActionResult<VehicleActivityAssignment | null>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('vehicle_activity_assignments')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('end_date', null)
      .order('start_date', { ascending: false })
      .maybeSingle();

    if (error) {
      // PGRST116 = no rows (pas d'erreur critique)
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      logger.error('getVehicleCurrentActivity: Erreur récupération', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data: data as VehicleActivityAssignment | null };
  } catch (error) {
    logger.error('getVehicleCurrentActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Assigne une nouvelle activité à un véhicule
 * Utilise une fonction RPC PostgreSQL atomique (transaction garantie)
 * RLS: Écriture autorisée si ADMIN/DIRECTEUR/AGENT_DE_PARC
 * 
 * NOTE: La fonction SQL assign_vehicle_activity_atomic gère:
 * - Vérification que le véhicule existe
 * - Vérification que l'activité est autorisée pour l'entreprise
 * - Clôture atomique de l'ancienne activité (UPDATE)
 * - Création atomique de la nouvelle activité (INSERT)
 * - Rollback automatique en cas d'erreur
 */
export async function assignVehicleActivity(
  vehicleId: string,
  activity: TransportActivity,
  startDate: string = new Date().toISOString(),
  notes?: string
): Promise<ActionResult<VehicleActivityAssignment>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier les permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    if ((!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC] as string[]).includes(profile.role))) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que le véhicule existe et appartient à l'entreprise
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, company_id, type')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return { success: false, error: 'Véhicule non trouvé' };
    }

    if (vehicle.company_id !== profile.company_id) {
      return { success: false, error: 'Accès non autorisé à ce véhicule' };
    }

    // VÉRIFICATION DE COMPATIBILITÉ: Type véhicule vs Activité
    // Récupérer les règles de compliance pour cette activité
    const { data: rules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('applicable_vehicle_types')
      .eq('activity', activity)
      .limit(1);

    if (rulesError) {
      logger.error('assignVehicleActivity: Erreur récupération règles', new Error(rulesError.message));
      return { success: false, error: 'Impossible de vérifier la compatibilité véhicule/activité' };
    }

    // Vérifier si au moins une règle permet ce type de véhicule
    const isCompatible = rules?.some(rule => {
      // Si NULL ou vide, compatible avec tous les véhicules
      if (!rule.applicable_vehicle_types || rule.applicable_vehicle_types.length === 0) {
        return true;
      }
      return rule.applicable_vehicle_types.includes(vehicle.type);
    });

    if (!isCompatible) {
      return { 
        success: false, 
        error: `L'activité "${activity}" n'est pas compatible avec le type de véhicule "${vehicle.type}". Vérifiez les types de véhicules autorisés pour cette activité.` 
      };
    }

    // APPEL RPC ATOMIQUE - Tout ou rien (transaction PostgreSQL)
    // NOTE: La fonction SQL doit être créée via la migration 20260308_fix_p0_critical.sql
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
      'assign_vehicle_activity_atomic',
      {
        p_vehicle_id: vehicleId,
        p_activity: activity,
        p_start_date: startDate,
        p_notes: notes || null,
        p_assigned_by: authUser.id
      }
    );

    if (rpcError) {
      logger.error('assignVehicleActivity: Erreur RPC', { 
        message: rpcError.message, 
        code: rpcError.code,
        vehicleId,
        activity 
      });
      
      if (rpcError.message?.includes('autorisée pour cette entreprise')) {
        return { 
          success: false, 
          error: `L'activité ${activity} n'est pas autorisée pour cette entreprise. Ajoutez-la d'abord dans les paramètres.` 
        };
      }
      
      return { success: false, error: rpcError.message };
    }

    // Vérifier le résultat de la fonction
    if (!rpcResult?.success) {
      return { 
        success: false, 
        error: rpcResult?.error || 'Erreur lors de l\'assignation' 
      };
    }

    // Récupérer la nouvelle assignation créée pour le retour
    const { data: newAssignment, error: fetchError } = await supabase
      .from('vehicle_activity_assignments')
      .select('*')
      .eq('id', rpcResult.new_assignment_id)
      .single();

    if (fetchError) {
      logger.error('assignVehicleActivity: Erreur récupération résultat', new Error(fetchError.message));
      // On retourne quand même un succès car l'opération a réussi
      return { 
        success: true, 
        data: {
          id: rpcResult.new_assignment_id,
          vehicle_id: vehicleId,
          activity: activity,
          start_date: startDate,
          assigned_by: authUser.id,
          notes: notes || null,
          end_date: null,
          created_at: new Date().toISOString(),
        } as VehicleActivityAssignment
      };
    }

    // Invalider les caches
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/compliance');
    revalidatePath('/vehicles');

    logger.info('assignVehicleActivity: Activité assignée avec succès (RPC atomique)', {
      vehicleId,
      activity,
      oldAssignmentId: rpcResult.closed_assignment_id,
      newAssignmentId: rpcResult.new_assignment_id
    });

    return { success: true, data: newAssignment as VehicleActivityAssignment };
  } catch (error) {
    logger.error('assignVehicleActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Termine manuellement l'activité courante d'un véhicule
 * RLS: Écriture autorisée si ADMIN/DIRECTEUR/AGENT_DE_PARC
 */
export async function endVehicleCurrentActivity(
  vehicleId: string,
  endDate?: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier les permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    if ((!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC] as string[]).includes(profile.role))) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const now = endDate || new Date().toISOString();

    const { error } = await supabase
      .from('vehicle_activity_assignments')
      .update({ 
        end_date: now,
      } as VehicleActivityUpdate)
      .eq('vehicle_id', vehicleId)
      .is('end_date', null);

    if (error) {
      logger.error('endVehicleCurrentActivity: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/compliance');
    revalidatePath('/vehicles');

    return { success: true };
  } catch (error) {
    logger.error('endVehicleCurrentActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}
