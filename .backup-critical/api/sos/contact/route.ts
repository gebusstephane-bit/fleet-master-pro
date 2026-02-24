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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { providerId, emergencySearchId } = await request.json();

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Recuperer les informations du prestataire
    const { data: provider } = await adminClient
      .from('user_service_providers')
      .select('id, name, phone, is_active')
      .eq('id', providerId)
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!(provider as any).is_active) {
      return NextResponse.json(
        { error: 'Provider is not active' },
        { status: 400 }
      );
    }

    // Optionnel: Mettre a jour la recherche d'urgence avec le contact choisi
    if (emergencySearchId) {
      await (adminClient as any)
        .from('emergency_searches' as any)
        .update({ 
          recommended_provider_id: providerId as any,
          status: 'contacted' as any,
          contacted_at: new Date().toISOString()
        } as any)
        .eq('id', emergencySearchId)
        .eq('user_id', user.id);
    }

    // Retourner les informations pour l'appel
    return NextResponse.json({
      success: true,
      provider: {
        id: (provider as any).id,
        name: (provider as any).name,
        phone: (provider as any).phone
      }
    });
  } catch (error: any) {
    console.error('Error in POST /api/sos/contact:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
