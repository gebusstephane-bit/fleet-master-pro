/**
 * CRON JOB — Changement automatique de statut véhicule (maintenance ↔ actif)
 *
 * Exécution : tous les jours à 08h00 UTC (= 09h00 CET / 10h00 CEST)
 * Configuré dans vercel.json : "0 8 * * *"
 *
 * ÉTAPE A — Passage en "maintenance" :
 *   Véhicules avec rdv_date = AUJOURD'HUI + status (RDV_PRIS|VALIDEE_DIRECTEUR)
 *   → vehicles.status = 'maintenance' + log dans vehicle_status_history
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
  // ── Authentification ──────────────────────────────────────
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
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
    // Erreurs
    errors: 0,
  };

  console.log(`Cron maintenance-status: processing date = ${todayStr}`);

  // ============================================================
  // ÉTAPE A — Passage en maintenance
  // ============================================================

  try {
    // 1. RDV programmés aujourd'hui (statut confirmé)
    const { data: todayRdvs, error: rdvErr } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, company_id, rdv_time')
      .eq('rdv_date', todayStr)
      .in('status', ['RDV_PRIS', 'VALIDEE_DIRECTEUR']);

    if (rdvErr) {
      console.error('Étape A: erreur lecture maintenance_records', rdvErr);
    } else if (todayRdvs && todayRdvs.length > 0) {
      // Dédupliquer les véhicules (un véhicule peut avoir plusieurs records)
      const vehicleIds = [...new Set(todayRdvs.map((r) => r.vehicle_id))];
      stats.vehicles_to_maintenance = vehicleIds.length;

      // 2. Parmi ces véhicules, ne prendre que ceux encore actifs
      const { data: activeVehicles, error: vehicleErr } = await supabase
        .from('vehicles')
        .select('id, company_id, registration_number')
        .in('id', vehicleIds)
        .eq('status', 'active');

      if (vehicleErr) {
        console.error('Étape A: erreur lecture vehicles', vehicleErr);
      } else if (activeVehicles && activeVehicles.length > 0) {
        const now = new Date().toISOString();

        for (const vehicle of activeVehicles) {
          try {
            // 3. Passage en maintenance
            const { error: updateErr } = await supabase
              .from('vehicles')
              .update({
                status: 'maintenance',
                maintenance_started_at: now,
              })
              .eq('id', vehicle.id);

            if (updateErr) {
              throw new Error(updateErr.message);
            }

            // 4. Log dans vehicle_status_history
            const linkedRecord = todayRdvs.find((r) => r.vehicle_id === vehicle.id);
            await supabase
              .from('vehicle_status_history' as any)
              .insert({
                vehicle_id: vehicle.id,
                company_id: vehicle.company_id,
                old_status: 'active',
                new_status: 'maintenance',
                reason: `RDV maintenance programmé pour le ${todayStr}`,
                maintenance_record_id: linkedRecord?.id ?? null,
                changed_by: 'cron',
              });

            stats.vehicles_set_maintenance++;
            console.log(
              `✅ Étape A: ${vehicle.registration_number} → maintenance (record: ${linkedRecord?.id ?? 'N/A'})`,
            );
          } catch (err: any) {
            stats.errors++;
            console.error(`❌ Étape A: ${vehicle.registration_number}`, err.message);
          }
        }
      }
    }
  } catch (err: any) {
    stats.errors++;
    console.error('Étape A fatal:', err.message);
  }

  // ============================================================
  // ÉTAPE B — Retour à l'état actif
  // ============================================================

  try {
    // 1. Tous les véhicules actuellement en maintenance
    const { data: maintenanceVehicles, error: mvErr } = await supabase
      .from('vehicles')
      .select('id, company_id, registration_number')
      .eq('status', 'maintenance');

    if (mvErr) {
      console.error('Étape B: erreur lecture vehicles en maintenance', mvErr);
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
            console.warn(
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
                status: 'active',
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
                old_status: 'maintenance',
                new_status: 'active',
                reason: `Durée estimée écoulée — ${effectiveDays}j depuis rdv_date ${record.rdv_date}`,
                maintenance_record_id: record.id,
                changed_by: 'cron',
              });

            stats.vehicles_set_active++;
            console.log(
              `✅ Étape B: ${vehicle.registration_number} → active (retour prévu: ${returnDate.toISOString().split('T')[0]})`,
            );
          } else {
            console.log(
              `⏳ Étape B: ${vehicle.registration_number} — retour prévu le ${returnDate.toISOString().split('T')[0]} (pas encore)`,
            );
          }
        } catch (err: any) {
          stats.errors++;
          console.error(`❌ Étape B: ${vehicle.registration_number}`, err.message);
        }
      }
    }
  } catch (err: any) {
    stats.errors++;
    console.error('Étape B fatal:', err.message);
  }

  // ============================================================
  // RÉPONSE
  // ============================================================

  console.log('Cron maintenance-status completed:', stats);

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
    errors: stats.errors,
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
