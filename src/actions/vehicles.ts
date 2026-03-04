'use server';

/**
 * Actions Véhicules - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Les policies PostgreSQL assurent l'isolation par company_id
 */

import { revalidatePath } from 'next/cache';

import { requireManagerOrAbove } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

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
  // Assurance
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  // Échéances réglementaires
  technical_control_date?: string | null;
  technical_control_expiry?: string | null;
  tachy_control_date?: string | null;
  tachy_control_expiry?: string | null;
  atp_date?: string | null;
  atp_expiry?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Crée un nouveau véhicule
 * RLS : L'INSERT est autorisé si company_id = get_current_user_company_id()
 * Vérifie également la limite de véhicules selon le plan d'abonnement
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
    
    // 4. Vérifier la limite de véhicules selon le plan
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, vehicle_limit')
      .single();
    
    if (subError) {
      logger.error('createVehicle: Erreur récupération abonnement', new Error(subError.message));
      return { success: false, error: 'Impossible de vérifier les limites d\'abonnement' };
    }
    
    // Compter les véhicules actuels (exclure les supprimés)
    const { count: vehicleCount, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null);
    
    if (countError) {
      logger.error('createVehicle: Erreur comptage véhicules', new Error(countError.message));
      return { success: false, error: 'Impossible de vérifier le nombre de véhicules' };
    }
    
    // Vérifier si la limite est atteinte
    if (vehicleCount !== null && vehicleCount >= (subscription.vehicle_limit || 0)) {
      return { 
        success: false, 
        error: `Limite de véhicules atteinte (${vehicleCount}/${subscription.vehicle_limit}). Passez au plan supérieur pour ajouter plus de véhicules.`,
        data: { 
          limitReached: true, 
          currentCount: vehicleCount, 
          limit: subscription.vehicle_limit,
          upgradeUrl: '/settings/billing'
        }
      };
    }
    
    const vehicleId = crypto.randomUUID();
    
    // 4. Créer le véhicule (RLS vérifie company_id automatiquement)
    // Typage strict avec le type Insert de Supabase
    type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
    
    const insertData: VehicleInsert = {
      id: vehicleId,
      company_id: profile.company_id,
      registration_number: data.registration_number,
      brand: data.brand,
      model: data.model,
      type: data.type,
      mileage: data.mileage ?? 0,
      fuel_type: data.fuel_type as VehicleInsert['fuel_type'],
      status: (data.status || 'ACTIF') as VehicleInsert['status'],
      qr_code_data: `fleetmaster://vehicle/${vehicleId}`,
      purchase_date: data.purchase_date || null,
      vin: data.vin || null,
      year: data.year || new Date().getFullYear(),
      color: data.color || null,
      // Assurance
      insurance_company: data.insurance_company ?? null,
      insurance_policy_number: data.insurance_policy_number ?? null,
      insurance_expiry: data.insurance_expiry ?? null,
      // Échéances réglementaires (CT, tachygraphe, ATP)
      technical_control_date: data.technical_control_date ?? null,
      technical_control_expiry: data.technical_control_expiry ?? null,
      tachy_control_date: data.tachy_control_date ?? null,
      tachy_control_expiry: data.tachy_control_expiry ?? null,
      atp_date: data.atp_date ?? null,
      atp_expiry: data.atp_expiry ?? null,
    };
    
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
      .is('deleted_at', null)
      .single();
    
    if (checkError || !existingVehicle) {
      return { success: false, error: 'Véhicule non trouvé ou accès non autorisé' };
    }
    
    // 3. Préparer les données
    const VEHICLE_DATE_FIELDS = [
      'purchase_date',
      'insurance_expiry',
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
    // VÉRIFICATION SÉCURITÉ : Vérifier le rôle côté serveur (incontournable)
    try {
      await requireManagerOrAbove();
    } catch {
      return { success: false, error: 'Accès refusé' };
    }

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
      .select('id, company_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (vehicleError || !vehicle) {
      return { success: false, error: 'Véhicule non trouvé' };
    }
    
    // 4. SOFT DELETE - Marquer le véhicule comme supprimé (pas de suppression physique)
    // Les données liées (maintenance, pneus, etc.) sont conservées pour l'historique
    // Note: deleted_at n'est pas dans les types car il n'est pas exposé dans l'API
    type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
    const { error } = await supabase
      .from('vehicles')
      .update({ 
        status: 'ARCHIVE' as VehicleUpdate['status'],
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('company_id', profile.company_id ?? ''); // sécurité double vérification
    
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
