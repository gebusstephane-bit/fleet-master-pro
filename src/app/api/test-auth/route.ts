export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Test 1: Créer client
    console.log('Creating client...');
    const supabase = await createClient();
    
    // Test 2: Get user
    console.log('Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json({ error: 'Auth error', details: userError.message }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }
    
    // Test 3: Admin client
    console.log('Creating admin client...');
    const adminClient = createAdminClient();
    
    // Test 4: Query profile
    console.log('Querying profile...');
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
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
    console.error('Test auth error:', error);
    return NextResponse.json({ 
      error: 'Exception', 
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
