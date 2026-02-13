'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
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
  tiresCondition: any;
  reportedDefects: any[];
  photos?: string[];
  driverName: string;
  driverSignature?: string;
  inspectorNotes?: string;
  location?: string;
  score?: number;
  grade?: string;
  status?: 'PENDING' | 'COMPLETED' | 'ISSUES_FOUND' | 'CRITICAL_ISSUES';
}

export async function createInspectionSafe(data: InspectionData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('createInspectionSafe: User not authenticated');
    return { error: 'Non authentifié', data: null };
  }

  console.log('createInspectionSafe: Starting for user', user.id);

  try {
    // Récupérer le véhicule
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id, registration_number, type, mileage')
      .eq('id', data.vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      console.error('createInspectionSafe: Vehicle error', vehicleError);
      return { error: 'Véhicule non trouvé', data: null };
    }

    console.log('createInspectionSafe: Vehicle found', vehicle.registration_number);

    // Calculer le score
    const criticalCount = data.reportedDefects.filter(d => d.severity === 'CRITIQUE').length;
    const warningCount = data.reportedDefects.filter(d => d.severity === 'MAJEUR').length;
    const score = data.score || Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    const grade = data.grade || (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D');
    
    // Déterminer le statut - par défaut PENDING pour validation admin
    const status = data.status || (criticalCount > 0 ? 'CRITICAL_ISSUES' : 'PENDING');

    console.log('createInspectionSafe: Score calculated', score, grade, 'Status:', status);

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
        status: status,
      })
      .select()
      .single();

    if (inspectionError) {
      console.error('createInspectionSafe: Insert error', inspectionError);
      return { error: `Erreur lors de la création: ${inspectionError.message}`, data: null };
    }

    console.log('createInspectionSafe: Inspection created', inspection.id);

    // Mettre à jour le kilométrage
    await supabase
      .from('vehicles')
      .update({ mileage: data.mileage })
      .eq('id', data.vehicleId);

    // Créer les maintenances pour les défauts critiques
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
    console.error('createInspectionSafe: Exception', error);
    return { error: error.message, data: null };
  }
}

// Fonction pour valider un contrôle
export async function validateInspection(inspectionId: string) {
  const supabase = createAdminClient();
  
  try {
    // Récupérer l'inspection
    const { data: inspection, error: fetchError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      return { error: 'Inspection non trouvée', data: null };
    }

    if (inspection.status !== 'PENDING') {
      return { error: 'Cette inspection a déjà été traitée', data: null };
    }

    const newStatus = inspection.reported_defects?.length > 0 
      ? (inspection.reported_defects.some((d: any) => d.severity === 'CRITIQUE') ? 'CRITICAL_ISSUES' : 'ISSUES_FOUND')
      : 'COMPLETED';

    const { error } = await supabase
      .from('vehicle_inspections')
      .update({ status: newStatus, validated_at: new Date().toISOString() })
      .eq('id', inspectionId);

    if (error) {
      return { error: error.message, data: null };
    }

    revalidatePath('/inspections');
    revalidatePath(`/inspections/${inspectionId}`);
    revalidatePath(`/vehicles/${inspection.vehicle_id}`);

    return { data: { success: true, status: newStatus }, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Fonction pour réfuser un contrôle
export async function rejectInspection(inspectionId: string, reason: string) {
  const supabase = createAdminClient();
  
  try {
    const { data: inspection, error: fetchError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      return { error: 'Inspection non trouvée', data: null };
    }

    if (inspection.status !== 'PENDING') {
      return { error: 'Cette inspection a déjà été traitée', data: null };
    }

    const { error } = await supabase
      .from('vehicle_inspections')
      .update({ 
        status: 'REFUSEE', 
        validated_at: new Date().toISOString(),
        inspector_notes: (inspection.inspector_notes || '') + `\n\n[REFUSÉ] ${reason}`
      })
      .eq('id', inspectionId);

    if (error) {
      return { error: error.message, data: null };
    }

    revalidatePath('/inspections');
    revalidatePath(`/inspections/${inspectionId}`);
    revalidatePath(`/vehicles/${inspection.vehicle_id}`);

    return { data: { success: true }, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Fonction pour récupérer les inspections
export async function getInspectionsSafe(companyId?: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié', data: null };
  }

  try {
    // Requête 1: Récupérer les inspections
    let inspectionsQuery = supabase
      .from('vehicle_inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (companyId) {
      inspectionsQuery = inspectionsQuery.eq('company_id', companyId);
    }

    const { data: inspections, error: inspectionsError } = await inspectionsQuery;

    if (inspectionsError) {
      console.error('getInspectionsSafe: Error fetching inspections', inspectionsError);
      return { error: inspectionsError.message, data: null };
    }

    if (!inspections || inspections.length === 0) {
      return { data: [], error: null };
    }

    // Requête 2: Récupérer les véhicules liés
    const vehicleIds = [...new Set(inspections.map(i => i.vehicle_id))];
    
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, type')
      .in('id', vehicleIds);

    if (vehiclesError) {
      console.error('getInspectionsSafe: Error fetching vehicles', vehiclesError);
      return { data: inspections, error: null };
    }

    // Fusionner les données
    const vehiclesMap = (vehicles || []).reduce((acc, v) => {
      acc[v.id] = v;
      return acc;
    }, {} as Record<string, any>);

    const enrichedInspections = inspections.map(inspection => ({
      ...inspection,
      vehicle: vehiclesMap[inspection.vehicle_id] || null
    }));

    return { data: enrichedInspections, error: null };
  } catch (error: any) {
    console.error('getInspectionsSafe: Exception', error);
    return { error: error.message, data: null };
  }
}
