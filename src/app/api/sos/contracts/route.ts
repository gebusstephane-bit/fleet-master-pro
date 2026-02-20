/**
 * API Route: /api/sos/contracts
 * CRUD pour les contrats d'urgence SOS
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Liste des contrats
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: contracts, error } = await adminClient
      .from('sos_emergency_contracts')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ contracts: contracts || [] });

  } catch (error: any) {
    console.error('[SOS Contracts] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Créer un contrat
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('sos_emergency_contracts')
      .insert({
        user_id: user.id,
        service_type: body.service_type,
        name: body.name,
        phone_number: body.phone_number,
        contract_ref: body.contract_ref,
        instructions: body.instructions,
        for_distance: body.for_distance || 'both',
        for_immobilized: body.for_immobilized ?? null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ contract: data });

  } catch (error: any) {
    console.error('[SOS Contracts] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
