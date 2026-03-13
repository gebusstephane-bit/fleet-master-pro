/**
 * CRON : Scoring conducteur IA — quotidien à 02h00
 * Auth : x-cron-secret header ou ?secret= query param
 *
 * 1. Calcul algorithmique (score 0-100) pour chaque conducteur actif
 * 2. Batch OpenAI par lots de 20 → résumé narratif
 * 3. UPDATE drivers SET ai_score = {score, resume, updated_at}
 *
 * Contraintes coût :
 * - 1 seul appel OpenAI par lot de 20 conducteurs
 * - Max 50 lots/nuit (= 1000 conducteurs)
 * - Budget guard vérifié avant chaque lot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { callAI, type AIMessage } from '@/lib/ai/openai-client';
import { canCallAI } from '@/lib/ai/budget-guard';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

const BATCH_SIZE = 20;
const MAX_BATCHES_PER_RUN = 50;

const SCORING_SYSTEM_PROMPT = `Tu reçois un tableau JSON de profils conducteurs avec leurs métriques chiffrées.
Pour CHACUN, génère un résumé narratif d'une phrase (max 15 mots) décrivant son profil.
Ton seul output est un JSON array dans le même ordre : [{"id":"uuid","resume":"phrase"}].
Sois factuel et bienveillant. Réponds uniquement en JSON.`;

interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string;
  score: number;
  incident_score: number;
  fuel_score: number;
}

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let totalProcessed = 0;
  let totalBatches = 0;
  let totalAICalls = 0;

  try {
    // 1. Récupérer tous les conducteurs actifs, groupés par company
    const { data: drivers, error: driversErr } = await admin
      .from('drivers')
      .select('id, first_name, last_name, company_id')
      .eq('is_active', true)
      .order('company_id');

    if (driversErr || !drivers || drivers.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No active drivers to score',
        processed: 0,
      });
    }

    // 2. Récupérer les incidents des 30 derniers jours (tous d'un coup)
    const { data: incidents } = await admin
      .from('incidents')
      .select('driver_id, severity')
      .gte('created_at', thirtyDaysAgo);

    const incidentsByDriver = new Map<string, { grave: number; leger: number }>();
    for (const inc of (incidents || []) as any[]) {
      if (!inc.driver_id) continue;
      const current = incidentsByDriver.get(inc.driver_id) || { grave: 0, leger: 0 };
      if (['grave', 'tres_grave', 'critical'].includes(inc.severity?.toLowerCase())) {
        current.grave++;
      } else {
        current.leger++;
      }
      incidentsByDriver.set(inc.driver_id, current);
    }

    // 3. Récupérer les stats fuel (moyenne par conducteur vs flotte)
    const { data: fuelRecords } = await admin
      .from('fuel_records')
      .select('driver_id, consumption_l_per_100km')
      .gte('created_at', thirtyDaysAgo)
      .not('driver_id', 'is', null)
      .not('consumption_l_per_100km', 'is', null);

    // Calculer la moyenne flotte
    const allConsumptions = (fuelRecords || [])
      .map((f: any) => f.consumption_l_per_100km)
      .filter((c: any) => c != null && c > 0);
    const fleetAvg = allConsumptions.length > 0
      ? allConsumptions.reduce((a: number, b: number) => a + b, 0) / allConsumptions.length
      : 0;

    // Moyenne par conducteur
    const fuelByDriver = new Map<string, number[]>();
    for (const fr of (fuelRecords || []) as any[]) {
      if (!fr.driver_id || !fr.consumption_l_per_100km) continue;
      const arr = fuelByDriver.get(fr.driver_id) || [];
      arr.push(fr.consumption_l_per_100km);
      fuelByDriver.set(fr.driver_id, arr);
    }

    // 4. Calculer le score algorithmique pour chaque conducteur
    const scoredDrivers: DriverProfile[] = (drivers as any[]).map((d) => {
      const inc = incidentsByDriver.get(d.id) || { grave: 0, leger: 0 };
      const incidentScore = Math.max(0, 100 + (inc.grave * -10) + (inc.leger * -3));

      let fuelScore = 50; // Neutre si pas de données
      const driverFuel = fuelByDriver.get(d.id);
      if (driverFuel && driverFuel.length > 0 && fleetAvg > 0) {
        const driverAvg = driverFuel.reduce((a, b) => a + b, 0) / driverFuel.length;
        const deviation = ((driverAvg - fleetAvg) / fleetAvg) * 100;
        // Économe = bonus, gourmand = malus
        fuelScore = Math.max(0, Math.min(100, 50 - deviation));
      }

      // Score composite : incidents 60%, fuel 40%
      const score = Math.round(Math.min(100, Math.max(0,
        incidentScore * 0.6 + fuelScore * 0.4
      )));

      return {
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        company_id: d.company_id,
        score,
        incident_score: Math.min(100, incidentScore),
        fuel_score: Math.round(fuelScore),
      };
    });

    // 5. Traiter par lots de 20
    for (let i = 0; i < scoredDrivers.length && totalBatches < MAX_BATCHES_PER_RUN; i += BATCH_SIZE) {
      const batch = scoredDrivers.slice(i, i + BATCH_SIZE);
      totalBatches++;

      // Vérifier le budget pour le premier tenant du lot
      const companyId = batch[0].company_id;
      const budgetOk = await canCallAI(companyId, 'driver_scoring');
      if (!budgetOk) {
        logger.info('[Driver Scoring] Budget exhausted, stopping', {
          processed: totalProcessed,
          batch: totalBatches,
        });
        Sentry.captureMessage('[Driver Scoring] Stopped due to budget limit', {
          level: 'warning',
          extra: { processed: totalProcessed, totalBatches },
        });
        break;
      }

      // Construire le prompt pour le lot
      const batchData = batch.map((d) => ({
        id: d.id,
        nom: `${d.first_name} ${d.last_name}`,
        score_global: d.score,
        score_incidents: d.incident_score,
        score_carburant: d.fuel_score,
      }));

      const messages: AIMessage[] = [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(batchData) },
      ];

      const aiResult = await callAI(messages, 600, companyId, 'driver_scoring', 30_000);
      totalAICalls++;

      // Parser les résumés IA (strip markdown code fences if present)
      let resumes = new Map<string, string>();
      if (aiResult) {
        try {
          const cleanJson = aiResult.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleanJson) as Array<{ id: string; resume: string }>;
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.id && item.resume) {
                resumes.set(item.id, item.resume);
              }
            }
          }
        } catch {
          logger.warn('[Driver Scoring] Failed to parse AI batch response', {
            raw: aiResult.substring(0, 200),
          });
        }
      }

      // 6. UPDATE chaque conducteur du lot
      for (const driver of batch) {
        const aiScore = {
          score: driver.score,
          incident_score: driver.incident_score,
          fuel_score: driver.fuel_score,
          resume: resumes.get(driver.id) || null,
        };

        try {
          await (admin as any)
            .from('drivers')
            .update({
              ai_score: aiScore,
              ai_score_updated_at: now.toISOString(),
            })
            .eq('id', driver.id);
        } catch (err) {
          logger.error('[Driver Scoring] Update failed', {
            driverId: driver.id.substring(0, 8),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      totalProcessed += batch.length;
    }

    logger.info('[Driver Scoring] Completed', {
      totalProcessed,
      totalBatches,
      totalAICalls,
      totalDrivers: scoredDrivers.length,
    });

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      batches: totalBatches,
      aiCalls: totalAICalls,
      totalDrivers: scoredDrivers.length,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { module: 'cron_driver_scoring' },
    });
    logger.error('[Driver Scoring] Cron failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Driver scoring failed' },
      { status: 500 }
    );
  }
}
