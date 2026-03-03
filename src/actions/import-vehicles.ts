'use server';

/**
 * Server action : import en masse de véhicules
 * - Vérifie les limites du plan (ESSENTIAL=3, PRO=15, UNLIMITED=∞)
 * - Import par batch de 10
 * - Gestion granulaire des erreurs par ligne
 */

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { PLANS } from '@/lib/plans';
import { createClient } from '@/lib/supabase/server';

export interface VehicleImportRow {
  immatriculation: string;
  marque: string;
  modele: string;
  annee: string;
  type_vehicule: string;
  carburant: string;
  kilometrage: string;
  vin?: string;
  date_mise_en_service?: string;
  date_controle_technique?: string;
  date_atp?: string;
  date_tachygraphe?: string;
  numero_serie?: string;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportVehiclesResult {
  success: number;
  errors: ImportRowError[];
  limitReached?: boolean;
  limitMessage?: string;
}

const VALID_TYPES = ['VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO'];
const VALID_FUELS = ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'];
const BATCH_SIZE = 10;

export async function importVehiclesBatch(
  rows: VehicleImportRow[]
): Promise<ImportVehiclesResult> {
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
      .from('vehicles')
      .select('id', { count: 'exact', head: true });

    const current = currentCount ?? 0;
    const maxVehicles = plan.maxVehicles;

    if (current >= maxVehicles) {
      return {
        success: 0,
        errors: [],
        limitReached: true,
        limitMessage: `Votre plan ${plan.name} est limité à ${maxVehicles} véhicule(s). Vous en avez déjà ${current}. Passez au plan supérieur pour continuer.`,
      };
    }

    const availableSlots = maxVehicles - current;
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
        if (!row.immatriculation?.trim()) {
          errors.push({ row: rowNum, field: 'immatriculation', message: 'Immatriculation requise' });
          continue;
        }
        if (!row.marque?.trim()) {
          errors.push({ row: rowNum, field: 'marque', message: 'Marque requise' });
          continue;
        }
        if (!row.modele?.trim()) {
          errors.push({ row: rowNum, field: 'modele', message: 'Modèle requis' });
          continue;
        }

        const mileage = parseInt(row.kilometrage || '0', 10);
        if (isNaN(mileage) || mileage < 0) {
          errors.push({ row: rowNum, field: 'kilometrage', message: 'Kilométrage invalide (entier ≥ 0 requis)' });
          continue;
        }

        const year = row.annee ? parseInt(row.annee, 10) : null;

        const typeVehicule = (row.type_vehicule?.trim().toUpperCase() || 'VOITURE');
        if (!VALID_TYPES.includes(typeVehicule)) {
          errors.push({
            row: rowNum,
            field: 'type_vehicule',
            message: `Type invalide "${typeVehicule}". Valeurs acceptées : ${VALID_TYPES.join(', ')}`,
          });
          continue;
        }

        const carburant = (row.carburant?.trim().toLowerCase() || 'diesel');
        if (!VALID_FUELS.includes(carburant)) {
          errors.push({
            row: rowNum,
            field: 'carburant',
            message: `Carburant invalide "${carburant}". Valeurs acceptées : ${VALID_FUELS.join(', ')}`,
          });
          continue;
        }

        const vehicleId = crypto.randomUUID();
        const vinValue = row.vin?.trim() || row.numero_serie?.trim() || null;

        const insertData = {
          id: vehicleId,
          company_id: profile.company_id,
          registration_number: row.immatriculation.trim().toUpperCase(),
          brand: row.marque.trim(),
          model: row.modele.trim(),
          year: year && !isNaN(year) ? year : null,
          type: typeVehicule,
          fuel_type: carburant,
          mileage,
          vin: vinValue,
          color: 'Non précisé',
          status: 'ACTIF',
          qr_code_data: `fleetmaster://vehicle/${vehicleId}`,
          purchase_date: row.date_mise_en_service?.trim() || null,
          technical_control_date: row.date_controle_technique?.trim() || null,
          atp_date: row.date_atp?.trim() || null,
          tachy_control_date: row.date_tachygraphe?.trim() || null,
        };

        const { error: insertError } = await supabase
          .from('vehicles')
          .insert(insertData as any);

        if (insertError) {
          if (insertError.code === '23505') {
            errors.push({
              row: rowNum,
              field: 'immatriculation',
              message: `"${row.immatriculation}" existe déjà`,
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
      revalidatePath('/vehicles');
    }

    const limitReached = rows.length > availableSlots;

    return {
      success: successCount,
      errors,
      limitReached,
      limitMessage: limitReached
        ? `Seulement ${availableSlots} véhicule(s) ont pu être importé(s) sur ${rows.length} (limite du plan ${plan.name} : ${maxVehicles} véhicules max).`
        : undefined,
    };
  } catch (error) {
    logger.error(
      'importVehiclesBatch: Exception',
      error instanceof Error ? error : new Error(String(error))
    );
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: 0, errors: [{ row: 0, field: 'général', message }] };
  }
}
