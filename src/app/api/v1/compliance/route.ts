import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { VEHICLE_STATUS } from '@/constants/enums';

const SOON_DAYS = 30;

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/v1/compliance
 * Fleet-wide compliance summary.
 * Returns counts of vehicles/drivers with expired or soon-expiring documents.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const supabase = createAdminClient();
  const now = new Date().toISOString().split('T')[0];
  const soonDate = new Date(Date.now() + SOON_DAYS * 86400_000).toISOString().split('T')[0];

  // Vehicles compliance
  const { data: vehicles, error: vErr } = await supabase
    .from('vehicles')
    .select(
      'id, registration_number, status, technical_control_expiry, tachy_control_expiry, atp_expiry, insurance_expiry'
    )
    .eq('company_id', auth.companyId)
    .neq('status', VEHICLE_STATUS.ARCHIVE);

  if (vErr) return apiError(vErr.message, 500, rateLimitHeaders);

  // Drivers compliance
  const { data: drivers, error: dErr } = await supabase
    .from('drivers')
    .select(
      'id, first_name, last_name, status, license_expiry, medical_certificate_expiry, fimo_expiry, fcos_expiry, cqc_expiry_date, driver_card_expiry'
    )
    .eq('company_id', auth.companyId)
    .eq('is_active', true);

  if (dErr) return apiError(dErr.message, 500, rateLimitHeaders);

  // Vehicle document checks
  const docFields = [
    { key: 'technical_control_expiry', label: 'CT' },
    { key: 'tachy_control_expiry', label: 'Tachygraphe' },
    { key: 'atp_expiry', label: 'ATP' },
    { key: 'insurance_expiry', label: 'Assurance' },
  ] as const;

  let vehicleExpired = 0;
  let vehicleSoon = 0;
  const vehicleIssues: Array<{ id: string; registration_number: string; doc: string; expiry: string; days_remaining: number | null }> = [];

  for (const v of vehicles ?? []) {
    for (const { key, label } of docFields) {
      const expiry = (v as Record<string, string | null>)[key];
      if (!expiry) continue;
      const days = daysUntil(expiry);
      if (days !== null && days < 0) {
        vehicleExpired++;
        vehicleIssues.push({ id: v.id, registration_number: v.registration_number, doc: label, expiry, days_remaining: days });
      } else if (days !== null && days <= SOON_DAYS) {
        vehicleSoon++;
        vehicleIssues.push({ id: v.id, registration_number: v.registration_number, doc: label, expiry, days_remaining: days });
      }
    }
  }

  // Driver document checks
  const driverDocFields = [
    { key: 'license_expiry', label: 'Permis de conduire' },
    { key: 'medical_certificate_expiry', label: 'Certificat médical' },
    { key: 'fimo_expiry', label: 'FIMO' },
    { key: 'fcos_expiry', label: 'FCOS' },
    { key: 'cqc_expiry_date', label: 'CQC' },
    { key: 'driver_card_expiry', label: 'Carte conducteur' },
  ] as const;

  let driverExpired = 0;
  let driverSoon = 0;
  const driverIssues: Array<{ id: string; name: string; doc: string; expiry: string; days_remaining: number | null }> = [];

  for (const d of drivers ?? []) {
    for (const { key, label } of driverDocFields) {
      const expiry = (d as Record<string, string | null>)[key];
      if (!expiry) continue;
      const days = daysUntil(expiry);
      if (days !== null && days < 0) {
        driverExpired++;
        driverIssues.push({ id: d.id, name: `${d.first_name} ${d.last_name}`, doc: label, expiry, days_remaining: days });
      } else if (days !== null && days <= SOON_DAYS) {
        driverSoon++;
        driverIssues.push({ id: d.id, name: `${d.first_name} ${d.last_name}`, doc: label, expiry, days_remaining: days });
      }
    }
  }

  const totalVehicles = vehicles?.length ?? 0;
  const totalDrivers = drivers?.length ?? 0;
  const totalIssues = vehicleExpired + vehicleSoon + driverExpired + driverSoon;

  const result = {
    summary: {
      checked_at: new Date().toISOString(),
      total_vehicles: totalVehicles,
      total_drivers: totalDrivers,
      total_issues: totalIssues,
      compliance_rate_vehicles: totalVehicles
        ? Math.round(((totalVehicles - vehicleExpired) / totalVehicles) * 100)
        : 100,
      compliance_rate_drivers: totalDrivers
        ? Math.round(((totalDrivers - driverExpired) / totalDrivers) * 100)
        : 100,
    },
    vehicles: {
      expired: vehicleExpired,
      expiring_soon: vehicleSoon,
      issues: vehicleIssues,
    },
    drivers: {
      expired: driverExpired,
      expiring_soon: driverSoon,
      issues: driverIssues,
    },
  };

  return apiSuccess(result, null, rateLimitHeaders);
}
