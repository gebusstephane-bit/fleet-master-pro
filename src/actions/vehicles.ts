'use server';

/**
 * Actions Véhicules - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Les policies PostgreSQL assurent l'isolation par company_id
 */

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export interface CreateVehicleData {
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  fuel_type: string;
  status?: string;
  purchase_date?: string;
  vin?: string;
  year?: number;
  color?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Crée un nouveau véhicule
 * RLS : L'INSERT est autorisé si company_id = get_current_user_company_id()
 */
export async function createVehicle(data: CreateVehicleData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // 1. Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }
    
    // 2. Récupérer le profil (RLS permet SELECT sur son propre profil)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single();
    
    if (profileError || !profile?.company_id) {
      logger.error('createVehicle: Profil non trouvé', profileError ? new Error(profileError.message) : undefined);
      return { success: false, error: 'Profil ou entreprise non trouvé' };
    }
    
    // 3. Vérifier les permissions (métier)
    if (!['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'].includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }
    
    const vehicleId = crypto.randomUUID();
    
    // 4. Créer le véhicule (RLS vérifie company_id automatiquement)
    const insertData = {
      id: vehicleId,
      company_id: profile.company_id,
      registration_number: data.registration_number,
      brand: data.brand,
      model: data.model,
      type: data.type,
      mileage: data.mileage,
      fuel_type: data.fuel_type,
      status: data.status || 'ACTIF',
      qr_code_data: `fleetmaster://vehicle/${vehicleId}`,
      purchase_date: data.purchase_date || null,
      vin: data.vin || null,
      year: data.year || null,
      color: data.color || null,
    } as any;
    
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert(insertData)
      .select()
      .single();
    
    if (vehicleError) {
      logger.error('createVehicle: Erreur création', new Error(vehicleError.message));
      
      if (vehicleError.code === '23505') {
        if (vehicleError.message?.includes('registration_number')) {
          return { success: false, error: `Un véhicule avec l'immatriculation "${data.registration_number}" existe déjà` };
        }
        return { success: false, error: 'Ce véhicule existe déjà (doublon détecté)' };
      }
      
      return { success: false, error: vehicleError.message };
    }
    
    revalidatePath('/vehicles');
    
    return { success: true, data: vehicle };
    
  } catch (error) {
    logger.error('createVehicle: Exception', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Met à jour un véhicule
 * RLS : L'UPDATE est autorisé si le véhicule appartient à la company du user
 */
export async function updateVehicle(id: string, data: Partial<CreateVehicleData>): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // 1. Vérifier auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }
    
    // 2. Le véhicule existe-t-il et appartient-il à ma company ? (RLS filtre auto)
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError || !existingVehicle) {
      return { success: false, error: 'Véhicule non trouvé ou accès non autorisé' };
    }
    
    // 3. Préparer les données
    const VEHICLE_DATE_FIELDS = [
      'technical_control_date',
      'technical_control_expiry',
      'tachy_control_date',
      'tachy_control_expiry',
      'atp_date',
      'atp_expiry',
    ] as const;

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    delete updateData['purchase_date'];

    for (const field of VEHICLE_DATE_FIELDS) {
      if (field in updateData && updateData[field] === '') {
        updateData[field] = null;
      }
    }
    
    // 4. Mettre à jour (RLS vérifie que le véhicule appartient à ma company)
    const { data: updated, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/vehicles');
    revalidatePath(`/vehicles/${id}`);
    
    return { success: true, data: updated };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * Supprime un véhicule
 * RLS : Le DELETE est autorisé si le véhicule appartient à la company du user
 * ET si le user a le rôle approprié (vérifié métier)
 */
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // 1. Vérifier auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { success: false, error: 'Non authentifié' };
    }
    
    // 2. Vérifier les permissions métier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single();
    
    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }
    
    // 3. Vérifier que le véhicule existe et est accessible (RLS)
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .single();
    
    if (vehicleError || !vehicle) {
      return { success: false, error: 'Véhicule non trouvé' };
    }
    
    // 4. Supprimer le véhicule (RLS vérifie l'appartenance à la company)
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/vehicles');
    
    return { success: true };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}
