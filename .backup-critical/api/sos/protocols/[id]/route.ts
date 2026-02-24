/**
 * API Route: /api/sos/protocols/[id]
 * Suppression d'un protocole d'urgence
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const adminClient = createAdminClient();

    // Vérifier que le protocole appartient bien à l'utilisateur
    const { data: protocol } = await (adminClient as any)
      .from('emergency_protocols')
      .select('id')
      .eq('id', id as any)
      .eq('user_id', user.id)
      .single();

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocole non trouvé' },
        { status: 404 }
      );
    }

    const { error } = await (adminClient as any)
      .from('emergency_protocols')
      .delete()
      .eq('id', id as any)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Protocols] Erreur suppression:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Protocols] Exception:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}
