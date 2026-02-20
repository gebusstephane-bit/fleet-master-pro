/**
 * Protection des routes API de debug
 * Ces routes ne doivent être accessibles qu'en développement et par le superadmin
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperadminEmail } from '@/lib/superadmin';

export interface DebugProtectionResult {
  allowed: boolean;
  response?: NextResponse;
  user?: { id: string; email: string };
}

/**
 * Vérifie si l'accès à une route de debug est autorisé
 * - Bloque en production (404)
 * - Nécessite authentification (401)
 * - Nécessite superadmin (403)
 */
export async function checkDebugAccess(): Promise<DebugProtectionResult> {
  // 1. Protection environnement : bloquer en production
  if (process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      response: new NextResponse('Not Found', { status: 404 }),
    };
  }

  // 2. Vérifier authentification
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // 3. Vérifier superadmin
  if (!isSuperadminEmail(user.email)) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Superadmin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    user: { id: user.id, email: user.email },
  };
}

/**
 * Helper pour wrapper une route API de debug
 * Usage : export const GET = withDebugProtection(async (request, user) => { ... })
 */
export function withDebugProtection(
  handler: (request: Request, user: { id: string; email: string }) => Promise<NextResponse>
) {
  return async function (request: Request): Promise<NextResponse> {
    const { allowed, response, user } = await checkDebugAccess();
    
    if (!allowed || !user) {
      return response!;
    }

    try {
      return await handler(request, user);
    } catch (error: any) {
      console.error('Debug route error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', details: error.message },
        { status: 500 }
      );
    }
  };
}
