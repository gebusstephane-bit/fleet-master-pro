import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { USER_ROLE } from '@/constants/enums';
import { TREAD_DEPTH_THRESHOLDS } from '@/lib/axle-configurations';
import { logger } from '@/lib/logger';

// ----------------------------------------------------------------
// CRON : Alertes pneumatiques — quotidien à 06h00
// Auth : x-cron-secret header ou ?secret= query param
// ----------------------------------------------------------------

const DEDUP_DAYS = 7; // ne pas ré-alerter si notif émise il y a moins de 7 jours

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-vercel-cron-secret') ||
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // ----------------------------------------------------------------
    // 1. Récupérer tous les montages actifs dont le pneu est à surveiller
    // ----------------------------------------------------------------
    const { data: mountings, error: mountErr } = await supabase
      .from('tire_mountings')
      .select(`
        id,
        vehicle_id,
        company_id,
        axle_position,
        tire_id,
        tires!inner (
          brand,
          dimensions,
          tread_depth_current
        )
      `)
      .is('unmounted_date', null);

    if (mountErr) throw mountErr;

    if (!mountings || mountings.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Filter locally for depth alerts
    const alertMountings = mountings.filter(m => {
      const depth = (m.tires as any)?.tread_depth_current;
      return depth != null && depth <= TREAD_DEPTH_THRESHOLDS.warning;
    });

    if (alertMountings.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // ----------------------------------------------------------------
    // 2. Pour chaque véhicule avec alertes — récupérer les utilisateurs concernés
    // ----------------------------------------------------------------
    const vehicleIds = Array.from(new Set(alertMountings.map(m => m.vehicle_id)));

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, company_id')
      .in('id', vehicleIds);

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const companyIds = Array.from(new Set(vehicles.map(v => v.company_id)));

    // Récupérer les profils admins/managers des entreprises concernées
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, company_id')
      .in('company_id', companyIds)
      .in('role', [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR]);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // ----------------------------------------------------------------
    // 3. Dedup check — éviter de respammer (fenêtre 7 jours)
    // ----------------------------------------------------------------
    const dedupSince = new Date();
    dedupSince.setDate(dedupSince.getDate() - DEDUP_DAYS);

    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('user_id, data')
      .eq('type', 'tire_alert')
      .gte('created_at', dedupSince.toISOString());

    const recentKeys = new Set(
      (recentNotifs ?? []).map(n => {
        const d = n.data as { mounting_id?: string } | null;
        return `${n.user_id}:${d?.mounting_id ?? ''}`;
      })
    );

    // ----------------------------------------------------------------
    // 4. Générer les notifications
    // ----------------------------------------------------------------
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const notificationsToInsert: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
      priority: 'low' | 'normal' | 'high' | 'critical';
      data: Record<string, unknown>;
    }> = [];

    for (const mounting of alertMountings) {
      const tire  = mounting.tires as any;
      const depth = tire?.tread_depth_current as number;
      const veh   = vehicleMap[mounting.vehicle_id];
      if (!veh) continue;

      const isCritical = depth <= TREAD_DEPTH_THRESHOLDS.critical;
      const priority: 'critical' | 'high' = isCritical ? 'critical' : 'high';

      const title = isCritical
        ? `Pneu critique — ${veh.registration_number}`
        : `Pneu à surveiller — ${veh.registration_number}`;

      const message = `Position ${mounting.axle_position} · ${tire?.brand ?? ''} — profondeur ${depth} mm${
        isCritical ? ' — Remplacement immédiat requis' : ''
      }`;

      const usersForCompany = profiles.filter(p => p.company_id === veh.company_id);

      for (const profile of usersForCompany) {
        const dedupKey = `${profile.id}:${mounting.id}`;
        if (recentKeys.has(dedupKey)) continue;

        notificationsToInsert.push({
          user_id:  profile.id,
          type:     'tire_alert',
          title,
          message,
          link:     `/vehicles/${mounting.vehicle_id}?tab=tires`,
          priority,
          data: {
            mounting_id:  mounting.id,
            tire_id:      mounting.tire_id,
            vehicle_id:   mounting.vehicle_id,
            tread_depth:  depth,
            axle_position: mounting.axle_position,
          },
        });
      }
    }

    // ----------------------------------------------------------------
    // 5. Insert notifications (batch)
    // ----------------------------------------------------------------
    if (notificationsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('notifications')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(notificationsToInsert as any);

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      ok: true,
      alertMountings: alertMountings.length,
      notificationsSent: notificationsToInsert.length,
    });
  } catch (err) {
    logger.error('[cron/tire-alerts]', err);
    return NextResponse.json(
      { error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
