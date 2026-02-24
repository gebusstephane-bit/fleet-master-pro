/**
 * POST /api/push/unsubscribe
 * Supprime une PushSubscription de l'utilisateur authentifié.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deletePushSubscription } from '@/lib/push/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Body
    const body = await req.json();
    const { endpoint } = body ?? {};

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Payload invalide : endpoint requis' },
        { status: 400 }
      );
    }

    await deletePushSubscription(user.id, endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/push/unsubscribe] Error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
