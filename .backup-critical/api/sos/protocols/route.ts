/**
 * API Route: /api/sos/protocols
 * Gestion des protocoles d'urgence (V3.1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Récupérer les protocoles de l'utilisateur
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

    const { data: protocols, error } = await (adminClient as any)
      .from('emergency_protocols')
      .select('*')
      .eq('user_id', user.id as any)
      .order('priority', { ascending: true });

    if (error) {
      console.error('[Protocols] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, protocols: protocols || [] });

  } catch (error: any) {
    console.error('[Protocols] Exception:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau protocole
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

    const adminClient = createAdminClient();

    const body = await request.json();
    const {
      name,
      priority,
      condition_type,
      condition_value,
      condition_reference,
      phone_number,
      instructions
    } = body;

    // Validation
    if (!name || !condition_type || !condition_value || !phone_number || !instructions) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const { data: protocol, error } = await (adminClient as any)
      .from('emergency_protocols')
      .insert({
        user_id: user.id,
        name,
        priority: priority || 0,
        condition_type,
        condition_value,
        condition_reference,
        action_type: 'call' as any,
        phone_number,
        instructions,
        is_active: true as any
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[Protocols] Erreur création:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, protocol });

  } catch (error: any) {
    console.error('[Protocols] Exception:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}
