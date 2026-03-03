'use server';

/**
 * Actions Maintenance - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Les policies PostgreSQL assurent l'isolation par company_id
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient, idSchema } from '@/lib/safe-action';
import { maintenanceSchema } from '@/lib/schemas/maintenance';
import { createClient } from '@/lib/supabase/server';

// Mapping des types frontend vers DB
const typeToDb: Record<string, string> = {
  'PREVENTIVE': 'routine',
  'CORRECTIVE': 'repair',
  'INSPECTION': 'inspection',
  'TIRE_CHANGE': 'tire_change',
  'OIL_CHANGE': 'oil_change',
  'BRAKE_CHANGE': 'repair',
  'FILTER_CHANGE': 'routine',
  'TIMING_BELT': 'repair',
  'TECHNICAL_CONTROL': 'inspection',
  'OTHER': 'repair',
};

/**
 * Créer une intervention
 * RLS : Vérifie que le véhicule appartient à la company
 */
export const createMaintenance = authActionClient
  .schema(maintenanceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { 
      vehicleId, 
      documents, 
      partsReplaced, 
      serviceDate,
      nextServiceDue,
      ...maintenanceData 
    } = parsedInput;
    
    // Vérifier que le véhicule appartient à l'entreprise (RLS)
    // Récupérer aussi company_id pour l'insert
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, company_id')
      .eq('id', vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      throw new Error('Véhicule non trouvé ou accès non autorisé');
    }
    
    // Mapping du status frontend → DB (workflow complet maintenance)
    const statusMap: Record<string, string> = {
      'DEMANDE_CREEE': 'DEMANDE_CREEE',
      'VALIDEE_DIRECTEUR': 'VALIDEE_DIRECTEUR',
      'RDV_PRIS': 'RDV_PRIS',
      'EN_COURS': 'EN_COURS',
      'TERMINEE': 'TERMINEE',
      'REFUSEE': 'REFUSEE',
    };
    
    // Insérer l'intervention
    // NOTE: Colonnes réelles de maintenance_records (schema vérifié)
    const insertData: any = {
      vehicle_id: vehicleId,
      company_id: vehicle.company_id,
      type: (typeToDb[maintenanceData.type] || 'repair'),
      description: maintenanceData.description,
      status: statusMap[maintenanceData.status] || 'DEMANDE_CREEE', // ← Utilise le status reçu (défaut: DEMANDE_CREEE)
      priority: maintenanceData.priority === 'CRITICAL' ? 'CRITICAL' : 
                maintenanceData.priority === 'HIGH' ? 'HIGH' : 
                maintenanceData.priority === 'NORMAL' ? 'NORMAL' : 'LOW',
      requested_at: new Date().toISOString(), // Date de création de la demande
    };
    
    // Ajouter les champs optionnels selon le schema réel
    if (maintenanceData.cost !== undefined && maintenanceData.cost !== null) {
      insertData.cost = maintenanceData.cost;
    }
    if (maintenanceData.mileageAtService) {
      insertData.mileage_at_maintenance = maintenanceData.mileageAtService;
    }
    // NOTE: completed_date ne remplit que si TERMINEE, sinon c'est scheduled_date
    if (serviceDate && maintenanceData.status === 'TERMINEE') {
      insertData.completed_date = serviceDate;
      insertData.status = 'TERMINEE';
    } else if (serviceDate) {
      insertData.scheduled_date = serviceDate;
    }
    if (maintenanceData.garage) {
      insertData.garage_name = maintenanceData.garage;
    }
    
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur création intervention: ${error.message}`);
    }
    
    // Mettre à jour les dates réglementaires si intervention CT/Tachy/ATP terminée
    if (maintenanceData.status === 'TERMINEE') {
      // Normalisation pour détection robuste (sans accents)
      const descriptionLower = (maintenanceData.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const typeLower = maintenanceData.type?.toLowerCase() || '';
      
      const isCT = descriptionLower.includes('controle technique') || 
                   descriptionLower.includes('control technique') ||
                   typeLower.includes('inspection') ||
                   descriptionLower.includes('ct ');
                   
      const isTachy = descriptionLower.includes('tachygraphe') || 
                      descriptionLower.includes('tachy') ||
                      descriptionLower.includes('calibration');
                      
      const isATP = descriptionLower.includes('atp') || 
                    descriptionLower.includes('attestation transporteur');
      
      if (isCT || isTachy || isATP) {
        const completedDate = serviceDate || new Date().toISOString().split('T')[0];
        const vehicleUpdate: any = {};
        
        if (isCT) {
          vehicleUpdate.technical_control_date = completedDate;
        }
        if (isTachy) {
          vehicleUpdate.tachy_control_date = completedDate;
        }
        if (isATP) {
          vehicleUpdate.atp_date = completedDate;
        }
        
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update(vehicleUpdate)
          .eq('id', vehicleId);
          
        if (vehicleError) {
          console.error('[MAINTENANCE] Erreur maj fiche véhicule:', vehicleError);
        }
      }
    }
    
    // Mettre à jour le véhicule avec les prochaines échéances
    if (nextServiceDue || maintenanceData.nextServiceMileage) {
      await supabase
        .from('vehicles')
        .update({
          next_service_due: nextServiceDue || null,
          next_service_mileage: maintenanceData.nextServiceMileage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicleId);
    }
    
    revalidatePath('/maintenance');
    revalidatePath(`/vehicles/${vehicleId}`);
    return { success: true, data: maintenance };
  });

/**
 * Récupérer toutes les interventions
 * RLS : Filtre automatiquement par company_id
 */
export const getMaintenances = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        vehicles(registration_number, brand, model, mileage, next_service_due, next_service_mileage)
      `)
      .order('service_date', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

/**
 * Récupérer les interventions d'un véhicule
 */
export const getMaintenancesByVehicle = authActionClient
  .schema(z.object({ vehicleId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('maintenance_with_details' as any)
      .select('*')
      .eq('vehicle_id', parsedInput.vehicleId)
      .order('requested_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

/**
 * Récupérer une intervention
 * RLS : Filtre par company_id
 */
export const getMaintenanceById = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        vehicles(*),
        maintenance_documents(*)
      `)
      .eq('id', parsedInput.id)
      .single();
    
    if (error) {
      throw new Error(`Intervention non trouvée: ${error.message}`);
    }
    
    return { success: true, data };
  });

/**
 * Mettre à jour une intervention
 * RLS : Vérifie l'appartenance à la company
 */
export const updateMaintenance = authActionClient
  .schema(maintenanceSchema.partial().extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, vehicleId, documents, partsReplaced, ...updates } = parsedInput;
    const supabase = await createClient();
    
    // Vérifier que l'intervention existe
    const { data: existing } = await supabase
      .from('maintenance_records')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existing) {
      throw new Error('Intervention non trouvée');
    }
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({
        ...updates,
        vehicle_id: vehicleId,
        parts_replaced: partsReplaced as any,
      } as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }
    
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${id}`);
    return { success: true, data };
  });

/**
 * Supprimer une intervention
 * RLS : Vérifie l'appartenance
 */
export const deleteMaintenance = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Vérifier que l'intervention existe
    const { data: existing } = await supabase
      .from('maintenance_records')
      .select('id')
      .eq('id', parsedInput.id)
      .single();
    
    if (!existing) {
      throw new Error('Intervention non trouvée');
    }
    
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', parsedInput.id);
    
    if (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
    
    revalidatePath('/maintenance');
    return { success: true };
  });

/**
 * Récupérer les alertes maintenance
 * RLS : Filtre les véhicules par company_id
 */
export const getMaintenanceAlerts = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, mileage, next_service_due, next_service_mileage')
      .eq('status', 'active');
    
    if (error) {
      throw new Error(`Erreur récupération véhicules: ${error.message}`);
    }
    
    // Générer les alertes
    const alerts = [];
    const today = new Date();
    
    for (const vehicle of vehicles || []) {
      // Alerte kilométrage
      if (vehicle.next_service_mileage && vehicle.mileage > vehicle.next_service_mileage - 2000) {
        const remainingKm = vehicle.next_service_mileage - vehicle.mileage;
        alerts.push({
          id: `${vehicle.id}-mileage`,
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.registration_number} - ${vehicle.brand} ${vehicle.model}`,
          type: 'MILEAGE_DUE',
          severity: remainingKm < 0 ? 'CRITICAL' : remainingKm < 500 ? 'WARNING' : 'INFO',
          message: remainingKm < 0 
            ? `Entretien kilométrage dépassé de ${Math.abs(remainingKm)} km`
            : `Entretien préventif dans ${remainingKm} km`,
          dueMileage: vehicle.next_service_mileage,
          currentMileage: vehicle.mileage,
        });
      }
      
      // Alerte date
      if (vehicle.next_service_due) {
        const dueDate = new Date(vehicle.next_service_due);
        const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 30) {
          alerts.push({
            id: `${vehicle.id}-date`,
            vehicleId: vehicle.id,
            vehicleName: `${vehicle.registration_number} - ${vehicle.brand} ${vehicle.model}`,
            type: 'DATE_DUE',
            severity: daysUntil < 0 ? 'CRITICAL' : daysUntil < 7 ? 'WARNING' : 'INFO',
            message: daysUntil < 0
              ? `Entretien date dépassée de ${Math.abs(daysUntil)} jours`
              : `Entretien préventif dans ${daysUntil} jours`,
            dueDate: vehicle.next_service_due,
          });
        }
      }
    }
    
    return { success: true, data: alerts };
  });

/**
 * Statistiques maintenance
 * RLS : Filtre par company_id
 */
export const getMaintenanceStats = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('cost, type, service_date')
      .gte('service_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    
    if (error) {
      throw new Error(`Erreur stats: ${error.message}`);
    }
    
    const stats = {
      totalCost: data?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0,
      count: data?.length || 0,
      byType: {} as Record<string, { count: number; cost: number }>,
    };
    
    data?.forEach(record => {
      const type = record.type;
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, cost: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].cost += record.cost || 0;
    });
    
    return { success: true, data: stats };
  });
