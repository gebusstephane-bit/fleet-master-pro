'use server';

/**
 * Server action : import en masse de chauffeurs
 * - Vérifie les limites du plan (ESSENTIAL=2, PRO=5, UNLIMITED=∞)
 * - Import par batch de 10
 * - Gestion granulaire des erreurs par ligne
 */

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { PLANS } from '@/lib/plans';
import { createClient } from '@/lib/supabase/server';

export interface DriverImportRow {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  numero_permis: string;
  categorie_permis?: string;
  date_expiration_permis?: string;
  date_naissance?: string;
  date_embauche?: string;
  type_contrat?: string;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportDriversResult {
  success: number;
  errors: ImportRowError[];
  limitReached?: boolean;
  limitMessage?: string;
}

const VALID_CONTRACTS = ['CDI', 'CDD', 'Intérim', 'Interim', 'Gérant', 'Gerant', 'Autre'];
const BATCH_SIZE = 10;

// Normalise les contrats avec accents
function normalizeContract(val: string): string {
  const map: Record<string, string> = {
    interim: 'Intérim',
    intérim: 'Intérim',
    gérant: 'Gérant',
    gerant: 'Gérant',
    cdi: 'CDI',
    cdd: 'CDD',
    autre: 'Autre',
  };
  return map[val.toLowerCase()] ?? val;
}

// "" ou undefined → null pour les champs DATE PostgreSQL
function toNullableDate(val?: string): string | null {
  if (!val || val.trim() === '') return null;
  return val.trim();
}

export async function importDriversBatch(
  rows: DriverImportRow[]
): Promise<ImportDriversResult> {
  try {
    const supabase = await createClient();

    // 1. Auth
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { success: 0, errors: [{ row: 0, field: 'auth', message: 'Non authentifié' }] };
    }

    // 2. Profil + company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile?.company_id) {
      return {
        success: 0,
        errors: [{ row: 0, field: 'company', message: 'Profil ou entreprise non trouvé' }],
      };
    }

    if (!['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'].includes(profile.role)) {
      return {
        success: 0,
        errors: [{ row: 0, field: 'role', message: 'Permissions insuffisantes' }],
      };
    }

    // 3. Vérification limite du plan
    const { data: company } = await supabase
      .from('companies')
      .select('subscription_plan')
      .eq('id', profile.company_id)
      .single();

    const rawPlan = (company?.subscription_plan || 'essential').toLowerCase();
    const planId = (['essential', 'pro', 'unlimited'].includes(rawPlan)
      ? rawPlan
      : 'essential') as 'essential' | 'pro' | 'unlimited';
    const plan = PLANS[planId];

    const { count: currentCount } = await supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true });

    const current = currentCount ?? 0;
    const maxDrivers = plan.maxDrivers;

    if (current >= maxDrivers) {
      return {
        success: 0,
        errors: [],
        limitReached: true,
        limitMessage: `Votre plan ${plan.name} est limité à ${maxDrivers} chauffeur(s). Vous en avez déjà ${current}. Passez au plan supérieur pour continuer.`,
      };
    }

    const availableSlots = maxDrivers - current;
    const rowsToImport = rows.slice(0, availableSlots);

    // 4. Import par batch
    const errors: ImportRowError[] = [];
    let successCount = 0;

    for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
      const batch = rowsToImport.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 1;

        // Validation de base
        if (!row.nom?.trim()) {
          errors.push({ row: rowNum, field: 'nom', message: 'Nom requis' });
          continue;
        }
        if (!row.prenom?.trim()) {
          errors.push({ row: rowNum, field: 'prenom', message: 'Prénom requis' });
          continue;
        }
        if (!row.email?.trim() || !row.email.includes('@')) {
          errors.push({ row: rowNum, field: 'email', message: 'Email invalide' });
          continue;
        }
        if (!row.telephone?.trim()) {
          errors.push({ row: rowNum, field: 'telephone', message: 'Téléphone requis' });
          continue;
        }
        if (!row.numero_permis?.trim()) {
          errors.push({ row: rowNum, field: 'numero_permis', message: 'N° permis requis' });
          continue;
        }

        // Vérifier doublon email dans la company (via RLS)
        const { data: existing } = await supabase
          .from('drivers')
          .select('id')
          .eq('email', row.email.trim().toLowerCase())
          .maybeSingle();

        if (existing) {
          errors.push({
            row: rowNum,
            field: 'email',
            message: `Email "${row.email}" déjà utilisé par un autre chauffeur`,
          });
          continue;
        }

        const contractRaw = row.type_contrat?.trim() || '';
        const contract = contractRaw ? normalizeContract(contractRaw) : null;

        const insertData = {
          company_id: profile.company_id,
          last_name: row.nom.trim(),
          first_name: row.prenom.trim(),
          email: row.email.trim().toLowerCase(),
          phone: row.telephone.trim(),
          license_number: row.numero_permis.trim(),
          license_type: row.categorie_permis?.trim() || 'B',
          license_expiry: toNullableDate(row.date_expiration_permis) ?? '',
          birth_date: toNullableDate(row.date_naissance),
          hire_date: toNullableDate(row.date_embauche),
          contract_type: contract,
          status: 'active',
          is_active: true,
          adr_classes: [],
        };

        // license_expiry est requis par la DB — si absent on met une date far future
        if (!insertData.license_expiry) {
          insertData.license_expiry = '2099-12-31';
        }

        const { error: insertError } = await supabase
          .from('drivers')
          .insert(insertData as any);

        if (insertError) {
          if (insertError.code === '23505') {
            errors.push({
              row: rowNum,
              field: 'email',
              message: `"${row.email}" existe déjà (doublon)`,
            });
          } else {
            errors.push({ row: rowNum, field: 'général', message: insertError.message });
          }
        } else {
          successCount++;
        }
      }
    }

    if (successCount > 0) {
      revalidatePath('/drivers');
    }

    const limitReached = rows.length > availableSlots;

    return {
      success: successCount,
      errors,
      limitReached,
      limitMessage: limitReached
        ? `Seulement ${availableSlots} chauffeur(s) ont pu être importé(s) sur ${rows.length} (limite du plan ${plan.name} : ${maxDrivers} chauffeurs max).`
        : undefined,
    };
  } catch (error) {
    logger.error(
      'importDriversBatch: Exception',
      error instanceof Error ? error : new Error(String(error))
    );
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: 0, errors: [{ row: 0, field: 'général', message }] };
  }
}
