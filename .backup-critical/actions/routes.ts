'use server';

import { z } from 'zod';
import { authActionClient, idSchema } from '@/lib/safe-action';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { routeSchema } from '@/lib/schemas/routes';

// Créer une tournée avec ses arrêts
export const createRoute = authActionClient
  .schema(routeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { stops, vehicleId, driverId, routeDate, totalDistance, estimatedDuration, fuelCost, ...routeData } = parsedInput;
    
    console.log('Creating route with data:', { vehicleId, driverId, routeDate, stopsCount: stops?.length });
    
    // Mapper les champs camelCase vers snake_case pour la DB
    const dbRouteData = {
      name: routeData.name,
      status: routeData.status || 'PLANNED',
      notes: routeData.notes || null,
      vehicle_id: vehicleId,
      driver_id: driverId,
      route_date: routeDate,
      total_distance: totalDistance ?? 0,
      estimated_duration: estimatedDuration ?? 0,
      fuel_cost: fuelCost ?? 0,
      company_id: ctx.user.company_id,
    };
    
    console.log('DB route data:', dbRouteData);
    
    // Insérer la tournée
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert(dbRouteData as any)
      .select()
      .single();
    
    if (routeError) {
      console.error('Route insert error:', routeError);
      throw new Error(`Erreur création tournée: ${routeError.message}`);
    }
    
    console.log('Route created:', route.id);
    
    // Insérer les arrêts
    if (stops && stops.length > 0) {
      // Mapper la priorité texte vers nombre (si la DB attend un integer)
      const priorityMap: Record<string, number> = {
        'LOW': 1,
        'NORMAL': 2,
        'HIGH': 3,
      };
      
      const stopsToInsert = stops.map((stop, index) => ({
        route_id: route.id,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        order_index: index,
        time_window_start: stop.timeWindowStart || null,
        time_window_end: stop.timeWindowEnd || null,
        service_duration: stop.serviceDuration || 15,
        notes: stop.notes || null,
        priority: priorityMap[stop.priority || 'NORMAL'] || 2,
      }));
      
      console.log('Inserting stops:', stopsToInsert.length, stopsToInsert);
      
      const { error: stopsError } = await supabase
        .from('route_stops')
        .insert(stopsToInsert as any);
      
      if (stopsError) {
        console.error('Stops insert error:', stopsError);
        // Supprimer la route si les arrêts échouent
        await supabase.from('routes').delete().eq('id', route.id);
        throw new Error(`Erreur création arrêts: ${stopsError.message}`);
      }
    }
    
    revalidatePath('/routes');
    return { success: true, data: route };
  });

// Récupérer toutes les tournées
export const getRoutes = authActionClient
  .action(async ({ ctx }) => {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        vehicles(registration_number, brand, model),
        drivers(first_name, last_name),
        route_stops(count)
      `)
      .eq('company_id', ctx.user.company_id)
      .order('route_date', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

// Récupérer une tournée avec ses arrêts
export const getRouteById = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { data: route, error } = await supabase
      .from('routes')
      .select(`
        *,
        vehicles(*),
        drivers(*),
        route_stops(*)
      `)
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (error) {
      throw new Error(`Tournée non trouvée: ${error.message}`);
    }
    
    return { success: true, data: route };
  });

// Mettre à jour une tournée
export const updateRoute = authActionClient
  .schema(routeSchema.partial().extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, stops, vehicleId, driverId, routeDate, totalDistance, estimatedDuration, fuelCost, ...updates } = parsedInput;
    const supabase = createAdminClient();
    
    // Mapper les champs camelCase vers snake_case
    const dbUpdates: any = { ...updates };
    if (vehicleId !== undefined) dbUpdates.vehicle_id = vehicleId;
    if (driverId !== undefined) dbUpdates.driver_id = driverId;
    if (routeDate !== undefined) dbUpdates.route_date = routeDate;
    if (totalDistance !== undefined) dbUpdates.total_distance = totalDistance;
    if (estimatedDuration !== undefined) dbUpdates.estimated_duration = estimatedDuration;
    if (fuelCost !== undefined) dbUpdates.fuel_cost = fuelCost;
    
    const { data, error } = await supabase
      .from('routes')
      .update(dbUpdates)
      .eq('id', id)
      .eq('company_id', ctx.user.company_id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }
    
    revalidatePath('/routes');
    revalidatePath(`/routes/${id}`);
    return { success: true, data };
  });

// Démarrer une tournée
export const startRoute = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('routes')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur démarrage: ${error.message}`);
    }
    
    revalidatePath('/routes');
    return { success: true, data };
  });

// Terminer une tournée
export const completeRoute = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('routes')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur finalisation: ${error.message}`);
    }
    
    revalidatePath('/routes');
    return { success: true, data };
  });

// Supprimer une tournée
export const deleteRoute = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id);
    
    if (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
    
    revalidatePath('/routes');
    return { success: true };
  });
