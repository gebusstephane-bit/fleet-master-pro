import { NextRequest, NextResponse } from 'next/server';
import { getUserWithCompany, createClient } from '@/lib/supabase/server';
import { addDays, isBefore, parseISO } from 'date-fns';

export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserWithCompany();
    if (!user?.company_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const supabase = await createClient();

    // 1. Événements maintenance depuis agenda_with_details
    let query = (supabase as any)
      .from('agenda_with_details')
      .select('*')
      .eq('company_id', user.company_id);

    if (start) query = query.gte('event_date', start);
    if (end) query = query.lte('event_date', end);

    const { data: maintenanceEvents } = await query.order('event_date', { ascending: true });

    // 2. Véhicules actifs avec leurs échéances réglementaires
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, type, technical_control_expiry, technical_control_date, tachy_control_expiry, tachy_control_date, atp_expiry, atp_date')
      .eq('company_id', user.company_id)
      .eq('status', 'active');

    const now = new Date();
    const urgencyThreshold = addDays(now, 7);
    const events: UnifiedCalendarEvent[] = [];

    // Maintenance events
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
        overdue: event.status === 'CANCELLED' ? false : false,
        maintenanceId: event.maintenance_id || null,
        eventType: event.event_type || null,
        status: event.status || null,
        garageName: event.garage_name || null,
        controlDate: null,
        vehicleType: null,
      });
    }

    // Regulatory deadline events
    const addDeadlineEvent = (
      vehicle: NonNullable<typeof vehicles>[number],
      type: 'ct' | 'tachy' | 'atp',
      expiryDate: string | null,
      controlDate: string | null,
      label: string
    ) => {
      if (!expiryDate) return;
      const expiry = parseISO(expiryDate);
      const overdue = isBefore(expiry, now);
      const urgent = !overdue && isBefore(expiry, urgencyThreshold);

      events.push({
        id: `${type}-${vehicle.id}`,
        title: `${label} — ${vehicle.registration_number}`,
        start: `${expiryDate}T00:00:00`,
        end: `${expiryDate}T23:59:59`,
        type,
        vehicleId: vehicle.id,
        vehicleRegistration: vehicle.registration_number,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        urgent,
        overdue,
        maintenanceId: null,
        eventType: type,
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

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Erreur API calendar/events:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
