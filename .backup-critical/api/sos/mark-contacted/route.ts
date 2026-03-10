/**
 * API Route: /api/sos/mark-contacted
 * Marque une recherche d'urgence comme "contactée"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

    const { searchId, phone } = await request.json();

    if (!searchId) {
      return NextResponse.json({ error: 'searchId requis' }, { status: 400 });
    }

    const { error } = await (adminClient as any)
      .from('emergency_searches')
      .update({
        contacted: true as any,
        contacted_at: new Date().toISOString()
      } as any)
      .eq('id', searchId as any)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Mark Contacted] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Mark Contacted] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}
