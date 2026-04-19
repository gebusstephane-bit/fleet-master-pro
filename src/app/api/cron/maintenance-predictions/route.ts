/**
 * CRON : Recalcul hebdomadaire des prédictions de maintenance
 * Auth : Bearer / x-vercel-cron-secret / x-cron-secret / ?secret=
 *
 * Parcourt tous les véhicules actifs et appelle recalculatePredictionsForVehicle
 * pour rafraîchir maintenance_predictions.current_km / km_until_due / status
 * à partir de vehicles.mileage (source de vérité).
 *
 * Les échecs par véhicule sont isolés (try/catch) — la boucle continue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { recalculatePredictionsForVehicle } from '@/lib/maintenance-predictor';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const secret =
    bearerSecret ||
    request.headers.get('x-vercel-cron-secret') ||
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createAdminClient();

  const { data: vehicles, error: vehiclesErr } = await admin
    .from('vehicles')
    .select('id')
    .eq('status', 'ACTIF')
    .is('deleted_at', null);

  if (vehiclesErr) {
    logger.error('[Maintenance Predictions] Failed to fetch vehicles', {
      error: vehiclesErr.message,
    });
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }

  const totalVehicles = vehicles?.length ?? 0;
  let successCount = 0;
  let errorCount = 0;

  for (const v of vehicles ?? []) {
    try {
      await recalculatePredictionsForVehicle(v.id, admin);
      successCount++;
    } catch (err) {
      errorCount++;
      logger.error('[Maintenance Predictions] Recalc failed for vehicle', {
        vehicleId: v.id.substring(0, 8),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const durationMs = Date.now() - startedAt;

  logger.info('[Maintenance Predictions] Completed', {
    totalVehicles,
    successCount,
    errorCount,
    durationMs,
  });

  return NextResponse.json({
    success: true,
    totalVehicles,
    successCount,
    errorCount,
    durationMs,
  });
}
