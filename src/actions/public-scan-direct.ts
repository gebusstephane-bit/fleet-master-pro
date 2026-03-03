/**
 * Action directe pour créer un plein sans fonction RPC
 * Fallback si la fonction create_fuel_session n'existe pas ou a des problèmes
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { scanPublicActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const fuelTypeSchema = z.enum(['diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg']);

const fuelSessionSchema = z.object({
  vehicleId: z.string().uuid(),
  accessToken: z.string(),
  fuels: z.array(z.object({
    type: fuelTypeSchema,
    liters: z.number().min(0.01).max(2000),
    price: z.number().min(0).max(10000).nullable(),
    mileage: z.number().int().min(0).max(9999999).nullable(),
  })).min(1).max(3),
  driverName: z.string().min(2).max(100),
  stationName: z.string().max(200).optional(),
});

export const createFuelSessionDirect = scanPublicActionClient
  .schema(fuelSessionSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    // Vérifier le token et récupérer company_id
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, company_id, qr_code_data, mileage')
      .eq('id', parsedInput.vehicleId)
      .eq('status', 'active')
      .single();
    
    if (vehicleError || !vehicle) {
      throw new Error('Véhicule non trouvé');
    }
    
    if (vehicle.qr_code_data !== parsedInput.accessToken) {
      throw new Error('Token invalide');
    }
    
    const recordIds: string[] = [];
    let maxMileage = 0;
    
    // Insérer chaque carburant
    for (const fuel of parsedInput.fuels) {
      // Calculer consommation si possible
      let consumption: number | null = null;
      
      if (fuel.type !== 'gnr' && fuel.mileage) {
        const { data: prevFill } = await supabase
          .from('fuel_records')
          .select('mileage_at_fill, quantity_liters')
          .eq('vehicle_id', parsedInput.vehicleId)
          .eq('fuel_type', fuel.type)
          .lt('mileage_at_fill', fuel.mileage)
          .order('mileage_at_fill', { ascending: false })
          .limit(1)
          .single();
        
        if (prevFill) {
          const distance = fuel.mileage - prevFill.mileage_at_fill;
          if (distance > 0) {
            consumption = (prevFill.quantity_liters / distance) * 100;
          }
        }
        
        if (fuel.mileage > maxMileage) {
          maxMileage = fuel.mileage;
        }
      }
      
      // Insérer le record
      const insertData: any = {
        company_id: vehicle.company_id,
        vehicle_id: parsedInput.vehicleId,
        fuel_type: fuel.type,
        quantity_liters: fuel.liters,
        price_total: fuel.price,
        price_per_liter: fuel.price && fuel.liters > 0 
          ? Math.round((fuel.price / fuel.liters) * 1000) / 1000 
          : null,
        mileage_at_fill: fuel.type === 'gnr' ? null : fuel.mileage,
        consumption_l_per_100km: consumption,
        station_name: parsedInput.stationName || null,
        driver_name: parsedInput.driverName || null,  // STOCKER LE NOM DU CONDUCTEUR
        notes: 'Saisi via QR',
      };
      
      const { data: record, error: insertError } = await supabase
        .from('fuel_records')
        .insert(insertData)
        .select('id')
        .single();
      
      if (insertError) {
        console.error('[FUEL_DIRECT] Insert error:', insertError);
        throw new Error(`Erreur insertion: ${insertError.message}`);
      }
      
      recordIds.push(record.id);
    }
    
    // Mettre à jour le kilométrage du véhicule
    if (maxMileage > 0 && maxMileage > (vehicle.mileage || 0)) {
      await supabase
        .from('vehicles')
        .update({ mileage: maxMileage, updated_at: new Date().toISOString() })
        .eq('id', parsedInput.vehicleId);
    }
    
    // Invalider le cache de la page fuel
    revalidatePath('/fuel');
    
    return {
      success: true,
      ticketNumber: recordIds[0].slice(0, 8),
      count: recordIds.length,
      recordIds,
    };
  });
