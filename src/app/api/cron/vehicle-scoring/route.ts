/**
 * CRON : Scoring véhicule IA — hebdomadaire (dimanche 02h00)
 * Auth : x-cron-secret header ou ?secret= query param
 *
 * 1. Calcul algorithmique pondéré (score 0-100) pour chaque véhicule actif
 *    - Maintenance 40%, Inspection 35%, Consommation 25%
 * 2. Batch OpenAI par lots de 50 → résumé narratif
 * 3. UPDATE vehicles SET ai_global_score, ai_score_summary, ai_score_detail
 *
 * Contraintes coût :
 * - 1 seul appel OpenAI par lot de 50 véhicules
 * - Max 20 lots/run (= 1000 véhicules)
 * - Budget guard vérifié avant chaque lot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { callAI, type AIMessage } from '@/lib/ai/openai-client';
import { canCallAI } from '@/lib/ai/budget-guard';
import { computeVehicleWeightedScore, type VehicleScoringInput } from '@/lib/ai/vehicle-scoring';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

const BATCH_SIZE = 50;
const MAX_BATCHES_PER_RUN = 20;

const VEHICLE_SCORING_SYSTEM_PROMPT = `Tu reçois un tableau JSON de véhicules avec leurs scores chiffrés et alertes.
Pour CHACUN, génère un résumé narratif d'une phrase (max 20 mots) décrivant l'état de santé du véhicule.
Mentionne les points forts et les points d'attention principaux.
Ton seul output est un JSON array dans le même ordre : [{"id":"uuid","summary":"phrase"}].
Sois factuel et concis. Réponds uniquement en JSON.`;

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  let totalProcessed = 0;
  let totalBatches = 0;
  let totalAICalls = 0;

  try {
    // 1. Récupérer tous les véhicules actifs
    const { data: vehicles, error: vehiclesErr } = await admin
      .from('vehicles')
      .select('id, registration_number, brand, model, type, mileage, company_id')
      .eq('status', 'ACTIF')
      .is('deleted_at', null)
      .order('company_id');

    if (vehiclesErr || !vehicles || vehicles.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No active vehicles to score',
        processed: 0,
      });
    }

    const vehicleIds = vehicles.map((v: any) => v.id);

    // 2. Récupérer les données en parallèle (toute la flotte)
    const [maintRes, predRes, inspRes, fuelRes] = await Promise.all([
      // Maintenances des 90 derniers jours
      admin
        .from('maintenance_records')
        .select('vehicle_id, type, priority, status, requested_at, completed_at')
        .in('vehicle_id', vehicleIds)
        .gte('created_at', ninetyDaysAgo),
      // Prédictions de maintenance
      admin
        .from('maintenance_predictions' as never)
        .select('vehicle_id, status, priority' as never)
        .in('vehicle_id' as never, vehicleIds as never),
      // Inspections des 90 derniers jours
      admin
        .from('vehicle_inspections')
        .select('vehicle_id, score, reported_defects, inspection_date')
        .in('vehicle_id', vehicleIds)
        .gte('inspection_date', ninetyDaysAgo),
      // Fuel records des 90 derniers jours
      admin
        .from('fuel_records')
        .select('vehicle_id, consumption_l_per_100km')
        .in('vehicle_id', vehicleIds)
        .gte('date', ninetyDaysAgo)
        .not('consumption_l_per_100km', 'is', null),
    ]);

    // 3. Grouper par vehicle_id
    const maintByVehicle = groupBy(maintRes.data as any[] || [], 'vehicle_id');
    const predByVehicle = groupBy(predRes.data as any[] || [], 'vehicle_id');
    const inspByVehicle = groupBy(inspRes.data as any[] || [], 'vehicle_id');
    const fuelByVehicle = groupBy(fuelRes.data as any[] || [], 'vehicle_id');

    // 4. Calculer la moyenne flotte de consommation
    const allConsumptions = (fuelRes.data as any[] || [])
      .map((f: any) => f.consumption_l_per_100km)
      .filter((c: any) => c != null && c > 0);
    const fleetAvgConsumption = allConsumptions.length > 0
      ? allConsumptions.reduce((a: number, b: number) => a + b, 0) / allConsumptions.length
      : 0;

    // 5. Calculer le score algorithmique pour chaque véhicule
    const scoredVehicles: Array<{
      vehicleId: string;
      registration: string;
      brand: string;
      model: string;
      companyId: string;
      scoreResult: ReturnType<typeof computeVehicleWeightedScore>;
    }> = [];

    for (const v of vehicles as any[]) {
      const input: VehicleScoringInput = {
        vehicleId: v.id,
        registration: v.registration_number,
        brand: v.brand,
        model: v.model,
        type: v.type,
        mileage: v.mileage || 0,
        companyId: v.company_id,
        maintenances: maintByVehicle.get(v.id) || [],
        predictions: predByVehicle.get(v.id) || [],
        inspections: inspByVehicle.get(v.id) || [],
        fuelRecords: fuelByVehicle.get(v.id) || [],
        fleetAvgConsumption,
      };

      const scoreResult = computeVehicleWeightedScore(input);
      scoredVehicles.push({
        vehicleId: v.id,
        registration: v.registration_number,
        brand: v.brand,
        model: v.model,
        companyId: v.company_id,
        scoreResult,
      });
    }

    // 6. Traiter par lots de 50
    for (let i = 0; i < scoredVehicles.length && totalBatches < MAX_BATCHES_PER_RUN; i += BATCH_SIZE) {
      const batch = scoredVehicles.slice(i, i + BATCH_SIZE);
      totalBatches++;

      // Vérifier le budget pour le premier tenant du lot
      const companyId = batch[0].companyId;
      const budgetOk = await canCallAI(companyId, 'vehicle_scoring');
      if (!budgetOk) {
        logger.info('[Vehicle Scoring] Budget exhausted, stopping', {
          processed: totalProcessed,
          batch: totalBatches,
        });
        Sentry.captureMessage('[Vehicle Scoring] Stopped due to budget limit', {
          level: 'warning',
          extra: { processed: totalProcessed, totalBatches },
        });
        break;
      }

      // Construire le prompt pour le lot
      const batchData = batch.map((v) => ({
        id: v.vehicleId,
        immat: v.registration,
        vehicule: `${v.brand} ${v.model}`,
        score_global: v.scoreResult.score,
        score_maintenance: v.scoreResult.maintenance_score,
        score_inspection: v.scoreResult.inspection_score,
        score_consommation: v.scoreResult.consumption_score,
        alertes: v.scoreResult.flags,
      }));

      const messages: AIMessage[] = [
        { role: 'system', content: VEHICLE_SCORING_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(batchData) },
      ];

      const aiResult = await callAI(messages, 1200, companyId, 'vehicle_scoring', 30_000);
      totalAICalls++;

      // Parser les résumés IA (strip markdown code fences if present)
      const summaries = new Map<string, string>();
      if (aiResult) {
        try {
          const cleanJson = aiResult.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleanJson) as Array<{ id: string; summary: string }>;
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.id && item.summary) {
                summaries.set(item.id, item.summary);
              }
            }
          }
        } catch {
          logger.warn('[Vehicle Scoring] Failed to parse AI batch response', {
            raw: aiResult.substring(0, 200),
          });
        }
      }

      // 7. UPDATE chaque véhicule du lot
      for (const v of batch) {
        const detail = {
          maintenance_score: v.scoreResult.maintenance_score,
          inspection_score: v.scoreResult.inspection_score,
          consumption_score: v.scoreResult.consumption_score,
          flags: v.scoreResult.flags,
        };

        try {
          await (admin as any)
            .from('vehicles')
            .update({
              ai_global_score: v.scoreResult.score,
              ai_score_summary: summaries.get(v.vehicleId) || null,
              ai_score_detail: detail,
              ai_score_updated_at: now.toISOString(),
            })
            .eq('id', v.vehicleId);
        } catch (err) {
          logger.error('[Vehicle Scoring] Update failed', {
            vehicleId: v.vehicleId.substring(0, 8),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      totalProcessed += batch.length;
    }

    logger.info('[Vehicle Scoring] Completed', {
      totalProcessed,
      totalBatches,
      totalAICalls,
      totalVehicles: scoredVehicles.length,
    });

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      batches: totalBatches,
      aiCalls: totalAICalls,
      totalVehicles: scoredVehicles.length,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { module: 'cron_vehicle_scoring' },
    });
    logger.error('[Vehicle Scoring] Cron failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Vehicle scoring failed' },
      { status: 500 }
    );
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = item[key];
    if (!k) continue;
    const existing = map.get(k) || [];
    existing.push(item);
    map.set(k, existing);
  }
  return map;
}
