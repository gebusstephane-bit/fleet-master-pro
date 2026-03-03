/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export interface InspectionData {
  vehicleId: string;
  mileage: number;
  fuelLevel: number;
  adblueLevel?: number;
  gnrLevel?: number;
  cleanlinessExterior: number;
  cleanlinessInterior: number;
  cleanlinessCargoArea?: number;
  compartmentC1Temp?: number;
  compartmentC2Temp?: number;
  tiresCondition: {
    front_left: { pressure: number | null; wear: string; damage: string | null };
    front_right: { pressure: number | null; wear: string; damage: string | null };
    rear_left: { pressure: number | null; wear: string; damage: string | null };
    rear_right: { pressure: number | null; wear: string; damage: string | null };
    spare?: { pressure: number | null; wear: string; damage: string | null };
  };
  reportedDefects: Array<{
    category: 'MECANIQUE' | 'ELECTRIQUE' | 'CARROSSERIE' | 'PNEUMATIQUE' | 'PROPRETE' | 'AUTRE' | 'SECURITY' | 'MECHANICAL' | 'LIGHTING' | 'TIRES' | 'FLUIDS' | 'CLEANLINESS';
    description: string;
    severity: 'MINEUR' | 'MAJEUR' | 'CRITIQUE';
    requiresImmediateMaintenance: boolean;
  }>;
  photos?: string[];
  driverName: string;
  driverSignature?: string;
  inspectorNotes?: string;
  location?: string;
  score?: number;
  grade?: string;
}

export async function createInspection(data: InspectionData) {
  const supabase = await createClient();
  
  // Vérifier l'authentification
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('createInspection: User not authenticated');
    return { error: 'Non authentifié', data: null };
  }

  // Création inspection

  try {
    // Vérifier que le véhicule existe
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id, registration_number, type')
      .eq('id', data.vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      console.error('createInspection: Vehicle not found', vehicleError?.message);
      return { error: 'Véhicule non trouvé', data: null };
    }

    // Véhicule trouvé

    // Vérifier le profil de l'utilisateur (optionnel - pour info seulement)
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    // Profil récupéré

    // Autoriser si le profil n'existe pas (fallback) OU si les company_id correspondent
    // OU si le véhicule appartient à la même company que l'utilisateur connecté
    if (profile && profile.company_id && profile.company_id !== vehicle.company_id) {
      console.error('createInspection: Company mismatch');
      return { error: 'Non autorisé - Ce véhicule n\'appartient pas à votre entreprise', data: null };
    }

    // Calculer le score et la grade
    const totalChecks = data.reportedDefects.length + 30; // Approximation
    const criticalCount = data.reportedDefects.filter(d => d.severity === 'CRITIQUE').length;
    const warningCount = data.reportedDefects.filter(d => d.severity === 'MAJEUR').length;
    const score = data.score || Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    const grade = data.grade || (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D');

    const statusValue = data.reportedDefects?.some((d: { severity?: string }) => d.severity === 'CRITIQUE') 
      ? 'CRITICAL_ISSUES' 
      : data.reportedDefects?.length > 0 
        ? 'ISSUES_FOUND' 
        : 'COMPLETED';

    // Créer l'inspection via RPC (sécurisé, gère l'enum et la validation km)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: inspectionError } = await (supabase as any)
      .rpc('create_inspection_safe', {
        p_vehicle_id: data.vehicleId,
        p_company_id: vehicle.company_id,
        p_mileage: data.mileage,
        p_fuel_level: data.fuelLevel,
        p_adblue_level: data.adblueLevel,
        p_gnr_level: data.gnrLevel,
        p_cleanliness_exterior: data.cleanlinessExterior,
        p_cleanliness_interior: data.cleanlinessInterior,
        p_cleanliness_cargo_area: data.cleanlinessCargoArea,
        p_compartment_c1_temp: data.compartmentC1Temp,
        p_compartment_c2_temp: data.compartmentC2Temp,
        p_tires_condition: data.tiresCondition,
        p_reported_defects: data.reportedDefects,
        p_photos: data.photos || [],
        p_driver_name: data.driverName,
        p_driver_signature: data.driverSignature,
        p_inspector_notes: data.inspectorNotes,
        p_location: data.location,
        p_created_by: user.id,
        p_score: score,
        p_grade: grade,
        p_status: statusValue
      });

    if (inspectionError || !result?.success) {
      console.error('Error creating inspection:', inspectionError || result?.error);
      return { error: inspectionError?.message || result?.error || 'Erreur lors de la création', data: null };
    }

    // Si défauts critiques, créer automatiquement une demande de maintenance
    const criticalDefects = data.reportedDefects.filter(d => d.severity === 'CRITIQUE');
    for (const defect of criticalDefects) {
      await supabase
        .from('maintenance_records')
        .insert({
          vehicle_id: data.vehicleId,
          company_id: vehicle.company_id,
          type: 'CORRECTIVE',
          status: 'DEMANDE_CREEE',
          description: `[Contrôle #${result.inspection_id}] ${defect.description}`,
          requested_by: user.id,
        });
    }

    revalidatePath('/inspections');
    revalidatePath(`/vehicles/${data.vehicleId}`);

    return { 
      data: { 
        success: true, 
        inspectionId: result.inspection_id,
        status: statusValue,
        criticalDefectsCount: criticalDefects.length,
      }, 
      error: null 
    };

  } catch (error) {
    console.error('Error in createInspection:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error', data: null };
  }
}

export async function getInspectionsByVehicle(vehicleId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié', data: null };
  }

  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getRecentInspections(companyId: string, limit: number = 10) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié', data: null };
  }

  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select(`
      *,
      vehicle:vehicles(registration_number, type, brand, model)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getInspectionById(inspectionId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié', data: null };
  }

  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select(`
      *,
      vehicle:vehicles(*),
      creator:profiles!created_by(full_name, email)
    `)
    .eq('id', inspectionId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function findVehicleByPlate(plateNumber: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié', data: null };
  }

  // Utiliser la fonction RPC qui gere la normalisation
  const { data, error } = await supabase
    .rpc('search_vehicle_by_plate' as any, { search_term: plateNumber });

  if (error) {
    console.error('Error searching vehicle:', error);
    
    // Fallback: recherche simple si la fonction RPC n'existe pas
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, type, mileage, company_id, qr_code_data')
      .ilike('registration_number', `%${plateNumber}%`)
      .limit(5);
    
    if (fallbackError) {
      return { error: fallbackError.message, data: null };
    }
    
    return { data: fallbackData, error: null };
  }

  return { data, error: null };
}
