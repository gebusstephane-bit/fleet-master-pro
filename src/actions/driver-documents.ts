'use server';

/**
 * Actions Documents Conducteurs
 * Upload, liste et suppression des documents officiels (FCO, FIMO, permis…)
 * Le fichier Storage est uploadé côté client ; ces actions gèrent les métadonnées.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DOCUMENT_TYPES, SIDES } from '@/lib/driver-documents-config';

// ─── Schémas ──────────────────────────────────────────────────────────────────

const saveDocumentSchema = z.object({
  driver_id:     z.string().uuid(),
  document_type: z.enum(DOCUMENT_TYPES),
  side:          z.enum(SIDES).optional().nullable(),
  document_name: z.string().min(1),
  storage_path:  z.string().min(1),
  file_size:     z.number().int().positive().optional(),
  mime_type:     z.string().optional(),
  expiry_date:   z.string().optional().nullable().transform(v => v === '' ? null : v ?? null),
  notes:         z.string().optional().nullable(),
});

export type SaveDocumentInput = z.infer<typeof saveDocumentSchema>;

const deleteDocumentSchema = z.object({
  document_id:  z.string().uuid(),
  storage_path: z.string().min(1),
});

const listDocumentsSchema = z.object({
  driver_id: z.string().uuid(),
});

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Enregistre les métadonnées d'un document après upload Storage côté client.
 * RLS : company_id vérifié via profiles
 */
export const saveDriverDocument = authActionClient
  .schema(saveDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user.company_id) throw new Error('company_id manquant');
    const supabase = await createClient();

    // Vérifier que le conducteur appartient bien à la company (RLS)
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', parsedInput.driver_id)
      .single();

    if (!driver) throw new Error('Conducteur non trouvé ou accès non autorisé');

    const { data, error } = await supabase
      .from('driver_documents')
      .insert({
        driver_id:     parsedInput.driver_id,
        company_id:    ctx.user.company_id,
        document_type: parsedInput.document_type,
        side:          parsedInput.side ?? null,
        document_name: parsedInput.document_name,
        storage_path:  parsedInput.storage_path,
        file_size:     parsedInput.file_size ?? null,
        mime_type:     parsedInput.mime_type ?? null,
        expiry_date:   parsedInput.expiry_date ?? null,
        notes:         parsedInput.notes ?? null,
        uploaded_by:   ctx.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur enregistrement: ${error.message}`);

    revalidatePath(`/drivers/${parsedInput.driver_id}`);
    return { success: true, data };
  });

/**
 * Récupère tous les documents d'un conducteur.
 * RLS : filtre automatiquement par company_id
 */
export const getDriverDocuments = authActionClient
  .schema(listDocumentsSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', parsedInput.driver_id)
      .order('document_type', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erreur récupération: ${error.message}`);

    return { success: true, data: data ?? [] };
  });

/**
 * Supprime un document (fichier Storage + ligne BDD).
 * RLS : vérifie l'appartenance à la company
 */
export const deleteDriverDocument = authActionClient
  .schema(deleteDocumentSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();

    // Vérifier existence (RLS filtre par company)
    const { data: doc } = await supabase
      .from('driver_documents')
      .select('id, driver_id, storage_path')
      .eq('id', parsedInput.document_id)
      .single();

    if (!doc) throw new Error('Document non trouvé ou accès non autorisé');

    // Supprimer le fichier dans Storage
    const { error: storageError } = await supabase.storage
      .from('driver-documents')
      .remove([parsedInput.storage_path]);

    if (storageError) {
      logger.error('[DELETE_DRIVER_DOC] Storage error:', storageError.message);
    }

    // Supprimer la ligne de métadonnées
    const { error: dbError } = await supabase
      .from('driver_documents')
      .delete()
      .eq('id', parsedInput.document_id);

    if (dbError) throw new Error(`Erreur suppression: ${dbError.message}`);

    revalidatePath(`/drivers/${doc.driver_id}`);
    return { success: true };
  });
