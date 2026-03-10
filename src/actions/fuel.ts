'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const createFuelRecordSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  date: z.string(),
  quantity_liters: z.number().min(0),
  price_total: z.number().min(0),
  mileage_at_fill: z.number().min(0),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg']),
  station_name: z.string().optional(),
  notes: z.string().optional(),
});

// Créer un plein
export const createFuelRecord = authActionClient
  .schema(createFuelRecordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Vérifier que le véhicule appartient à l'entreprise (RLS gère la sécurité)
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, mileage')
      .eq('id', parsedInput.vehicle_id)
      .single();
    
    if (!vehicle) {
      throw new Error('Véhicule non trouvé');
    }
    
    // Calculer le prix au litre
    const price_per_liter = parsedInput.price_total / parsedInput.quantity_liters;
    
    // Calculer la consommation si on a un plein précédent
    let consumption_l_per_100km: number | null = null;
    
    const { data: previousFill } = await supabase
      .from('fuel_records')
      .select('mileage_at_fill, quantity_liters')
      .eq('vehicle_id', parsedInput.vehicle_id)
      .lt('mileage_at_fill', parsedInput.mileage_at_fill)
      .order('mileage_at_fill', { ascending: false })
      .limit(1)
      .single();
    
    if (previousFill) {
      const distance_km = parsedInput.mileage_at_fill - previousFill.mileage_at_fill;
      const liters_consumed = previousFill.quantity_liters;
      consumption_l_per_100km = (liters_consumed / distance_km) * 100;
    }
    
    // Insérer le plein
    const { data, error } = await supabase
      .from('fuel_records')
      .insert({
        ...parsedInput,
        price_per_liter: Math.round(price_per_liter * 1000) / 1000,
        consumption_l_per_100km,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur création: ${error.message}`);
    }
    
    // Mettre à jour le kilométrage du véhicule si supérieur
    if (parsedInput.mileage_at_fill > vehicle.mileage) {
      await supabase
        .from('vehicles')
        .update({ mileage: parsedInput.mileage_at_fill })
        .eq('id', parsedInput.vehicle_id);
    }
    
    revalidatePath('/fuel');
    revalidatePath(`/vehicles/${parsedInput.vehicle_id}`);
    return { success: true, data };
  });

// Récupérer les pleins d'un véhicule
export const getFuelRecordsByVehicle = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*, drivers(first_name, last_name)')
      .eq('vehicle_id', parsedInput.id)
      .order('date', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

// Récupérer tous les pleins de l'entreprise
export const getAllFuelRecords = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // Vérifier que l'utilisateur a une company_id
    if (!ctx.user.company_id) {
      return { success: true, data: [] };
    }
    
    logger.debug('[FUEL] Recherche records pour company_id:', ctx.user.company_id);
    
    // Requête simple sans jointure pour éviter les problèmes de vue/RLS
    const { data: records, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      logger.error('[FUEL] Erreur:', error);
      throw new Error(`Erreur: ${error.message}`);
    }
    
    logger.debug(`[FUEL] Récupéré ${records?.length || 0} records`);
    
    // Récupérer les infos véhicules séparément pour faire la jointure manuellement
    const vehicleIds = Array.from(new Set((records || []).map(r => r.vehicle_id).filter(Boolean)));
    let vehiclesMap = new Map();
    
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, registration_number, brand, model')
        .in('id', vehicleIds);
      
      vehiclesMap = new Map(vehicles?.map(v => [v.id, v]) || []);
    }
    
    // Joindre manuellement
    const formattedData = (records || []).map((record: any) => ({
      ...record,
      vehicles: vehiclesMap.get(record.vehicle_id) || null,
    }));
    
    return { success: true, data: formattedData };
  });

// Récupérer les anomalies carburant récentes (notifications non lues)
export const getFuelAnomalies = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, priority, created_at, data')
      .eq('type', 'fuel_anomaly')
      .eq('user_id', ctx.user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Erreur récupération anomalies: ${error.message}`);
    }

    return { success: true, data: data || [] };
  });

// Ignorer une anomalie (marquer comme lue)
export const dismissFuelAnomaly = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);

    if (error) {
      throw new Error(`Erreur: ${error.message}`);
    }

    return { success: true };
  });

// Calculer les stats carburant
export const getFuelStats = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // Vérifier que l'utilisateur a une company_id
    if (!ctx.user.company_id) {
      return { 
        success: true, 
        data: {
          averageConsumption: null,
          totalCost: 0,
          totalRecords: 0,
          vehicleStats: [],
          monthOverMonthChange: { liters: 0, cost: 0, consumption: 0 }
        }
      };
    }
    
    // Récupérer tous les records du mois en cours
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: records } = await supabase
      .from('fuel_records')
      .select('quantity_liters, price_total, consumption_l_per_100km, vehicle_id')
      .eq('company_id', ctx.user.company_id)
      .gte('date', startOfMonth);
    
    if (!records || records.length === 0) {
      return { 
        success: true, 
        data: {
          averageConsumption: null,
          totalCost: 0,
          totalRecords: 0,
          vehicleStats: [],
          monthOverMonthChange: { liters: 0, cost: 0, consumption: 0 }
        }
      };
    }
    
    // Calculer les stats globales
    const totalRecords = records.length;
    const totalCost = records.reduce((sum, r) => sum + (r.price_total || 0), 0);
    const recordsWithConsumption = records.filter(r => r.consumption_l_per_100km);
    const averageConsumption = recordsWithConsumption.length > 0
      ? recordsWithConsumption.reduce((sum, r) => sum + (r.consumption_l_per_100km || 0), 0) / recordsWithConsumption.length
      : null;
    
    // Récupérer les infos véhicules pour les stats
    const vehicleIds = Array.from(new Set(records.map(r => r.vehicle_id).filter(Boolean)));
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model')
      .in('id', vehicleIds);
    
    const vehicleInfoMap = new Map(vehicles?.map(v => [v.id, v]) || []);
    
    // Stats par véhicule
    const vehicleMap = new Map();
    for (const record of records) {
      const vid = record.vehicle_id;
      if (!vehicleMap.has(vid)) {
        const vInfo = vehicleInfoMap.get(vid);
        vehicleMap.set(vid, {
          registration_number: vInfo?.registration_number || '',
          brand: vInfo?.brand || '',
          model: vInfo?.model || '',
          records: []
        });
      }
      vehicleMap.get(vid).records.push(record);
    }
    
    const vehicleStats: any[] = [];
    vehicleMap.forEach((vData) => {
      const vRecords = vData.records.filter((r: any) => r.consumption_l_per_100km);
      if (vRecords.length > 0) {
        const avg = vRecords.reduce((sum: number, r: any) => sum + (r.consumption_l_per_100km || 0), 0) / vRecords.length;
        vehicleStats.push({
          registration_number: vData.registration_number,
          brand: vData.brand,
          model: vData.model,
          averageConsumption: Math.round(avg * 10) / 10,
          fillCount: vData.records.length
        });
      }
    });
    
    return { 
      success: true, 
      data: {
        averageConsumption: averageConsumption ? Math.round(averageConsumption * 10) / 10 : null,
        totalCost,
        totalRecords,
        vehicleStats,
        monthOverMonthChange: { liters: 0, cost: 0, consumption: 0 } // Simplifié pour l'instant
      }
    };
  });
