/**
 * API Route Debug - Voir TOUTES les données sans filtre
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Company ID
    const { data: firstVehicle } = await adminClient
      .from('vehicles')
      .select('company_id')
      .limit(1)
      .single();

    const companyId = firstVehicle?.company_id;
    
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // 2. TOUTES les maintenances (sans filtre)
    const { data: allMaintenances, error: maintError } = await adminClient
      .from('maintenance_records')
      .select('*')
      .eq('company_id', companyId)
      .limit(20);

    // 3. TOUTES les inspections (sans filtre)
    const { data: allInspections, error: inspectError } = await adminClient
      .from('inspections')
      .select('*')
      .eq('company_id', companyId)
      .limit(20);

    // 4. Vérifier les valeurs distinctes
    const { data: maintStatuses } = await adminClient
      .from('maintenance_records')
      .select('status')
      .eq('company_id', companyId);

    const uniqueStatuses = [...new Set(maintStatuses?.map(m => m.status))];

    return NextResponse.json({
      companyId,
      maintenances: {
        count: allMaintenances?.length || 0,
        error: maintError?.message,
        all: allMaintenances,
        uniqueStatuses,
      },
      inspections: {
        count: allInspections?.length || 0,
        error: inspectError?.message,
        all: allInspections,
      },
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
