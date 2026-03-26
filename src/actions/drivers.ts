'use server';

/**
 * Actions Chauffeurs - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : Utilise uniquement createClient() avec RLS activé
 * Les policies PostgreSQL assurent l'isolation par company_id
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireManagerOrAbove } from '@/lib/auth-guards';
import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

// Helper : "" → null pour éviter l'erreur PostgreSQL 22007 sur les champs DATE
const nullableDate = z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null);

// Schéma local (non exporté) — 'use server' n'autorise que les fonctions async en export
const createDriverSchema = z.object({
  // Informations personnelles
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  address: z.string().optional(),
  city: z.string().optional(),
  nationality: z.string().optional(),
  birth_date: nullableDate,
  social_security_number: z.string().optional(),

  // Permis de conduire
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  license_type: z.string().default('B'),

  // Carte conducteur numérique (tachographe)
  driver_card_number: z.string().optional(),
  driver_card_expiry: nullableDate,

  // Formations obligatoires
  fimo_date: nullableDate,
  fcos_expiry: nullableDate,
  qi_date: nullableDate,

  // Aptitude médicale
  medical_certificate_expiry: nullableDate,

  // Certificat ADR
  adr_certificate_expiry: nullableDate,
  adr_classes: z.array(z.string()).optional().default([]),

  // CQC
  cqc_card_number: z.string().optional(),
  cqc_expiry: nullableDate,
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),

  // Informations contractuelles — is_active est calculé automatiquement depuis status
  hire_date: nullableDate,
  contract_type: z.enum(["CDI", "CDD", "Intérim", "Gérant", "Autre"]).optional(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
});

// Type dérivé du schéma pour utilisation dans les hooks
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = Partial<CreateDriverInput> & { id: string };

/**
 * Crée un nouveau chauffeur pour la société connectée.
 * Vérifie l'unicité de l'email dans la société avant création.
 * Synchronise les champs CQC (cqc_expiry et cqc_expiry_date) pour rétrocompatibilité.
 * @param parsedInput - Données validées du schéma createDriverSchema
 * @param ctx - Contexte d'authentification avec user.company_id
 * @returns Le chauffeur créé avec succès
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
        // Calculé depuis status : actif = active ou on_leave
        is_active: parsedInput.status === 'active' || parsedInput.status === 'on_leave',
        // Synchroniser les deux champs CQC pour rétrocompatibilité
        cqc_expiry_date: parsedInput.cqc_expiry,
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
 * Met à jour un chauffeur existant.
 * Recalcule is_active en fonction du statut (active ou on_leave = actif).
 * Synchronise les champs CQC pour rétrocompatibilité.
 * @param parsedInput - Données partielles incluant l'ID du chauffeur
 * @param ctx - Contexte d'authentification
 * @returns Le chauffeur mis à jour
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
      .maybeSingle();

    if (!existing) {
      throw new Error('Chauffeur non trouvé ou accès non autorisé');
    }

    // Nettoyer les champs vides → null (évite les erreurs Zod min(1) sur les champs optionnels)
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v === '' ? null : v])
    );

    const { data, error } = await supabase
      .from('drivers')
      .update({
        ...cleanUpdates,
        ...(updates.status !== undefined && {
          is_active: updates.status === 'active' || updates.status === 'on_leave',
        }),
        // Synchroniser les deux champs CQC pour rétrocompatibilité
        ...(updates.cqc_expiry !== undefined && {
          cqc_expiry_date: updates.cqc_expiry,
        }),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('DRIVER_UPDATE_ERROR:', error);
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    revalidatePath('/drivers');
    revalidatePath(`/drivers/${id}`);
    return { success: true, data };
  });

/**
 * Supprime définitivement un chauffeur de la base de données.
 * Vérifie que l'utilisateur a les permissions MANAGER ou supérieures.
 * @param parsedInput - Objet contenant l'ID du chauffeur à supprimer
 * @param ctx - Contexte d'authentification
 * @returns Confirmation de suppression
 */
export const deleteDriver = authActionClient
  .schema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    // VÉRIFICATION SÉCURITÉ : Vérifier le rôle côté serveur (incontournable)
    try {
      await requireManagerOrAbove();
    } catch {
      throw new Error('Accès refusé');
    }

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
 * Récupère tous les chauffeurs de la société avec leurs véhicules assignés.
 * Effectue une jointure manuelle avec les véhicules (RLS filtre les deux tables).
 * @param ctx - Contexte d'authentification avec company_id
 * @returns Liste des chauffeurs enrichie avec le véhicule assigné
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
      .select('id, registration_number, brand, model, assigned_driver_id');
    
    // Fusionner les données
    const driversWithVehicles = (data || []).map(driver => {
      const vehicle = vehicles?.find(v => v.assigned_driver_id === driver.id);
      return { ...driver, vehicles: vehicle || null };
    });
    
    return { success: true, data: driversWithVehicles };
  });

/**
 * Récupère un chauffeur spécifique par son ID.
 * Inclut le véhicule qui lui est assigné si existe.
 * @param parsedInput - Objet contenant l'ID du chauffeur
 * @param ctx - Contexte d'authentification
 * @returns Le chauffeur avec son véhicule assigné
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
