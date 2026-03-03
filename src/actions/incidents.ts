'use server';

/**
 * Actions Sinistres — FleetMaster Pro
 * Pattern identique aux autres modules (vehicles, drivers)
 * RLS via createClient() — pas de createAdminClient()
 */

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { CreateIncidentData, UpdateIncidentData } from '@/lib/schemas';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// READ
// ============================================================

export async function getIncidents(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        vehicles (id, registration_number, brand, model),
        drivers (id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('getIncidents: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    logger.error('getIncidents: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

export async function getIncident(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        vehicles (id, registration_number, brand, model, type),
        drivers (id, first_name, last_name, phone),
        incident_documents (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('getIncident: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    logger.error('getIncident: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

export async function getIncidentStats(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select(`
        id, incident_date, estimated_damage, status, severity,
        vehicle_id, driver_id,
        vehicles (id, registration_number, brand, model),
        drivers (id, first_name, last_name)
      `)
      .gte('incident_date', twelveMonthsAgo.toISOString())
      .order('incident_date', { ascending: true });

    if (error) {
      logger.error('getIncidentStats: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    const data = incidents ?? [];
    const totalCost = data.reduce((sum, i: any) => sum + (i.estimated_damage ?? 0), 0);

    // Véhicule avec le plus de sinistres
    const vehicleCounts: Record<string, { count: number; label: string }> = {};
    data.forEach((i: any) => {
      if (i.vehicle_id && i.vehicles) {
        if (!vehicleCounts[i.vehicle_id]) {
          vehicleCounts[i.vehicle_id] = {
            count: 0,
            label: `${i.vehicles.brand} ${i.vehicles.model} (${i.vehicles.registration_number})`,
          };
        }
        vehicleCounts[i.vehicle_id].count++;
      }
    });
    const topVehicle = Object.values(vehicleCounts).sort((a, b) => b.count - a.count)[0] ?? null;

    // Conducteur avec le plus de sinistres
    const driverCounts: Record<string, { count: number; label: string }> = {};
    data.forEach((i: any) => {
      if (i.driver_id && i.drivers) {
        if (!driverCounts[i.driver_id]) {
          driverCounts[i.driver_id] = {
            count: 0,
            label: `${i.drivers.first_name} ${i.drivers.last_name}`,
          };
        }
        driverCounts[i.driver_id].count++;
      }
    });
    const topDriver = Object.values(driverCounts).sort((a, b) => b.count - a.count)[0] ?? null;

    // Par mois (12 derniers mois)
    const byMonth: Record<string, number> = {};
    data.forEach((i: any) => {
      const month = new Date(i.incident_date).toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      byMonth[month] = (byMonth[month] ?? 0) + 1;
    });

    return {
      success: true,
      data: {
        total: data.length,
        totalCost,
        topVehicle,
        topDriver,
        byMonth,
      },
    };
  } catch (err) {
    logger.error('getIncidentStats: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

// ============================================================
// WRITE
// ============================================================

export async function createIncident(formData: CreateIncidentData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile?.company_id) {
      logger.error('createIncident: Profil non trouvé', profileError ? new Error(profileError.message) : undefined);
      return { success: false, error: 'Profil ou entreprise non trouvé' };
    }

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        company_id: profile.company_id,
        vehicle_id: formData.vehicle_id,
        driver_id: formData.driver_id ?? null,
        incident_date: formData.incident_date,
        location_description: formData.location_description ?? null,
        incident_type: formData.incident_type,
        severity: formData.severity ?? null,
        circumstances: formData.circumstances ?? null,
        third_party_involved: formData.third_party_involved ?? false,
        third_party_info: formData.third_party_info ?? null,
        injuries_description: formData.injuries_description ?? null,
        witnesses: formData.witnesses ?? null,
        insurance_company: formData.insurance_company ?? null,
        insurance_policy_number: formData.insurance_policy_number ?? null,
        claim_number: formData.claim_number ?? null,
        claim_date: formData.claim_date ?? null,
        claim_status: formData.claim_status ?? 'non_declaré',
        estimated_damage: formData.estimated_damage ?? null,
        final_settlement: formData.final_settlement ?? null,
        status: formData.status ?? 'ouvert',
        notes: formData.notes ?? null,
        reported_by: authUser.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('createIncident: Erreur insertion', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/incidents');
    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (err) {
    logger.error('createIncident: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

export async function updateIncident(formData: UpdateIncidentData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { id, ...rest } = formData;
    const { data, error } = await supabase
      .from('incidents')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('updateIncident: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/incidents');
    revalidatePath(`/incidents/${id}`);
    return { success: true, data };
  } catch (err) {
    logger.error('updateIncident: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

export async function deleteIncident(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) {
      logger.error('deleteIncident: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/incidents');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    logger.error('deleteIncident: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

// ============================================================
// DOCUMENTS
// ============================================================

export async function addIncidentDocument(
  incidentId: string,
  storagePath: string,
  fileName: string,
  documentType: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    const { data, error } = await supabase
      .from('incident_documents')
      .insert({
        incident_id: incidentId,
        storage_path: storagePath,
        file_name: fileName,
        document_type: documentType,
        uploaded_by: authUser.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('addIncidentDocument: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath(`/incidents/${incidentId}`);
    return { success: true, data };
  } catch (err) {
    logger.error('addIncidentDocument: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

export async function deleteIncidentDocument(documentId: string, storagePath: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return { success: false, error: 'Non authentifié' };

    // Supprimer du storage
    const { error: storageError } = await supabase.storage
      .from('incident-documents')
      .remove([storagePath]);

    if (storageError) {
      logger.error('deleteIncidentDocument: Storage error', new Error(storageError.message));
    }

    // Supprimer l'entrée DB
    const { error } = await supabase.from('incident_documents').delete().eq('id', documentId);
    if (error) {
      logger.error('deleteIncidentDocument: DB error', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    logger.error('deleteIncidentDocument: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}
