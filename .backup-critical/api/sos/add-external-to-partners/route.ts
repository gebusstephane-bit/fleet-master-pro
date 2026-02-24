/**
 * API Route: /api/sos/add-external-to-partners
 * Permet d'ajouter un garage trouvé via recherche externe (Niveau 2)
 * dans la liste des partenaires internes (Niveau 1)
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

    // Récupérer les données du garage externe
    const {
      name,
      address,
      city,
      postalCode,
      phone,
      email,
      lat,
      lng,
      vehicleBrands,
      specialties,
      isAuthorizedDealer
    } = await request.json();

    // Validation
    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: 'Données manquantes (name, address, phone requis)' },
        { status: 400 }
      );
    }

    // Vérifier si un partenaire avec ce nom existe déjà
    const { data: existing } = await adminClient
      .from('user_service_providers')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Un partenaire avec ce nom existe déjà' },
        { status: 409 }
      );
    }

    // Créer le nouveau partenaire
    const { data: partner, error } = await adminClient
      .from('user_service_providers')
      .insert({
        user_id: user.id,
        name,
        phone,
        email: email || null,
        address,
        city: city || extractCityFromAddress(address),
        postal_code: postalCode || null,
        lat: lat || null,
        lng: lng || null,
        vehicle_types_supported: ['PL', 'VL'], // Par défaut les deux
        vehicle_brands: vehicleBrands || [],
        specialties: specialties || ['general'],
        intervention_radius_km: 50,
        is_active: true,
        priority: isAuthorizedDealer ? 5 : 0 // Priorité plus haute si agréé
      })
      .select()
      .single();

    if (error) {
      console.error('[Add External Partner] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création: ' + error.message },
        { status: 500 }
      );
    }

    console.log('[Add External Partner] Ajouté:', partner.name);

    return NextResponse.json({
      success: true,
      message: 'Garage ajouté à vos partenaires',
      partner
    });

  } catch (error: any) {
    console.error('[Add External Partner] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}

function extractCityFromAddress(address: string): string {
  // Extraction simple: prendre la dernière partie après la virgule
  const parts = address.split(',').map(p => p.trim());
  return parts[parts.length - 1] || 'Inconnue';
}
