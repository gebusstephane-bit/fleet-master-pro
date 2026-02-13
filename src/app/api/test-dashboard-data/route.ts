/**
 * API Route de test - Bypass RLS
 * Vérifie les données avec le client admin
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Récupérer le company_id depuis le premier véhicule
    const { data: firstVehicle, error: companyError } = await adminClient
      .from('vehicles')
      .select('company_id')
      .limit(1)
      .single();

    if (companyError || !firstVehicle?.company_id) {
      return NextResponse.json({
        error: 'Aucun véhicule trouvé',
        details: companyError?.message
      }, { status: 404 });
    }

    const companyId = firstVehicle.company_id;

    // 2. Compter les véhicules
    const { count: vehiclesCount, error: vError } = await adminClient
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 3. Compter les chauffeurs
    const { count: driversCount, error: dError } = await adminClient
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 4. Compter les maintenances
    const { count: maintCount, error: mError } = await adminClient
      .from('maintenance_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 5. Compter les inspections
    const { count: inspectCount, error: iError } = await adminClient
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 6. Compter les prédictions IA
    const { count: predCount, error: pError } = await adminClient
      .from('ai_predictions')
      .select('*', { count: 'exact', head: true });

    // 7. Compter les activity_logs
    const { count: actCount, error: aError } = await adminClient
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    return NextResponse.json({
      companyId,
      data: {
        vehicles: vehiclesCount || 0,
        drivers: driversCount || 0,
        maintenances: maintCount || 0,
        inspections: inspectCount || 0,
        predictions: predCount || 0,
        activities: actCount || 0,
      },
      errors: {
        vehicles: vError?.message,
        drivers: dError?.message,
        maintenances: mError?.message,
        inspections: iError?.message,
        predictions: pError?.message,
        activities: aError?.message,
      }
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: (error as Error).message
    }, { status: 500 });
  }
}
