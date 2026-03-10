/**
 * API Route : /api/sos/vehicles
 * Recupere tous les vehicules de l'utilisateur connecte pour le selecteur SOS
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    
    // Verifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Recuperer le profil pour avoir le company_id
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Profil ou entreprise non trouve' },
        { status: 404 }
      );
    }

    // Recuperer les vehicules de l'entreprise
    const { data: vehicles, error: vehiclesError } = await adminClient
      .from('vehicles')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .order('registration_number');

    // Debug: log toutes les colonnes du premier véhicule pour voir la structure
    if (vehicles && vehicles.length > 0) {
      console.log('SOS Vehicles - Structure:', Object.keys(vehicles[0]));
      console.log('SOS Vehicles - Premier véhicule:', vehicles[0]);
    }

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des vehicules' },
        { status: 500 }
      );
    }

    // Mapper pour le frontend avec detection PL/VL
    const mappedVehicles = vehicles?.map(v => {
      // La colonne type contient: POIDS_LOURD_FRIGO, POIDS_LOURD, VL, etc.
      const typeValue = (v.type || '').toString().toUpperCase();
      
      // POIDS_LOURD ou POIDS_LOURD_FRIGO = PL
      // VL ou VEHICULE_LEGER = VL
      const isPL = typeValue.includes('POIDS') || typeValue.includes('LOURD') || typeValue.includes('FRIGO');
      
      return {
        id: v.id,
        registration_number: v.registration_number,
        brand: v.brand,
        model: v.model,
        type: v.type,
        // Detection PL vs VL basée sur la colonne type
        vehicle_category: isPL ? 'PL' : 'VL',
        display_name: `${v.registration_number} - ${v.brand} ${v.model}`,
        current_position: v.current_latitude && v.current_longitude ? {
          lat: v.current_latitude,
          lng: v.current_longitude
        } : null
      };
    }) || [];

    return NextResponse.json({
      success: true,
      vehicles: mappedVehicles
    });

  } catch (error: any) {
    console.error('SOS vehicles API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
