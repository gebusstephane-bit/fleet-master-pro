'use server';

import { z } from 'zod';
import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
    
    // RLS filtre automatiquement les véhicules et pleins de l'entreprise
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*, vehicles(registration_number, brand, model), drivers(first_name, last_name)')
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

// Calculer les stats carburant
export const getFuelStats = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // RLS filtre automatiquement les véhicules de l'entreprise
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, fuel_type');
    
    const stats = [];
    
    for (const vehicle of vehicles || []) {
      const { data: records } = await supabase
        .from('fuel_records')
        .select('quantity_liters, price_total, consumption_l_per_100km')
        .eq('vehicle_id', vehicle.id)
        .order('date', { ascending: false })
        .limit(10);
      
      if (records && records.length > 0) {
        const totalLiters = records.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
        const totalCost = records.reduce((sum, r) => sum + (r.price_total || 0), 0);
        const avgConsumption = records
          .filter(r => r.consumption_l_per_100km)
          .reduce((sum, r, _, arr) => sum + (r.consumption_l_per_100km || 0) / arr.length, 0);
        
        stats.push({
          vehicle,
          fillCount: records.length,
          totalLiters,
          totalCost,
          avgConsumption: avgConsumption ? Math.round(avgConsumption * 10) / 10 : null,
        });
      }
    }
    
    return { success: true, data: stats };
  });
