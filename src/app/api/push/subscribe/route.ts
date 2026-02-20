/**
 * POST /api/push/subscribe
 * Enregistre une PushSubscription pour l'utilisateur authentifié.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertPushSubscription } from '@/lib/push/subscriptions';

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
    const { endpoint, keys } = body ?? {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Payload invalide : endpoint, keys.p256dh et keys.auth sont requis' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') ?? undefined;

    const row = await upsertPushSubscription(
      user.id,
      { endpoint, keys },
      userAgent
    );

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error('[/api/push/subscribe] Error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
