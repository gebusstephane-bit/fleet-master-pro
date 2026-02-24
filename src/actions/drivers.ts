'use server';

import { z } from 'zod';
import { authActionClient, idSchema } from '@/lib/safe-action';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Schéma pour création chauffeur
export const createDriverSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  license_type: z.string().default('B'),
  address: z.string().optional(),
  city: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
  cqc_card_number: z.string().optional(),
  cqc_expiry_date: z.string().optional(),
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),
});

// Type dérivé du schéma pour utilisation dans les hooks
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = Partial<CreateDriverInput> & { id: string };

// Créer un chauffeur
export const createDriver = authActionClient
  .schema(createDriverSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    // Vérifier si l'email existe déjà
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('company_id', ctx.user.company_id)
      .eq('email', parsedInput.email)
      .single();
    
    if (existing) {
      throw new Error(`Un chauffeur avec l'email ${parsedInput.email} existe déjà`);
    }
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        ...parsedInput,
        company_id: ctx.user.company_id,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur création: ${error.message}`);
    }
    
    revalidatePath('/drivers');
    return { success: true, data };
  });

// Mettre à jour un chauffeur
export const updateDriver = authActionClient
  .schema(createDriverSchema.partial().extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...updates } = parsedInput;
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', id)
      .eq('company_id', ctx.user.company_id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }
    
    revalidatePath('/drivers');
    revalidatePath(`/drivers/${id}`);
    return { success: true, data };
  });

// Supprimer un chauffeur
export const deleteDriver = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id);
    
    if (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
    
    revalidatePath('/drivers');
    return { success: true };
  });

// Récupérer tous les chauffeurs (sans jointure ambiguë)
export const getDrivers = authActionClient
  .action(async ({ ctx }) => {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    // Récupérer les véhicules séparément
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, driver_id')
      .eq('company_id', ctx.user.company_id);
    
    // Fusionner les données
    const driversWithVehicles = (data || []).map(driver => {
      const vehicle = vehicles?.find(v => v.driver_id === driver.id);
      return { ...driver, vehicles: vehicle || null };
    });
    
    return { success: true, data: driversWithVehicles };
  });

// Récupérer un chauffeur par ID
export const getDriverById = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient();
    
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (error) {
      throw new Error(`Chauffeur non trouvé: ${error.message}`);
    }
    
    // Récupérer le véhicule séparément
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driver.id)
      .maybeSingle();
    
    return { success: true, data: { ...driver, vehicles: vehicle } };
  });
