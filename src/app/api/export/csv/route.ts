/**
 * GET /api/export/csv?type=vehicles|drivers|maintenance
 *
 * Security:
 * - Auth check: user must be authenticated
 * - Company isolation: only data belonging to user's company_id is returned
 * - RLS is an additional safety net (server client respects RLS)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateCSV, ExportType } from '@/lib/export/csv-generator';
import { fileDateStamp } from '@/lib/export/formatters';

const VALID_TYPES: ExportType[] = ['vehicles', 'drivers', 'maintenance'];

export async function GET(request: NextRequest) {
  try {
    // 1. Parse & validate params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExportType;

    if (!VALID_TYPES.includes(type)) {
      return new NextResponse('Paramètre type invalide. Valeurs acceptées: vehicles, drivers, maintenance', {
        status: 400,
      });
    }

    // 2. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Non authentifié', { status: 401 });
    }

    // 3. Get company_id from profile (via admin client to avoid RLS loop)
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return new NextResponse('Profil introuvable ou company_id manquant', { status: 403 });
    }

    const { company_id } = profile;

    // 4. Fetch data (server Supabase client inherits RLS from auth)
    const data = await fetchData(supabase, type, company_id);

    // 5. Generate CSV
    const csv = generateCSV(type, data);

    // 6. Return as downloadable file
    const filename = `fleetmaster-${type}-${fileDateStamp()}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Export-Count': String(data.length),
      },
    });
  } catch (err) {
    console.error('[export/csv] Error:', err);
    return new NextResponse('Erreur interne lors de la génération du CSV', { status: 500 });
  }
}

async function fetchData(supabase: any, type: ExportType, company_id: string): Promise<any[]> {
  switch (type) {
    case 'vehicles': {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', company_id)
        .order('registration_number');
      if (error) throw error;
      return data ?? [];
    }

    case 'drivers': {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, vehicles(registration_number)')
        .eq('company_id', company_id)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    }

    case 'maintenance': {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, vehicles(brand, model, registration_number)')
        .eq('company_id', company_id)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }

    default:
      return [];
  }
}
