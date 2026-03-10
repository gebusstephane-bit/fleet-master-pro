'use server';

/**
 * Server Actions - Gestion des activités de transport par entreprise
 * ADR, Frigorifique, etc.
 * 
 * PRINCIPE: Utilise RLS existante, pas de bypass sécurité
 * Retourne des types stricts: { success: boolean, data?: T, error?: string }
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';
import { USER_ROLE } from '@/constants/enums';

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

export interface CompanyActivity {
  id: string;
  company_id: string;
  activity: TransportActivity;
  is_primary: boolean;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Type Insert/Update depuis Supabase
 type CompanyActivityInsert = Database['public']['Tables']['company_activities']['Insert'];

/**
 * Récupère les activités de l'entreprise
 * RLS: Lecture autorisée si membre de l'entreprise
 */
export async function getCompanyActivities(companyId: string): Promise<ActionResult<CompanyActivity[]>> {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('company_activities')
      .select('*')
      .eq('company_id', companyId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('getCompanyActivities: Erreur récupération', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data: data as CompanyActivity[] };
  } catch (error) {
    logger.error('getCompanyActivities: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Ajoute une activité à l'entreprise
 * RLS: Écriture autorisée si ADMIN/DIRECTEUR/AGENT_DE_PARC de l'entreprise
 */
export async function addCompanyActivity(
  companyId: string,
  activity: TransportActivity,
  isPrimary: boolean = false,
  settings?: Record<string, unknown>
): Promise<ActionResult<CompanyActivity>> {
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

    if (!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC] as string[]).includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que l'utilisateur appartient bien à cette entreprise
    if (profile.company_id !== companyId) {
      return { success: false, error: 'Accès non autorisé à cette entreprise' };
    }

    const supabaseActivity = activity as CompanyActivityInsert['activity'];

    // Si c'est l'activité principale, désactiver l'ancienne
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('company_activities')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('is_primary', true);

      if (updateError) {
        logger.error('addCompanyActivity: Erreur mise à jour primary', new Error(updateError.message));
        return { success: false, error: updateError.message };
      }
    }

    const insertData: CompanyActivityInsert = {
      company_id: companyId,
      activity: supabaseActivity,
      is_primary: isPrimary,
      settings: (settings || {}) as CompanyActivityInsert['settings'],
    };

    const { data, error } = await supabase
      .from('company_activities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('addCompanyActivity: Erreur insertion', { 
        message: error.message, 
        code: error.code, 
        details: error.details,
        hint: error.hint,
        companyId,
        activity,
        isPrimary 
      });
      
      if (error.code === '23505') {
        return { success: false, error: 'Cette activité est déjà assignée à l\'entreprise' };
      }
      
      if (error.code === '42501') {
        return { success: false, error: 'Permission refusée (RLS). Vérifiez que vous avez les droits ADMIN, DIRECTEUR ou AGENT_DE_PARC.' };
      }
      
      return { success: false, error: `${error.message} (code: ${error.code})` };
    }

    revalidatePath('/settings/company');
    revalidatePath('/vehicles');

    return { success: true, data: data as CompanyActivity };
  } catch (error) {
    logger.error('addCompanyActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Retire une activité de l'entreprise
 * RLS: Écriture autorisée si ADMIN/DIRECTEUR/AGENT_DE_PARC
 * 
 * VERIFICATION CRITIQUE: Bloque la suppression si des véhicules utilisent activement cette activité
 * pour éviter les données orphelines et les références cassées.
 */
export async function removeCompanyActivity(
  companyId: string,
  activityId: string
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

    if (!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC] as string[]).includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que l'activité appartient bien à cette entreprise (avec le nom de l'activité)
    const { data: existingActivity, error: checkError } = await supabase
      .from('company_activities')
      .select('id, is_primary, activity')
      .eq('id', activityId)
      .eq('company_id', companyId)
      .single();

    if (checkError || !existingActivity) {
      return { success: false, error: 'Activité non trouvée ou accès non autorisé' };
    }

    // VÉRIFICATION CRITIQUE: Compter les véhicules utilisant activement cette activité
    // Un véhicule "actif" = end_date IS NULL (activité en cours)
    // Étape 1: Récupérer les IDs des véhicules de l'entreprise
    const { data: companyVehicleIds, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('company_id', companyId);

    if (vehiclesError) {
      logger.error('removeCompanyActivity: Erreur récupération véhicules', new Error(vehiclesError.message));
      return { success: false, error: 'Erreur lors de la vérification des véhicules' };
    }

    const vehicleIds = companyVehicleIds?.map(v => v.id) || [];
    
    if (vehicleIds.length === 0) {
      // Pas de véhicules, on peut supprimer sans risque
    }

    // Étape 2: Compter les assignations actives pour ces véhicules et cette activité
    let activeVehiclesCount = 0;
    let countError = null;
    
    if (vehicleIds.length > 0) {
      const result = await supabase
        .from('vehicle_activity_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('activity', existingActivity.activity)
        .is('end_date', null)
        .in('vehicle_id', vehicleIds);
      
      activeVehiclesCount = result.count || 0;
      countError = result.error;
    }

    if (countError) {
      logger.error('removeCompanyActivity: Erreur comptage véhicules actifs', new Error(countError.message));
      return { success: false, error: 'Erreur lors de la vérification des véhicules liés' };
    }

    // Vérification supplémentaire: si pas de véhicules trouvés via la requête précédente,
    // vérifier quand même s'il n'y a pas d'assignations orphelines (sécurité)
    if (vehicleIds.length === 0) {
      // Aucun véhicule dans l'entreprise, pas de risque d'orphan data
    }

    if (activeVehiclesCount && activeVehiclesCount > 0) {
      return { 
        success: false, 
        error: `Impossible de supprimer : ${activeVehiclesCount} véhicule(s) utilisent activement cette activité. Réassignez d'abord ces véhicules à une autre activité dans leur fiche véhicule.` 
      };
    }

    // Vérification supplémentaire: Empêcher la suppression de l'activité principale si c'est la dernière
    const { count: totalActivitiesCount, error: totalError } = await supabase
      .from('company_activities')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (totalError) {
      logger.error('removeCompanyActivity: Erreur comptage total activités', new Error(totalError.message));
    }

    if (existingActivity.is_primary && totalActivitiesCount === 1) {
      return { 
        success: false, 
        error: 'Impossible de supprimer : c\'est votre seule activité configurée et elle est définie comme principale. Ajoutez d\'abord une autre activité.' 
      };
    }

    // Si c'est l'activité principale mais qu'il y en a d'autres, désigner une nouvelle principale
    if (existingActivity.is_primary && totalActivitiesCount && totalActivitiesCount > 1) {
      const { data: otherActivity } = await supabase
        .from('company_activities')
        .select('id')
        .eq('company_id', companyId)
        .neq('id', activityId)
        .limit(1)
        .single();

      if (otherActivity) {
        await supabase
          .from('company_activities')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', otherActivity.id);
      }
    }

    // Procéder à la suppression
    const { error } = await supabase
      .from('company_activities')
      .delete()
      .eq('id', activityId)
      .eq('company_id', companyId);

    if (error) {
      logger.error('removeCompanyActivity: Erreur suppression', new Error(error.message));
      return { success: false, error: error.message };
    }

    logger.info('removeCompanyActivity: Activité supprimée avec succès', {
      activityId,
      companyId,
      activity: existingActivity.activity,
      wasPrimary: existingActivity.is_primary
    });

    revalidatePath('/settings/company');
    revalidatePath('/vehicles');

    return { success: true };
  } catch (error) {
    logger.error('removeCompanyActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Change l'activité principale de l'entreprise
 * RLS: Écriture autorisée si ADMIN/DIRECTEUR/AGENT_DE_PARC
 */
export async function updateCompanyPrimaryActivity(
  companyId: string,
  activity: TransportActivity
): Promise<ActionResult<CompanyActivity>> {
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

    if (!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC] as string[]).includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que l'activité existe pour cette entreprise
    const { data: existingActivity, error: checkError } = await supabase
      .from('company_activities')
      .select('id, is_primary')
      .eq('company_id', companyId)
      .eq('activity', activity)
      .single();

    if (checkError || !existingActivity) {
      return { success: false, error: 'Activité non trouvée pour cette entreprise' };
    }

    // Désactiver toutes les activités primaires
    const { error: resetError } = await supabase
      .from('company_activities')
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('is_primary', true);

    if (resetError) {
      logger.error('updateCompanyPrimaryActivity: Erreur reset', new Error(resetError.message));
      return { success: false, error: resetError.message };
    }

    // Activer la nouvelle activité principale
    const { data, error } = await supabase
      .from('company_activities')
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq('id', existingActivity.id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      logger.error('updateCompanyPrimaryActivity: Erreur mise à jour', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/company');
    revalidatePath('/vehicles');

    return { success: true, data: data as CompanyActivity };
  } catch (error) {
    logger.error('updateCompanyPrimaryActivity: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}
