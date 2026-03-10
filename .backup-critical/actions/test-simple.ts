'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// Action SIMPLIFIÉE avec bonne gestion de l'auth
export async function getTestData() {
  try {
    // 1. Client avec cookies (pour récupérer la session)
    const supabaseClient = await createClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Utilisateur non connecté',
        debug: { userError }
      };
    }
    
    // 2. Client admin (pour bypass RLS)
    const supabaseAdmin = createAdminClient();
    
    // 3. Récupérer l'utilisateur avec son company_id
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, company_id')
      .eq('id', user.id)
      .single();
    
    // 4. Récupérer les véhicules avec ce company_id
    const userCompanyId = userData?.company_id;
    
    const { data: vehicles, error: vErr } = await supabaseAdmin
      .from('vehicles')
      .select('id, company_id, registration_number, status')
      .eq('company_id', userCompanyId || '');
    
    return {
      success: true,
      user: {
        sessionUserId: user.id,
        dbUserId: userData?.id,
        email: userData?.email,
        companyId: userCompanyId,
        dbError: dbError?.message
      },
      vehicles: {
        count: vehicles?.length || 0,
        data: vehicles,
        error: vErr?.message
      }
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message
    };
  }
}
