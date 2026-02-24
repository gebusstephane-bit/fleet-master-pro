/**
 * API Route de test - Dashboard data
 * Retourne les données dashboard pour la company de l'utilisateur connecté
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withDebugProtection } from '@/lib/api/debug-protection';

export const GET = withDebugProtection(async () => {
  const supabase = await createClient();

  // Récupérer l'utilisateur et sa company
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

  // Compter les données de la company (respecte RLS)
  const { count: vehiclesCount, error: vError } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { count: driversCount, error: dError } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { count: maintCount, error: mError } = await supabase
    .from('maintenance_records')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { count: inspectCount, error: iError } = await supabase
    .from('inspections')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  return NextResponse.json({
    companyId,
    data: {
      vehicles: vehiclesCount || 0,
      drivers: driversCount || 0,
      maintenances: maintCount || 0,
      inspections: inspectCount || 0,
    },
    errors: {
      vehicles: vError?.message,
      drivers: dError?.message,
      maintenances: mError?.message,
      inspections: iError?.message,
    },
  });
});
