'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  console.log('createInspection: User ID:', user.id);

  try {
    // Vérifier que le véhicule existe
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id, registration_number, type')
      .eq('id', data.vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      console.error('createInspection: Vehicle not found', vehicleError);
      return { error: 'Véhicule non trouvé', data: null };
    }

    console.log('createInspection: Vehicle company_id:', vehicle.company_id);

    // Vérifier le profil de l'utilisateur (optionnel - pour info seulement)
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    console.log('createInspection: Profile company_id:', profile?.company_id);

    // Autoriser si le profil n'existe pas (fallback) OU si les company_id correspondent
    // OU si le véhicule appartient à la même company que l'utilisateur connecté
    if (profile && profile.company_id && profile.company_id !== vehicle.company_id) {
      console.error('createInspection: Company mismatch', {
        userCompany: profile.company_id,
        vehicleCompany: vehicle.company_id
      });
      return { error: 'Non autorisé - Ce véhicule n\'appartient pas à votre entreprise', data: null };
    }

    // Calculer le score et la grade
    const totalChecks = data.reportedDefects.length + 30; // Approximation
    const criticalCount = data.reportedDefects.filter(d => d.severity === 'CRITIQUE').length;
    const warningCount = data.reportedDefects.filter(d => d.severity === 'MAJEUR').length;
    const score = data.score || Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    const grade = data.grade || (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D');

    // Créer l'inspection
    const { data: inspection, error: inspectionError } = await supabase
      .from('vehicle_inspections')
      .insert({
        vehicle_id: data.vehicleId,
        company_id: vehicle.company_id,
        mileage: data.mileage,
        fuel_level: data.fuelLevel,
        adblue_level: data.adblueLevel,
        gnr_level: data.gnrLevel,
        cleanliness_exterior: data.cleanlinessExterior,
        cleanliness_interior: data.cleanlinessInterior,
        cleanliness_cargo_area: data.cleanlinessCargoArea,
        compartment_c1_temp: data.compartmentC1Temp,
        compartment_c2_temp: data.compartmentC2Temp,
        tires_condition: data.tiresCondition,
        reported_defects: data.reportedDefects,
        photos: data.photos || [],
        driver_name: data.driverName,
        driver_signature: data.driverSignature,
        inspector_notes: data.inspectorNotes,
        location: data.location,
        created_by: user.id,
        score: score,
        grade: grade,
        defects_count: data.reportedDefects.length,
        status: data.reportedDefects.some(d => d.severity === 'CRITIQUE') 
          ? 'CRITICAL_ISSUES' 
          : data.reportedDefects.length > 0 
            ? 'ISSUES_FOUND' 
            : 'COMPLETED',
      })
      .select()
      .single();

    if (inspectionError) {
      console.error('Error creating inspection:', inspectionError);
      return { error: inspectionError.message, data: null };
    }

    // Mettre à jour le kilométrage du véhicule
    await supabase
      .from('vehicles')
      .update({ mileage: data.mileage })
      .eq('id', data.vehicleId);

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
          description: `[Contrôle #${inspection.id}] ${defect.description}`,
          requested_by: user.id,
        });
    }

    revalidatePath('/inspections');
    revalidatePath(`/vehicles/${data.vehicleId}`);

    return { 
      data: { 
        success: true, 
        inspectionId: inspection.id,
        status: inspection.status,
        criticalDefectsCount: criticalDefects.length,
      }, 
      error: null 
    };

  } catch (error: any) {
    console.error('Error in createInspection:', error);
    return { error: error.message, data: null };
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
    .rpc('search_vehicle_by_plate', { search_term: plateNumber });

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
