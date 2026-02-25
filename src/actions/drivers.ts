'use server';

/**
 * Actions Chauffeurs - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Les policies PostgreSQL assurent l'isolation par company_id
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

// Schéma local (non exporté) — 'use server' n'autorise que les fonctions async en export
const createDriverSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  license_type: z.string().default('B'),
  address: z.string().optional(),
  city: z.string().optional(),
  // Les champs date optionnels : "" → null pour éviter l'erreur PostgreSQL 22007
  hire_date: z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
  cqc_card_number: z.string().optional(),
  cqc_expiry_date: z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null),
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),
});

// Type dérivé du schéma pour utilisation dans les hooks
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = Partial<CreateDriverInput> & { id: string };

/**
 * Créer un chauffeur
 * RLS : Vérifie que l'email n'existe pas déjà dans la company
 */
export const createDriver = authActionClient
  .schema(createDriverSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Vérifier si l'email existe déjà (dans la company du user via RLS)
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
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

/**
 * Mettre à jour un chauffeur
 * RLS : Filtre automatiquement par company_id
 */
export const updateDriver = authActionClient
  .schema(createDriverSchema.partial().extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...updates } = parsedInput;
    const supabase = await createClient();
    
    // Vérifier que le chauffeur existe et appartient à la company (RLS)
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existing) {
      throw new Error('Chauffeur non trouvé ou accès non autorisé');
    }
    
    const { data, error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }
    
    revalidatePath('/drivers');
    revalidatePath(`/drivers/${id}`);
    return { success: true, data };
  });

/**
 * Supprimer un chauffeur
 * RLS : Vérifie l'appartenance à la company
 */
export const deleteDriver = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Vérifier que le chauffeur existe (RLS filtre par company)
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', parsedInput.id)
      .single();
    
    if (!existing) {
      throw new Error('Chauffeur non trouvé');
    }
    
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', parsedInput.id);
    
    if (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
    
    revalidatePath('/drivers');
    return { success: true };
  });

/**
 * Récupérer tous les chauffeurs
 * RLS : Filtre automatiquement par company_id
 */
export const getDrivers = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }
    
    // Récupérer les véhicules séparément (RLS filtre aussi)
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, driver_id');
    
    // Fusionner les données
    const driversWithVehicles = (data || []).map(driver => {
      const vehicle = vehicles?.find(v => v.driver_id === driver.id);
      return { ...driver, vehicles: vehicle || null };
    });
    
    return { success: true, data: driversWithVehicles };
  });

/**
 * Récupérer un chauffeur par ID
 * RLS : Filtre par company_id automatiquement
 */
export const getDriverById = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', parsedInput.id)
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
