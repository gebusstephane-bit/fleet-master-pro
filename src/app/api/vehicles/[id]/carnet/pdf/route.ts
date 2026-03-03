/**
 * GET /api/vehicles/[id]/carnet/pdf
 *
 * Generates the "Carnet d'Entretien Digital" PDF for a specific vehicle.
 * Security: authenticated + company_id isolation (RLS + explicit check).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  generateCarnetPDF,
  type VehicleCarnetData,
  type MaintenanceEntry,
  type InspectionEntry,
  type FuelEntry,
} from '@/lib/export/carnet-pdf-generator';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const vehicleId = params.id;
    if (!vehicleId) {
      return new NextResponse('vehicleId manquant', { status: 400 });
    }

    // ── 1. Auth ────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new NextResponse('Non authentifie', { status: 401 });
    }

    // ── 2. Company isolation ───────────────────────────────────────────────
    const adminClient = createAdminClient();
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile?.company_id) {
      return new NextResponse('Profil introuvable', { status: 403 });
    }
    const { company_id } = profile;

    // ── 3. Fetch vehicle (RLS also enforces company_id) ────────────────────
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('company_id', company_id)
      .single();

    if (vehicleErr || !vehicle) {
      return new NextResponse('Vehicule introuvable ou acces refuse', { status: 404 });
    }

    // ── 4. Fetch company info ──────────────────────────────────────────────
    const { data: company } = await adminClient
      .from('companies')
      .select('name, siret, address, city, email')
      .eq('id', company_id)
      .single();

    // ── 5. Fetch maintenance records (adminClient bypasse les RLS silencieuses) ──
    const { data: maintenancesRaw, error: maintErr } = await adminClient
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });

    if (maintErr) console.error('[carnet/pdf] maintenance_records error:', maintErr);

    // ── 6. Fetch inspections ───────────────────────────────────────────────
    const { data: inspectionsRaw, error: inspErr } = await adminClient
      .from('vehicle_inspections')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (inspErr) console.error('[carnet/pdf] vehicle_inspections error:', inspErr);

    // ── 7. Fetch fuel records (last 6 months) ──────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: fuelRaw, error: fuelErr } = await adminClient
      .from('fuel_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('company_id', company_id)
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: false });

    if (fuelErr) console.error('[carnet/pdf] fuel_records error:', fuelErr);

    // ── 8. Build carnet data ───────────────────────────────────────────────
    const carnetData: VehicleCarnetData = {
      vehicle: {
        id:                         vehicle.id,
        registration_number:        vehicle.registration_number,
        brand:                      vehicle.brand,
        model:                      vehicle.model,
        year:                       vehicle.year,
        type:                       vehicle.type,
        fuel_type:                  vehicle.fuel_type,
        vin:                        vehicle.vin,
        mileage:                    vehicle.mileage,
        status:                     vehicle.status,
        insurance_expiry:           vehicle.insurance_expiry,
        technical_control_expiry:   vehicle.technical_control_expiry,
        tachy_control_expiry:       vehicle.tachy_control_expiry,
        atp_expiry:                 vehicle.atp_expiry,
      },
      company: {
        name:    company?.name    ?? 'FleetMaster',
        siret:   company?.siret   ?? null,
        address: company?.address ?? null,
        city:    company?.city    ?? null,
        email:   company?.email   ?? null,
      },
      maintenances: (maintenancesRaw ?? []) as MaintenanceEntry[],
      inspections:  (inspectionsRaw  ?? []) as InspectionEntry[],
      fuelRecords:  (fuelRaw         ?? []) as FuelEntry[],
    };

    // ── 9. Generate PDF ────────────────────────────────────────────────────
    const pdfBuffer = await generateCarnetPDF(carnetData);

    const filename = `carnet-${vehicle.registration_number.replace(/\s+/g, '-')}-${
      new Date().toISOString().slice(0, 10)
    }.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(pdfBuffer.byteLength),
        'Cache-Control':       'no-store, no-cache',
      },
    });
  } catch (err) {
    console.error('[carnet/pdf] Error:', err);
    return new NextResponse('Erreur interne lors de la generation du carnet PDF', { status: 500 });
  }
}
