/**
 * GET /api/export/pdf?type=vehicles|drivers|maintenance
 *
 * Security: same as CSV route (auth + company_id isolation)
 * PDF is generated server-side with pdfkit (Node.js only, not Edge runtime)
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generatePDF, ExportType } from '@/lib/export/pdf-generator';
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

    // 3. Get company_id + company name
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return new NextResponse('Profil introuvable ou company_id manquant', { status: 403 });
    }

    const { company_id } = profile;

    // Fetch company name
    const { data: company } = await adminClient
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();

    const companyName = company?.name ?? 'FleetMaster';

    // 4. Fetch data
    const data = await fetchData(supabase, type, company_id);

    // 5. Generate PDF buffer
    const pdfBuffer = await generatePDF({ type, data, companyName });

    // 6. Return as downloadable PDF
    const filename = `fleetmaster-${type}-${fileDateStamp()}.pdf`;
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export/pdf] Error:', err);
    return new NextResponse('Erreur interne lors de la génération du PDF', { status: 500 });
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
