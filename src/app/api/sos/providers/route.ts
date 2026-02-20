/**
 * API Route: /api/sos/providers
 * CRUD pour les prestataires SOS
 * 
 * Validation Zod implémentée pour sécuriser les données entrantes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { createSosProviderSchema, validateSchema, uuidSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Helper pour créer le client Supabase
 */
function createSupabaseClient(request: NextRequest) {
  return createServerClient(
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
}

/**
 * GET - Liste des prestataires
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: providers, error } = await adminClient
      .from('sos_providers')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ providers: providers || [] });
  } catch (error: any) {
    console.error('[SOS Providers] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Créer un prestataire
 * 
 * Validation Zod des données entrantes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Parser et valider le body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      );
    }

    // Validation Zod
    const validation = validateSchema(createSosProviderSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Insérer avec les données validées
    const { data, error } = await (adminClient as any)
      .from('sos_providers')
      .insert({
        user_id: user.id,
        name: validation.data.name.trim(),
        specialty: validation.data.specialty as any,
        phone_standard: validation.data.phone_standard.trim(),
        phone_24h: (validation.data.phone_24h as any)?.trim() || null,
        max_distance_km: validation.data.max_distance_km as any,
        city: (validation.data.city as any)?.trim() || null,
        address: (validation.data.address as any)?.trim() || null,
        is_active: validation.data.is_active as any,
        latitude: validation.data.latitude as any,
        longitude: validation.data.longitude as any,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ provider: data }, { status: 201 });
  } catch (error: any) {
    console.error('[SOS Providers] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH - Mettre à jour un prestataire
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du prestataire requis' }, { status: 400 });
    }

    // Validation UUID
    const uuidValidation = uuidSchema.safeParse(id);
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // Validation partielle des données
    const partialSchema = createSosProviderSchema.partial();
    const validation = validateSchema(partialSchema, updates);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      );
    }

    // Nettoyer les données avant mise à jour
    const cleanData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) cleanData.name = validation.data.name.trim();
    if (validation.data.specialty !== undefined) cleanData.specialty = validation.data.specialty;
    if (validation.data.phone_standard !== undefined) cleanData.phone_standard = validation.data.phone_standard.trim();
    if (validation.data.phone_24h !== undefined) cleanData.phone_24h = validation.data.phone_24h?.trim() || null;
    if (validation.data.max_distance_km !== undefined) cleanData.max_distance_km = validation.data.max_distance_km;
    if (validation.data.city !== undefined) cleanData.city = validation.data.city?.trim() || null;
    if (validation.data.address !== undefined) cleanData.address = validation.data.address?.trim() || null;
    if (validation.data.is_active !== undefined) cleanData.is_active = validation.data.is_active;
    if (validation.data.latitude !== undefined) cleanData.latitude = validation.data.latitude;
    if (validation.data.longitude !== undefined) cleanData.longitude = validation.data.longitude;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('sos_providers')
      .update(cleanData)
      .eq('id', id)
      .eq('user_id', user.id) // Sécurité: vérifier l'ownership
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prestataire non trouvé' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ provider: data });
  } catch (error: any) {
    console.error('[SOS Providers] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE - Supprimer un prestataire
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'ID depuis les search params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du prestataire requis' }, { status: 400 });
    }

    // Validation UUID
    const uuidValidation = uuidSchema.safeParse(id);
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('sos_providers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Sécurité: vérifier l'ownership

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SOS Providers] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
