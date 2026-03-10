'use server';

/**
 * Actions Affectation Conducteur-Véhicule
 *
 * Gère le cycle de vie des affectations :
 *   - Création d'une nouvelle affectation (clôture l'ancienne)
 *   - Clôture d'une affectation active
 * L'isolation par company_id est assurée par RLS + ctx.user.company_id.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

// ─── Schémas ────────────────────────────────────────────────────────────────

const assignDriverSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  is_primary: z.boolean().default(true),
  start_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const unassignDriverSchema = z.object({
  assignment_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
});

export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

// ─── assignDriver ────────────────────────────────────────────────────────────

/**
 * Affecte un conducteur à un véhicule.
 * - Clôture l'affectation principale active précédente (end_date = today)
 * - Crée une nouvelle ligne dans vehicle_driver_assignments
 * - Synchronise vehicles.assigned_driver_id pour la rétrocompatibilité
 */
export const assignDriver = authActionClient
  .schema(assignDriverSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    const companyId = ctx.user.company_id;
    const today = new Date().toISOString().split('T')[0];

    if (!companyId) throw new Error('Aucune entreprise associée au compte');

    // 1. Clôturer l'affectation principale active pour ce véhicule
    if (parsedInput.is_primary) {
      await supabase
        .from('vehicle_driver_assignments')
        .update({ end_date: today })
        .eq('vehicle_id', parsedInput.vehicle_id)
        .eq('company_id', companyId)
        .eq('is_primary', true)
        .is('end_date', null);
    }

    // 2. Créer la nouvelle affectation
    const { data, error } = await supabase
      .from('vehicle_driver_assignments')
      .insert({
        vehicle_id: parsedInput.vehicle_id,
        driver_id: parsedInput.driver_id,
        company_id: companyId,
        is_primary: parsedInput.is_primary,
        start_date: parsedInput.start_date,
        notes: parsedInput.notes ?? null,
        assigned_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur affectation : ${error.message}`);
    }

    // 3. Sync vehicles.assigned_driver_id (rétrocompatibilité)
    if (parsedInput.is_primary) {
      await supabase
        .from('vehicles')
        .update({ assigned_driver_id: parsedInput.driver_id })
        .eq('id', parsedInput.vehicle_id)
        .eq('company_id', companyId);
    }

    revalidatePath(`/vehicles/${parsedInput.vehicle_id}`);
    revalidatePath(`/drivers/${parsedInput.driver_id}`);
    return { success: true, data };
  });

// ─── unassignDriver ──────────────────────────────────────────────────────────

/**
 * Clôture une affectation active (end_date = today).
 * Si l'affectation était principale, remet vehicles.assigned_driver_id à null.
 */
export const unassignDriver = authActionClient
  .schema(unassignDriverSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    const companyId = ctx.user.company_id;
    const today = new Date().toISOString().split('T')[0];

    if (!companyId) throw new Error('Aucune entreprise associée au compte');

    // Récupérer l'affectation pour connaître is_primary
    const { data: assignment } = await supabase
      .from('vehicle_driver_assignments')
      .select('is_primary')
      .eq('id', parsedInput.assignment_id)
      .eq('company_id', companyId)
      .single();

    const { error } = await supabase
      .from('vehicle_driver_assignments')
      .update({ end_date: today })
      .eq('id', parsedInput.assignment_id)
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Erreur clôture affectation : ${error.message}`);
    }

    // Si affectation principale : vider vehicles.assigned_driver_id
    if (assignment?.is_primary) {
      await supabase
        .from('vehicles')
        .update({ assigned_driver_id: null })
        .eq('id', parsedInput.vehicle_id)
        .eq('company_id', companyId);
    }

    revalidatePath(`/vehicles/${parsedInput.vehicle_id}`);
    return { success: true };
  });
