import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/vehicles - Récupérer tous les véhicules de l'entreprise
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le company_id de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    // Récupérer les véhicules
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vehicles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/vehicles - Créer un nouveau véhicule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
