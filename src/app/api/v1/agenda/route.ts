import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { addDays, isBefore, parseISO } from 'date-fns';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Unified calendar event exposed to external integrations (e.g. ORIA).
 * Identique au type interne /api/calendar/events sauf que `attendees`
 * (UUIDs privés) n'est jamais exposé.
 */
export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  type: 'maintenance' | 'ct' | 'tachy' | 'atp';
  vehicleId: string | null;
  vehicleRegistration: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  urgent: boolean;
  overdue: boolean;
  maintenanceId: string | null;
  eventType: string | null;
  status: string | null;
  garageName: string | null;
  controlDate: string | null;
  vehicleType: string | null;
}

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['maintenance', 'ct', 'tachy', 'atp']).optional(),
  vehicle_id: z.string().uuid().optional(),
});

/**
 * GET /api/v1/agenda
 *
 * Renvoie les événements agenda unifiés (maintenances + RDV + échéances CT/tachy/ATP)
 * sur une fenêtre temporelle. Fenêtre par défaut : aujourd'hui → +90 jours.
 *
 * Auth : x-api-key (header) — tous plans autorisés en lecture.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    vehicle_id: searchParams.get('vehicle_id') ?? undefined,
  });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400, rateLimitHeaders);
  }

  const { type: typeFilter, vehicle_id: vehicleIdFilter } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 90);
  const start = parsed.data.start ?? today;
  const end = parsed.data.end ?? defaultEnd.toISOString().slice(0, 10);

  const supabase = createAdminClient();

  // 1. maintenance_agenda — events explicites avec slots
  // Note : on suit le pattern de /api/calendar/events (select '*') — certains champs
  // dérivés (vehicle_id, vehicle_registration, garage_name) peuvent être null si la
  // table de base ne les contient pas (ces données sont aussi récupérables via #2 RDV).
  let agendaQuery = (supabase as any)
    .from('maintenance_agenda')
    .select('*')
    .eq('company_id', auth.companyId)
    .gte('event_date', start)
    .lte('event_date', end);
  const { data: maintenanceEventsRaw, error: agendaErr } = await agendaQuery.order('event_date', { ascending: true });
  if (agendaErr) return apiError(agendaErr.message, 500, rateLimitHeaders);
  // Filtre vehicle_id appliqué après le SELECT pour gérer les rows où vehicle_id n'existe pas en table (mais où on a déjà le filtre par maintenance_id dans #2)
  const maintenanceEvents = vehicleIdFilter
    ? (maintenanceEventsRaw || []).filter((e: any) => e.vehicle_id === vehicleIdFilter)
    : maintenanceEventsRaw;

  // 2. maintenance_records avec rdv_date renseigné — actifs uniquement
  // (statuses qui correspondent à un RDV actif/à venir, on exclut TERMINEE,
  // REFUSEE, CANCELLED).
  //
  // Note : on n'applique PAS de filtre date côté SQL — le filtrage par fenêtre
  // est fait en JS plus bas. Cela suit le pattern de la route interne
  // /api/calendar/events (testée et fonctionnelle depuis 8 mois) et évite
  // un bug PostgREST observé sur certaines combinaisons start/end qui faisaient
  // disparaître silencieusement le RDV des résultats malgré qu'il soit
  // bien dans la fenêtre.
  let rdvQuery = (supabase as any)
    .from('maintenance_records')
    .select('id, description, rdv_date, rdv_time, status, garage_name, vehicle_id, vehicles(registration_number, brand, model, type)')
    .eq('company_id', auth.companyId)
    .not('rdv_date', 'is', null)
    .in('status', ['VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']);
  if (vehicleIdFilter) rdvQuery = rdvQuery.eq('vehicle_id', vehicleIdFilter);
  const { data: rdvRecordsAll, error: rdvErr } = await rdvQuery;
  if (rdvErr) return apiError(rdvErr.message, 500, rateLimitHeaders);
  // Filtre date côté JS — string comparison fonctionne pour format YYYY-MM-DD
  const rdvRecords = (rdvRecordsAll || []).filter(
    (r: any) => r.rdv_date >= start && r.rdv_date <= end
  );

  // 3. Véhicules actifs avec leurs échéances réglementaires (filtre OR par expiry dans la fenêtre)
  let vehiclesQuery = (supabase as any)
    .from('vehicles')
    .select('id, registration_number, brand, model, type, technical_control_expiry, technical_control_date, tachy_control_expiry, tachy_control_date, atp_expiry, atp_date')
    .eq('company_id', auth.companyId)
    .eq('status', 'ACTIF');
  if (vehicleIdFilter) vehiclesQuery = vehiclesQuery.eq('id', vehicleIdFilter);
  const { data: vehicles, error: vehErr } = await vehiclesQuery;
  if (vehErr) return apiError(vehErr.message, 500, rateLimitHeaders);

  const now = new Date();
  const startWindow = parseISO(start);
  const endWindow = parseISO(end);
  const urgencyThreshold = addDays(now, 7);
  const events: UnifiedCalendarEvent[] = [];

  // Dédoublonnage : si une maintenance est déjà dans maintenance_agenda, ne pas dupliquer via rdv_date
  const existingMaintenanceIds = new Set(
    (maintenanceEvents || []).map((e: any) => e.maintenance_id).filter(Boolean)
  );

  // Maintenance events (from maintenance_agenda)
  for (const event of maintenanceEvents || []) {
    const startTime = event.start_time || '08:00:00';
    const endTime = event.end_time || event.start_time || '09:00:00';
    events.push({
      id: `maintenance-${event.id}`,
      title: event.title || event.vehicle_registration || 'Intervention',
      start: `${event.event_date}T${startTime}`,
      end: `${event.event_date}T${endTime}`,
      type: 'maintenance',
      vehicleId: event.vehicle_id || null,
      vehicleRegistration: event.vehicle_registration || null,
      vehicleBrand: null,
      vehicleModel: null,
      urgent: false,
      overdue: false,
      maintenanceId: event.maintenance_id || null,
      eventType: event.event_type || null,
      status: event.status || null,
      garageName: event.garage_name || null,
      controlDate: null,
      vehicleType: null,
    });
  }

  // RDV depuis maintenance_records (non couverts par maintenance_agenda)
  for (const r of rdvRecords || []) {
    if (existingMaintenanceIds.has(r.id)) continue;
    const rdvTime = (r.rdv_time as string | null) || '08:00:00';
    const [hh, mm, ss] = rdvTime.split(':').map(Number);
    const endHour = (hh + 2) % 24;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss || 0).padStart(2, '0')}`;
    const vehicle = r.vehicles as { registration_number: string | null; brand: string | null; model: string | null; type: string | null } | null;
    const rdvDate = r.rdv_date as string;
    events.push({
      id: `rdv-${r.id}`,
      title: `${vehicle?.registration_number ?? 'Véhicule'} — ${(r.description as string | null)?.slice(0, 40) ?? 'RDV'}`,
      start: `${rdvDate}T${rdvTime}`,
      end: `${rdvDate}T${endTime}`,
      type: 'maintenance',
      vehicleId: (r.vehicle_id as string | null) || null,
      vehicleRegistration: vehicle?.registration_number || null,
      vehicleBrand: vehicle?.brand || null,
      vehicleModel: vehicle?.model || null,
      urgent: false,
      overdue: false,
      maintenanceId: r.id as string,
      eventType: 'RDV_GARAGE',
      status: (r.status as string | null) || null,
      garageName: (r.garage_name as string | null) || null,
      controlDate: null,
      vehicleType: vehicle?.type || null,
    });
  }

  // Echéances réglementaires (CT / tachy / ATP) — filtrées sur la fenêtre
  const addDeadlineEvent = (
    vehicle: any,
    eventTypeLabel: 'ct' | 'tachy' | 'atp',
    expiryDate: string | null,
    controlDate: string | null,
    label: string
  ) => {
    if (!expiryDate) return;
    const expiry = parseISO(expiryDate);
    if (isBefore(expiry, startWindow) || isBefore(endWindow, expiry)) return;
    const overdue = isBefore(expiry, now);
    const urgent = !overdue && isBefore(expiry, urgencyThreshold);

    events.push({
      id: `${eventTypeLabel}-${vehicle.id}`,
      title: `${label} — ${vehicle.registration_number}`,
      start: `${expiryDate}T00:00:00`,
      end: `${expiryDate}T23:59:59`,
      type: eventTypeLabel,
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registration_number,
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      urgent,
      overdue,
      maintenanceId: null,
      eventType: eventTypeLabel,
      status: overdue ? 'OVERDUE' : urgent ? 'URGENT' : 'SCHEDULED',
      garageName: null,
      controlDate,
      vehicleType: vehicle.type,
    });
  };

  for (const vehicle of vehicles || []) {
    addDeadlineEvent(vehicle, 'ct', vehicle.technical_control_expiry, vehicle.technical_control_date, 'CT');
    addDeadlineEvent(vehicle, 'tachy', vehicle.tachy_control_expiry, vehicle.tachy_control_date, 'Tachygraphe');
    addDeadlineEvent(vehicle, 'atp', vehicle.atp_expiry, vehicle.atp_date, 'ATP');
  }

  // Filtre type final (côté serveur, après dédoublonnage)
  const filtered = typeFilter ? events.filter((e) => e.type === typeFilter) : events;
  // Tri chronologique pour faciliter la consommation ORIA
  filtered.sort((a, b) => a.start.localeCompare(b.start));

  return apiSuccess(
    filtered,
    { total: filtered.length, page: 1, per_page: filtered.length },
    rateLimitHeaders
  );
}
