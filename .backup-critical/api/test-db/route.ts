export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withDebugProtection } from '@/lib/api/debug-protection';

export const GET = withDebugProtection(async () => {
  const supabase = await createClient();
  
  // Récupérer l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Récupérer la company_id de l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  const companyId = profile?.company_id;

  if (!companyId) {
    return NextResponse.json({ error: 'No company found for user' }, { status: 404 });
  }

  // Test avec RLS : uniquement les données de la company de l'utilisateur
  const { data: vehicles, error: vehError } = await supabase
    .from('vehicles')
    .select('id, company_id, registration_number, status')
    .eq('company_id', companyId)
    .limit(5);
  
  const { data: drivers, error: driverError } = await supabase
    .from('drivers')
    .select('id, first_name, last_name')
    .eq('company_id', companyId)
    .limit(5);

  return NextResponse.json({
    success: true,
    companyId,
    counts: {
      vehicles: vehicles?.length || 0,
      drivers: drivers?.length || 0,
    },
    errors: {
      vehicles: vehError?.message,
      drivers: driverError?.message,
    },
  });
});
