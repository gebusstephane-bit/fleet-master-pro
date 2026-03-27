/**
 * CRON JOB — Changement automatique de statut véhicule (maintenance ↔ actif)
 *
 * Exécution : tous les jours à 08h00 UTC (= 09h00 CET / 10h00 CEST)
 * Configuré dans vercel.json : "0 8 * * *"
 *
 * ÉTAPE A — Passage en "EN_MAINTENANCE" :
 *   Véhicules avec rdv_date <= AUJOURD'HUI (passés ou aujourd'hui) + status (DEMANDE_CREEE|VALIDEE_DIRECTEUR|RDV_PRIS|EN_COURS)
 *   → vehicles.status = 'EN_MAINTENANCE' + log dans vehicle_status_history
 *
 * ÉTAPE B — Retour "actif" automatique :
 *   Véhicules en maintenance dont la durée estimée est écoulée
 *   Formule : rdv_date + max(1, estimated_days) <= aujourd'hui
 *   → vehicles.status = 'active'   + log dans vehicle_status_history
 *
 * Règles durée :
 *   estimated_days = 0, hours > 0  → 1 jour (retour actif J+1)
 *   estimated_days = 1             → retour actif J+1
 *   estimated_days = N (N≥2)       → retour actif J+N
 *   estimated_days = NULL          → retour actif J+1 (défaut sécurité)
 *
 * Idempotence :
 *   Étape A : filtre vehicles.status = 'active' → doublon impossible
 *   Étape B : filtre vehicles.status = 'maintenance' → doublon impossible
 *
 * Sécurité :
 *   Header x-cron-secret ou query param ?secret=
 *   company_id du véhicule = company_id du record (anti fuite)
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/maintenance-status?secret=VOTRE_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { VEHICLE_STATUS } from '@/constants/enums';

// ============================================================
// CONFIG
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;

// ============================================================
// UTILITAIRES
// ============================================================

function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Calcule la date de retour attendue d'un véhicule en maintenance.
 * Le véhicule devient actif à partir de cette date (comparaison >=).
 *
 * Exemples :
 *   rdv_date = 2025-02-24, estimated_days = 0, hours > 0  → return 2025-02-25 (demain)
 *   rdv_date = 2025-02-24, estimated_days = 1             → return 2025-02-25 (demain)
 *   rdv_date = 2025-02-24, estimated_days = 3             → return 2025-02-27
 *   rdv_date = 2025-02-24, estimated_days = NULL          → return 2025-02-25 (défaut 1 jour)
 */
function calculateReturnDate(
  rdvDateStr: string,
  estimated_days: number | null,
  estimated_hours: number | null,
): Date {
  const rdvDate = new Date(rdvDateStr);
  rdvDate.setHours(0, 0, 0, 0);

  const days = estimated_days ?? 0;
  const hours = estimated_hours ?? 0;

  // Durée effective : minimum 1 jour
  let effectiveDays: number;
  if (days === 0 && hours > 0) {
    effectiveDays = 1; // maintenance dans la journée → retour le lendemain
  } else {
    effectiveDays = Math.max(1, days);
  }

  const returnDate = new Date(rdvDate);
  returnDate.setDate(returnDate.getDate() + effectiveDays);
  return returnDate;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // ── Authentification ──────────────────────────────────────
    const secret =
      request.headers.get('x-vercel-cron-secret') ||
      request.headers.get('x-cron-secret') ||
      request.nextUrl.searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const todayStr = getTodayDateStr();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      // Étape A
      vehicles_to_maintenance: 0,
      vehicles_set_maintenance: 0,
      // Étape B
      vehicles_checked_return: 0,
      vehicles_set_active: 0,
      // Étape C
      vehicles_completed_today: 0,
      // Erreurs
      errors: 0,
    };

    logger.info(`Cron maintenance-status: processing date = ${todayStr}`);

  // ============================================================
  // ÉTAPE A — Passage en maintenance
  // ============================================================

  try {
    // 1. RDV programmés aujourd'hui ou en retard (statut confirmé)
    // On fait DEUX requêtes séparées car la syntaxe OR avec dates est fragile
    // NOTE: on prend rdv_date <= aujourd'hui (pas seulement =) pour gérer les retards
    const [{ data: rdvsByDate }, { data: rdvsByScheduled }] = await Promise.all([
      // Requête 1 : par rdv_date (aujourd'hui ou passé)
      supabase
        .from('maintenance_records')
        .select('id, vehicle_id, company_id, rdv_time')
        .lte('rdv_date', todayStr)  // <= aujourd'hui (pas seulement =)
        .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']),
      // Requête 2 : par scheduled_date (aujourd'hui ou passé)
      supabase
        .from('maintenance_records')
        .select('id, vehicle_id, company_id, rdv_time')
        .lte('scheduled_date', todayStr)  // <= aujourd'hui (pas seulement =)
        .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'])
    ]);

    // Fusionner et dédupliquer les résultats
    const todayRdvs = [...(rdvsByDate || []), ...(rdvsByScheduled || [])];
    const uniqueRdvs = Array.from(
      new Map(todayRdvs.map(r => [r.id, r])).values()
    );

    logger.info(`[DEBUG] Étape A: ${rdvsByDate?.length || 0} par rdv_date + ${rdvsByScheduled?.length || 0} par scheduled_date = ${uniqueRdvs.length} uniques`);

    if (uniqueRdvs.length > 0) {
      // Dédupliquer les véhicules (un véhicule peut avoir plusieurs records)
      const vehicleIds = Array.from(new Set(uniqueRdvs.map((r) => r.vehicle_id)));
      stats.vehicles_to_maintenance = vehicleIds.length;

      // 2. Parmi ces véhicules, ne prendre que ceux encore actifs
      const { data: activeVehicles, error: vehicleErr } = await supabase
        .from('vehicles')
        .select('id, company_id, registration_number')
        .in('id', vehicleIds)
        .eq('status', VEHICLE_STATUS.ACTIF);

      if (vehicleErr) {
        logger.error('Étape A: erreur lecture vehicles', { error: vehicleErr instanceof Error ? vehicleErr.message : String(vehicleErr) });
      } else if (activeVehicles && activeVehicles.length > 0) {
        const now = new Date().toISOString();

        for (const vehicle of activeVehicles) {
          try {
            // 3. Passage en maintenance
            const { error: updateErr } = await supabase
              .from('vehicles')
              .update({
                status: VEHICLE_STATUS.EN_MAINTENANCE,
                maintenance_started_at: now,
              })
              .eq('id', vehicle.id);

            if (updateErr) {
              throw new Error(updateErr.message);
            }

            // 4. Log dans vehicle_status_history
            const linkedRecord = uniqueRdvs.find((r) => r.vehicle_id === vehicle.id);
            await supabase
              .from('vehicle_status_history' as any)
              .insert({
                vehicle_id: vehicle.id,
                company_id: vehicle.company_id,
                old_status: VEHICLE_STATUS.ACTIF,
                new_status: VEHICLE_STATUS.EN_MAINTENANCE,
                reason: `RDV maintenance programmé pour le ${todayStr}`,
                maintenance_record_id: linkedRecord?.id ?? null,
                changed_by: 'cron',
              });

            stats.vehicles_set_maintenance++;
            logger.info(
              `✅ Étape A: ${vehicle.registration_number} → maintenance (record: ${linkedRecord?.id ?? 'N/A'})`,
            );
          } catch (err: any) {
            stats.errors++;
            logger.error(`❌ Étape A: ${vehicle.registration_number}`, { error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
    }
  } catch (err: any) {
    stats.errors++;
    logger.error('Étape A fatal', { error: err instanceof Error ? err.message : String(err) });
  }

  // ============================================================
  // ÉTAPE B — Retour à l'état actif
  // ============================================================

  try {
    // 1. Tous les véhicules actuellement en maintenance
    const { data: maintenanceVehicles, error: mvErr } = await supabase
      .from('vehicles')
      .select('id, company_id, registration_number')
      .eq('status', VEHICLE_STATUS.EN_MAINTENANCE);

    if (mvErr) {
      logger.error('Étape B: erreur lecture vehicles en maintenance', { error: mvErr instanceof Error ? mvErr.message : String(mvErr) });
    } else if (maintenanceVehicles && maintenanceVehicles.length > 0) {
      stats.vehicles_checked_return = maintenanceVehicles.length;

      for (const vehicle of maintenanceVehicles) {
        try {
          // 2. Trouver le dernier record de maintenance pour ce véhicule
          //    On cherche le plus récent avec rdv_date <= aujourd'hui
          //    (peut encore être en RDV_PRIS si le workflow n'a pas été mis à jour)
          const { data: record } = await supabase
            .from('maintenance_records')
            .select('id, rdv_date, estimated_days, estimated_hours')
            .eq('vehicle_id', vehicle.id)
            .eq('company_id', vehicle.company_id) // sécurité anti-fuite cross-company
            .in('status', ['RDV_PRIS', 'VALIDEE_DIRECTEUR', 'EN_COURS'])
            .not('rdv_date', 'is', null)
            .lte('rdv_date', todayStr) // rdv_date dans le passé ou aujourd'hui
            .order('rdv_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!record?.rdv_date) {
            // Aucun record trouvé → on ne force pas le retour automatique
            // (maintenance créée manuellement ou workflow non mis à jour)
            logger.warn(
              `⚠️ Étape B: ${vehicle.registration_number} en maintenance sans record associé — ignoré`,
            );
            continue;
          }

          // 3. Calculer la date de retour attendue
          const returnDate = calculateReturnDate(
            record.rdv_date,
            record.estimated_days,
            record.estimated_hours,
          );

          // 4. Si on a atteint (ou dépassé) la date de retour → passer actif
          if (today >= returnDate) {
            const effectiveDays = Math.max(
              1,
              record.estimated_days === 0 ? 1 : (record.estimated_days ?? 1),
            );

            const now = new Date().toISOString();

            const { error: updateErr } = await supabase
              .from('vehicles')
              .update({
                status: VEHICLE_STATUS.ACTIF,
                maintenance_ended_at: now,
              })
              .eq('id', vehicle.id);

            if (updateErr) {
              throw new Error(updateErr.message);
            }

            await supabase
              .from('vehicle_status_history' as any)
              .insert({
                vehicle_id: vehicle.id,
                company_id: vehicle.company_id,
                old_status: VEHICLE_STATUS.EN_MAINTENANCE,
                new_status: VEHICLE_STATUS.ACTIF,
                reason: `Durée estimée écoulée — ${effectiveDays}j depuis rdv_date ${record.rdv_date}`,
                maintenance_record_id: record.id,
                changed_by: 'cron',
              });

            stats.vehicles_set_active++;
            logger.info(
              `✅ Étape B: ${vehicle.registration_number} → ACTIF (retour prévu: ${returnDate.toISOString().split('T')[0]})`,
            );
          } else {
            logger.info(
              `⏳ Étape B: ${vehicle.registration_number} — retour prévu le ${returnDate.toISOString().split('T')[0]} (pas encore)`,
            );
          }
        } catch (err: any) {
          stats.errors++;
          logger.error(`❌ Étape B: ${vehicle.registration_number}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } catch (err: any) {
    stats.errors++;
    logger.error('Étape B fatal', { error: err instanceof Error ? err.message : String(err) });
  }

  // ============================================================
  // ÉTAPE C — Correction des maintenances terminées non traitées
  // ============================================================
  // Cas : Une maintenance a été marquée TERMINEE aujourd'hui mais le véhicule
  // n'a jamais été passé en EN_MAINTENANCE (cron qui n'a pas tourné ou RDV créé
  // directement en TERMINEE). On passe quand même le véhicule en ACTIF.
  // ============================================================

  try {
    // 1. Maintenances terminées aujourd'hui
    const { data: completedToday, error: compErr } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, company_id, rdv_date, completed_at')
      .eq('status', 'TERMINEE')
      .gte('completed_at', todayStr)  // Terminée aujourd'hui
      .lt('completed_at', todayStr + 'T23:59:59.999Z');

    if (compErr) {
      logger.error('Étape C: erreur lecture maintenances terminées', { error: compErr instanceof Error ? compErr.message : String(compErr) });
    } else if (completedToday && completedToday.length > 0) {
      logger.info(`[DEBUG] Étape C: ${completedToday.length} maintenances terminées aujourd'hui`);

      for (const record of completedToday) {
        try {
          // 2. Vérifier si le véhicule est encore en ACTIF (pas passé par EN_MAINTENANCE)
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('id, company_id, registration_number, status')
            .eq('id', record.vehicle_id)
            .eq('status', VEHICLE_STATUS.ACTIF)  // Seulement si encore ACTIF
            .single();

          if (vehicle) {
            // 3. Mettre à jour le véhicule (avec maintenance_ended_at pour traçabilité)
            // @ts-ignore - Colonne maintenance_ended_at existante en DB mais non typée
            const { error: updateErr } = await supabase
              .from('vehicles')
              .update({
                maintenance_ended_at: record.completed_at || new Date().toISOString(),
              } as never)
              .eq('id', vehicle.id);

            if (updateErr) throw new Error(updateErr.message);

            // 4. Log dans l'historique
            await supabase
              .from('vehicle_status_history' as any)
              .insert({
                vehicle_id: vehicle.id,
                company_id: vehicle.company_id,
                old_status: VEHICLE_STATUS.ACTIF,
                new_status: VEHICLE_STATUS.ACTIF,
                reason: `Maintenance terminée le ${todayStr} (véhicule resté ACTIF - traitement tardif)`,
                maintenance_record_id: record.id,
                changed_by: 'cron',
              });

            stats.vehicles_completed_today++;
            logger.info(
              `✅ Étape C: ${vehicle.registration_number} — maintenance terminée aujourd'hui (était resté ACTIF)`,
            );
          }
        } catch (err: any) {
          stats.errors++;
          logger.error(`❌ Étape C: record ${record.id}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } catch (err: any) {
    stats.errors++;
    logger.error('Étape C fatal', { error: err instanceof Error ? err.message : String(err) });
  }

  // ============================================================
  // RÉPONSE
  // ============================================================

    logger.info('Cron maintenance-status completed', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date_processed: todayStr,
      step_a: {
        vehicles_found: stats.vehicles_to_maintenance,
        set_to_maintenance: stats.vehicles_set_maintenance,
      },
      step_b: {
        vehicles_checked: stats.vehicles_checked_return,
        returned_to_active: stats.vehicles_set_active,
      },
      step_c: {
        description: 'Maintenances terminées aujourd\'hui — synchronisation',
        completed_today: stats.vehicles_completed_today,
      },
      errors: stats.errors,
    });
  } catch (error) {
    logger.error('[cron/maintenance-status] Erreur non gérée:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
