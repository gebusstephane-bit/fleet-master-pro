'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// ITEMS PAR DÉFAUT (12 items groupés par catégorie)
// ============================================================

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  checked: boolean;
  comment: string;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Niveaux
  { id: 'carburant',      category: 'Niveaux',       label: 'Niveau de carburant',          checked: false, comment: '' },
  { id: 'huile',          category: 'Niveaux',       label: 'Niveau d\'huile moteur',        checked: false, comment: '' },
  { id: 'refroidissement',category: 'Niveaux',       label: 'Niveau de refroidissement',     checked: false, comment: '' },
  // Pneus
  { id: 'pneu_av_g',      category: 'Pneus',         label: 'Pression pneu avant gauche',    checked: false, comment: '' },
  { id: 'pneu_av_d',      category: 'Pneus',         label: 'Pression pneu avant droit',     checked: false, comment: '' },
  { id: 'pneu_ar_g',      category: 'Pneus',         label: 'Pression pneu arrière gauche',  checked: false, comment: '' },
  { id: 'pneu_ar_d',      category: 'Pneus',         label: 'Pression pneu arrière droit',   checked: false, comment: '' },
  // Éclairage
  { id: 'feux',           category: 'Éclairage',     label: 'Feux (avant / arrière)',         checked: false, comment: '' },
  { id: 'clignotants',    category: 'Éclairage',     label: 'Clignotants',                    checked: false, comment: '' },
  { id: 'retroviseurs',   category: 'Visibilité',    label: 'Rétroviseurs',                   checked: false, comment: '' },
  // Sécurité
  { id: 'extincteur',     category: 'Sécurité',      label: 'Extincteur présent et valide',  checked: false, comment: '' },
  { id: 'triangles',      category: 'Sécurité',      label: 'Triangles de signalisation',    checked: false, comment: '' },
  // Documents
  { id: 'documents',      category: 'Documents',     label: 'Carte grise, assurance, permis', checked: false, comment: '' },
];

// ============================================================
// CRÉER UNE CHECKLIST
// ============================================================

export async function createChecklist(
  vehicleId: string,
  checklistType: string = 'DEPART'
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Non authentifié' };

    // Récupérer le profil (organization_id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { success: false, error: 'Profil ou entreprise non trouvé' };
    }

    const { data, error } = await supabase
      .from('driver_checklists')
      .insert({
        vehicle_id: vehicleId,
        driver_id: user.id,
        organization_id: profile.company_id,
        checklist_type: checklistType,
        status: 'EN_COURS',
        items: DEFAULT_CHECKLIST_ITEMS,
      })
      .select()
      .single();

    if (error) {
      logger.error('createChecklist: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/driver-app/checklist');
    return { success: true, data };
  } catch (err) {
    logger.error('createChecklist: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

// ============================================================
// METTRE À JOUR UN ITEM DE CHECKLIST
// ============================================================

export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  checked: boolean,
  comment: string = ''
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Non authentifié' };

    // Récupérer la checklist
    const { data: checklist, error: fetchError } = await supabase
      .from('driver_checklists')
      .select('items')
      .eq('id', checklistId)
      .eq('driver_id', user.id)
      .single();

    if (fetchError || !checklist) {
      return { success: false, error: 'Checklist non trouvée' };
    }

    // Mettre à jour l'item
    const items = (checklist.items as ChecklistItem[]).map((item) =>
      item.id === itemId ? { ...item, checked, comment } : item
    );

    const { data, error } = await supabase
      .from('driver_checklists')
      .update({ items, updated_at: new Date().toISOString() })
      .eq('id', checklistId)
      .eq('driver_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('updateChecklistItem: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    logger.error('updateChecklistItem: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

// ============================================================
// VALIDER LA CHECKLIST
// ============================================================

export async function completeChecklist(
  checklistId: string,
  notes: string = ''
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Non authentifié' };

    const { data, error } = await supabase
      .from('driver_checklists')
      .update({
        status: 'TERMINEE',
        notes: notes || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', checklistId)
      .eq('driver_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('completeChecklist: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    revalidatePath('/driver-app/checklist');
    return { success: true, data };
  } catch (err) {
    logger.error('completeChecklist: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}

// ============================================================
// RÉCUPÉRER LA CHECKLIST EN COURS
// ============================================================

export async function getActiveChecklist(vehicleId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Non authentifié' };

    const { data, error } = await supabase
      .from('driver_checklists')
      .select('*')
      .eq('driver_id', user.id)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'EN_COURS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('getActiveChecklist: Erreur', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    logger.error('getActiveChecklist: Exception', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: 'Erreur serveur' };
  }
}
