import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { z } from 'zod';
import { VEHICLE_STATUS } from '@/constants/enums';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

const EXPIRY_SOON_DAYS = 30;

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/v1/alerts
 * Active alerts for the fleet: overdue maintenance + expiring/expired documents.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: searchParams.get('page') ?? 1,
    per_page: searchParams.get('per_page') ?? 20,
  });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400, rateLimitHeaders);
  }

  const { page, per_page } = parsed.data;
  const supabase = createAdminClient();

  const alerts: Array<{
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium';
    entity_type: 'vehicle' | 'driver' | 'maintenance';
    entity_id: string;
    entity_name: string;
    message: string;
    due_date: string | null;
    days_remaining: number | null;
  }> = [];

  // 1. Vehicles with expired or soon-to-expire docs
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(
      'id, registration_number, technical_control_expiry, tachy_control_expiry, atp_expiry, insurance_expiry'
    )
    .eq('company_id', auth.companyId)
    .neq('status', VEHICLE_STATUS.ARCHIVE);

  const vehicleDocs = [
    { key: 'technical_control_expiry', label: 'CT expiré' },
    { key: 'tachy_control_expiry', label: 'Tachygraphe expiré' },
    { key: 'atp_expiry', label: 'ATP expiré' },
    { key: 'insurance_expiry', label: 'Assurance expirée' },
  ] as const;

  for (const v of vehicles ?? []) {
    for (const { key, label } of vehicleDocs) {
      const expiry = (v as Record<string, string | null>)[key];
      const days = daysUntil(expiry);
      if (days === null) continue;

      if (days < 0) {
        alerts.push({
          id: `vehicle_${v.id}_${key}`,
          type: key,
          severity: 'critical',
          entity_type: 'vehicle',
          entity_id: v.id,
          entity_name: v.registration_number,
          message: `${label} — véhicule ${v.registration_number} (${Math.abs(days)} jours dépassé)`,
          due_date: expiry,
          days_remaining: days,
        });
      } else if (days <= EXPIRY_SOON_DAYS) {
        alerts.push({
          id: `vehicle_${v.id}_${key}`,
          type: key,
          severity: days <= 7 ? 'high' : 'medium',
          entity_type: 'vehicle',
          entity_id: v.id,
          entity_name: v.registration_number,
          message: `${label.replace('expiré', 'expire dans')} ${days} jours — véhicule ${v.registration_number}`,
          due_date: expiry,
          days_remaining: days,
        });
      }
    }
  }

  // 2. Drivers with expired or soon-to-expire docs
  const { data: drivers } = await supabase
    .from('drivers')
    .select(
      'id, first_name, last_name, license_expiry, medical_certificate_expiry, fimo_expiry, cqc_expiry_date, driver_card_expiry'
    )
    .eq('company_id', auth.companyId)
    .eq('is_active', true);

  const driverDocs = [
    { key: 'license_expiry', label: 'Permis de conduire expiré' },
    { key: 'medical_certificate_expiry', label: 'Certificat médical expiré' },
    { key: 'fimo_expiry', label: 'FIMO expirée' },
    { key: 'cqc_expiry_date', label: 'CQC expiré' },
    { key: 'driver_card_expiry', label: 'Carte conducteur expirée' },
  ] as const;

  for (const d of drivers ?? []) {
    const name = `${d.first_name} ${d.last_name}`;
    for (const { key, label } of driverDocs) {
      const expiry = (d as Record<string, string | null>)[key];
      const days = daysUntil(expiry);
      if (days === null) continue;

      if (days < 0) {
        alerts.push({
          id: `driver_${d.id}_${key}`,
          type: key,
          severity: 'critical',
          entity_type: 'driver',
          entity_id: d.id,
          entity_name: name,
          message: `${label} — conducteur ${name} (${Math.abs(days)} jours dépassé)`,
          due_date: expiry,
          days_remaining: days,
        });
      } else if (days <= EXPIRY_SOON_DAYS) {
        alerts.push({
          id: `driver_${d.id}_${key}`,
          type: key,
          severity: days <= 7 ? 'high' : 'medium',
          entity_type: 'driver',
          entity_id: d.id,
          entity_name: name,
          message: `${label.replace('expiré', 'expire dans').replace('expirée', 'expire dans')} ${days} jours — conducteur ${name}`,
          due_date: expiry,
          days_remaining: days,
        });
      }
    }
  }

  // 3. Overdue maintenance (scheduled but not completed)
  const today = new Date().toISOString().split('T')[0];
  const { data: overdue } = await supabase
    .from('maintenance_records')
    .select('id, vehicle_id, type, description, priority, scheduled_date')
    .eq('company_id', auth.companyId)
    .not('status', 'eq', 'TERMINEE')
    .not('scheduled_date', 'is', null)
    .lt('scheduled_date', today);

  for (const m of overdue ?? []) {
    const days = daysUntil(m.scheduled_date);
    alerts.push({
      id: `maintenance_${m.id}`,
      type: 'overdue_maintenance',
      severity: m.priority === 'CRITICAL' || m.priority === 'HIGH' ? 'critical' : 'high',
      entity_type: 'maintenance',
      entity_id: m.id,
      entity_name: m.type,
      message: `Maintenance en retard : ${m.description} (prévu le ${m.scheduled_date})`,
      due_date: m.scheduled_date,
      days_remaining: days,
    });
  }

  // Sort: critical first, then by days_remaining ascending
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sDiff !== 0) return sDiff;
    return (a.days_remaining ?? 0) - (b.days_remaining ?? 0);
  });

  // Paginate
  const total = alerts.length;
  const offset = (page - 1) * per_page;
  const paged = alerts.slice(offset, offset + per_page);

  return apiSuccess(paged, { total, page, per_page }, rateLimitHeaders);
}
