import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createAdminClient();
  
  // Test 1: Tous les véhicules
  const { data: allVehicles, error: vehError } = await supabase
    .from('vehicles')
    .select('id, company_id, registration_number, status');
  
  // Test 2: Tous les users avec leur company
  const { data: allUsers, error: userError } = await supabase
    .from('profiles')
    .select('id, email, company_id');
  
  // Test 3: Toutes les companies
  const { data: allCompanies, error: compError } = await supabase
    .from('companies')
    .select('id, name');
  
  return NextResponse.json({
    success: true,
    vehicles: {
      count: allVehicles?.length || 0,
      data: allVehicles || [],
      error: vehError?.message
    },
    users: {
      count: allUsers?.length || 0,
      data: allUsers || [],
      error: userError?.message
    },
    companies: {
      count: allCompanies?.length || 0,
      data: allCompanies || [],
      error: compError?.message
    }
  });
}
