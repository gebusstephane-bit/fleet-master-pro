'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface Defect {
  id: string;
  description: string;
  severity: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
  category: string;
}

interface TiresCondition {
  frontLeft?: 'GOOD' | 'WORN' | 'BAD';
  frontRight?: 'GOOD' | 'WORN' | 'BAD';
  rearLeft?: 'GOOD' | 'WORN' | 'BAD';
  rearRight?: 'GOOD' | 'WORN' | 'BAD';
  spare?: 'GOOD' | 'WORN' | 'BAD';
  notes?: string;
}

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
  tiresCondition: TiresCondition;
  reportedDefects: Defect[];
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

  // Création inspection démarrée

  try {
    // Récupérer le véhicule
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id, registration_number, type, mileage')
      .eq('id', data.vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      console.error('createInspectionSafe: Vehicle error', vehicleError?.message);
      return { error: 'Véhicule non trouvé', data: null };
    }

    // Véhicule trouvé

    // Calculer le score
    const criticalCount = data.reportedDefects.filter(d => d.severity === 'CRITIQUE').length;
    const warningCount = data.reportedDefects.filter(d => d.severity === 'MAJEUR').length;
    const score = data.score || Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    const grade = data.grade || (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D');
    
    // Déterminer le statut - par défaut PENDING pour validation admin
    const status = data.status || (criticalCount > 0 ? 'CRITICAL_ISSUES' : 'PENDING');

    // Score calculé

    // Créer l'inspection
    const inspectionData: Record<string, unknown> = {
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
      driver_name: data.driverName,
      driver_signature: data.driverSignature,
      inspector_notes: data.inspectorNotes,
      location: data.location,
      created_by: user.id,
      score: score,
      grade: grade,
      defects_count: data.reportedDefects.length,
      reported_defects: data.reportedDefects,  // ← AJOUT: Stocker les détails des défauts
      status: status,
    };
    
    const { data: inspection, error: inspectionError } = await supabase
      .from('vehicle_inspections')
      .insert(inspectionData as never)
      .select()
      .single();

    if (inspectionError) {
      console.error('createInspectionSafe: Insert error', inspectionError);
      return { error: `Erreur lors de la création: ${inspectionError.message}`, data: null };
    }

    // Inspection créée

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

  } catch (error) {
    console.error('createInspectionSafe: Exception', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

// Fonction pour valider un contrôle (Dashboard uniquement - IDOR sécurisé)
export async function validateInspection(inspectionId: string) {
  const supabase = createAdminClient();
  
  try {
    // 1. Vérifier l'authentification et récupérer le profil
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Non authentifié', data: null };
    }

    // 2. Récupérer le profil avec company_id et rôle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { error: 'Profil utilisateur invalide', data: null };
    }

    // 3. Vérifier les permissions (ADMIN, DIRECTEUR, AGENT_DE_PARC uniquement)
    const allowedRoles = ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'];
    if (!allowedRoles.includes(profile.role)) {
      return { error: 'Permissions insuffisantes pour valider une inspection', data: null };
    }

    // 4. Récupérer l'inspection avec company_id (IDOR protection)
    const { data: inspection, error: fetchError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      console.error('[validateInspection] Inspection fetch error:', fetchError);
      return { error: 'Inspection non trouvée', data: null };
    }

    // 5. Vérification IDOR : l'inspection doit appartenir à l'entreprise de l'utilisateur
    // L'inspection a un company_id directement stocké à la création
    const inspectionCompanyId = inspection.company_id;
    if (!inspectionCompanyId) {
      console.error('[validateInspection] Inspection sans company_id:', inspectionId);
      return { error: 'Inspection invalide (pas de company_id)', data: null };
    }
    
    if (inspectionCompanyId !== profile.company_id) {
      console.warn('[IDOR] Tentative d\'accès interdit à la validation');
      return { error: 'Inspection non trouvée', data: null };
    }

    if (inspection.status !== 'PENDING') {
      return { error: 'Cette inspection a déjà été traitée', data: null };
    }

    const defects = Array.isArray(inspection.reported_defects) ? (inspection.reported_defects as unknown as Defect[]) : [];
    const newStatus = defects.length > 0 
      ? (defects.some((d) => d.severity === 'CRITIQUE') ? 'CRITICAL_ISSUES' : 'ISSUES_FOUND')
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

// Fonction pour réfuser un contrôle (Dashboard uniquement - IDOR sécurisé)
export async function rejectInspection(inspectionId: string, reason: string) {
  const supabase = createAdminClient();
  
  try {
    // 1. Vérifier l'authentification et récupérer le profil
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Non authentifié', data: null };
    }

    // 2. Récupérer le profil avec company_id et rôle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { error: 'Profil utilisateur invalide', data: null };
    }

    // 3. Vérifier les permissions (ADMIN, DIRECTEUR, AGENT_DE_PARC uniquement)
    const allowedRoles = ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'];
    if (!allowedRoles.includes(profile.role)) {
      return { error: 'Permissions insuffisantes pour rejeter une inspection', data: null };
    }

    // 4. Récupérer l'inspection avec company_id (IDOR protection)
    const { data: inspection, error: fetchError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      console.error('[rejectInspection] Inspection fetch error:', fetchError);
      return { error: 'Inspection non trouvée', data: null };
    }

    // 5. Vérification IDOR : l'inspection doit appartenir à l'entreprise de l'utilisateur
    const inspectionCompanyId = inspection.company_id;
    if (!inspectionCompanyId) {
      console.error('[rejectInspection] Inspection sans company_id');
      return { error: 'Inspection invalide (pas de company_id)', data: null };
    }
    
    if (inspectionCompanyId !== profile.company_id) {
      console.warn('[IDOR] Tentative d\'accès interdit au rejet');
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
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
    const vehicleIds = Array.from(new Set(inspections.map(i => i.vehicle_id)));
    
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, type')
      .in('id', vehicleIds);

    if (vehiclesError) {
      console.error('getInspectionsSafe: Error fetching vehicles', vehiclesError);
      return { data: inspections, error: null };
    }

    // Fusionner les données
    interface VehicleInfo {
      id: string;
      registration_number: string;
      brand: string;
      model: string;
      type: string;
    }
    
    const vehiclesMap = (vehicles || []).reduce<Record<string, VehicleInfo>>((acc, v) => {
      acc[v.id] = v as VehicleInfo;
      return acc;
    }, {});

    const enrichedInspections = inspections.map(inspection => ({
      ...inspection,
      vehicle: vehiclesMap[inspection.vehicle_id] || null
    }));

    return { data: enrichedInspections, error: null };
  } catch (error) {
    console.error('getInspectionsSafe: Exception', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}
