/**
 * API Route Debug - Dashboard Debug
 * Retourne les données pour debug (uniquement sa propre company)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withDebugProtection } from '@/lib/api/debug-protection';

export const GET = withDebugProtection(async () => {
  const supabase = await createClient();

  // Récupérer l'utilisateur
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  const companyId = profile?.company_id;

  if (!companyId) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 });
  }

  // Données filtrées par company_id (respecte RLS)
  const { data: maintenances, error: maintError } = await supabase
    .from('maintenance_records')
    .select('id, status, service_type, cost, service_date')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: inspections, error: inspectError } = await supabase
    .from('inspections')
    .select('id, status, inspection_date, vehicle_id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Statuts uniques
  const uniqueStatuses = Array.from(new Set(maintenances?.map(m => m.status) || []));

  return NextResponse.json({
    companyId,
    maintenances: {
      count: maintenances?.length || 0,
      error: maintError?.message,
      uniqueStatuses,
    },
    inspections: {
      count: inspections?.length || 0,
      error: inspectError?.message,
    },
  });
});
