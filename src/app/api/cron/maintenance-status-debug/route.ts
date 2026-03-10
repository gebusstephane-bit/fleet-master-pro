/**
 * CRON DEBUG — Diagnostic pour maintenance-status
 * Endpoint temporaire pour identifier le problème
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { VEHICLE_STATUS } from '@/constants/enums';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret');
  
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().split('T')[0];
  
  logger.info(`[DEBUG] Cron diagnostic date = ${todayStr}`);

  const diagnostics: any = {
    date: todayStr,
    tests: {}
  };

  // ============================================================
  // TEST 1 : Requête OR (actuelle)
  // ============================================================
  try {
    const { data: test1, error: err1 } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, rdv_date, scheduled_date, status')
      .or(`rdv_date.eq.${todayStr},scheduled_date.eq.${todayStr}`)
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']);
    
    diagnostics.tests.or_query = {
      success: !err1,
      count: test1?.length || 0,
      error: err1?.message,
      data: test1
    };
  } catch (e: any) {
    diagnostics.tests.or_query = { error: e.message };
  }

  // ============================================================
  // TEST 2 : Requête avec rdv_date seul
  // ============================================================
  try {
    const { data: test2, error: err2 } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, rdv_date, scheduled_date, status')
      .eq('rdv_date', todayStr)
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']);
    
    diagnostics.tests.rdv_date_only = {
      success: !err2,
      count: test2?.length || 0,
      error: err2?.message,
      data: test2
    };
  } catch (e: any) {
    diagnostics.tests.rdv_date_only = { error: e.message };
  }

  // ============================================================
  // TEST 3 : Requête avec scheduled_date seul
  // ============================================================
  try {
    const { data: test3, error: err3 } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, rdv_date, scheduled_date, status')
      .eq('scheduled_date', todayStr)
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS']);
    
    diagnostics.tests.scheduled_date_only = {
      success: !err3,
      count: test3?.length || 0,
      error: err3?.message,
      data: test3
    };
  } catch (e: any) {
    diagnostics.tests.scheduled_date_only = { error: e.message };
  }

  // ============================================================
  // TEST 4 : Tous les records récents (sans filtre date)
  // ============================================================
  try {
    const { data: test4, error: err4 } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, rdv_date, scheduled_date, status, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    diagnostics.tests.recent_records = {
      success: !err4,
      count: test4?.length || 0,
      error: err4?.message,
      data: test4
    };
  } catch (e: any) {
    diagnostics.tests.recent_records = { error: e.message };
  }

  // ============================================================
  // TEST 5 : Vérifier les véhicules en maintenance dans vehicles
  // ============================================================
  try {
    const { data: test5, error: err5 } = await supabase
      .from('vehicles')
      .select('id, registration_number, status')
      .eq('status', VEHICLE_STATUS.EN_MAINTENANCE);
    
    diagnostics.tests.vehicles_in_maintenance = {
      success: !err5,
      count: test5?.length || 0,
      error: err5?.message,
      data: test5
    };
  } catch (e: any) {
    diagnostics.tests.vehicles_in_maintenance = { error: e.message };
  }

  logger.info('[DEBUG] Cron diagnostic results', diagnostics);

  return NextResponse.json({
    debug: true,
    timestamp: new Date().toISOString(),
    diagnostics
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
