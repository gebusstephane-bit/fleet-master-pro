export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { withDebugProtection } from '@/lib/api/debug-protection';
import { logger } from '@/lib/logger';

export const GET = withDebugProtection(async () => {
  try {
    // Test 1: Créer client
    logger.info('Creating client...');
    const supabase = await createClient();
    
    // Test 2: Get user
    logger.info('Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json({ error: 'Auth error', details: userError.message }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }
    
    // Test 3: Admin client
    logger.info('Creating admin client...');
    const adminClient = createAdminClient();
    
    // Test 4: Query profile (limité aux infos de base)
    logger.info('Querying profile...');
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, company_id')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile || null,
      profileError: profileError?.message || null,
    });
  } catch (error: any) {
    logger.error('Test auth error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
      error: 'Exception', 
      details: error.message,
    }, { status: 500 });
  }
});
