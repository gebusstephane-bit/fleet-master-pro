export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createVehicleSchema, validateSchema } from '@/lib/validation/schemas';

/**
 * GET /api/vehicles - Récupérer tous les véhicules de l'entreprise
 */
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
    console.error('[API Vehicles] GET error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * POST /api/vehicles - Créer un nouveau véhicule
 * 
 * Validation Zod implémentée pour sécuriser les données entrantes
 */
export async function POST(request: NextRequest) {
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

    // Parser le body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      );
    }

    // Validation Zod des données entrantes
    const validation = validateSchema(createVehicleSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Insérer le véhicule avec les données validées
    const { data: vehicle, error } = await (supabase as any)
      .from('vehicles')
      .insert({
        ...(validation.data as any),
        company_id: profile.company_id,
        // Normaliser l'immatriculation (majuscules, sans espaces)
        registration_number: (validation.data as any).registration_number
          .toUpperCase()
          .replace(/\s+/g, '-'),
      } as any)
      .select()
      .single();

    if (error) {
      // Gérer les erreurs de contrainte unique
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Un véhicule avec cette immatriculation existe déjà' },
          { status: 409 }
        );
      }
      
      console.error('[API Vehicles] POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    console.error('[API Vehicles] POST error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/vehicles - Mettre à jour un véhicule
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du véhicule requis' }, { status: 400 });
    }

    // Validation partielle des données
    const { createVehicleSchema } = await import('@/lib/validation/schemas');
    const partialSchema = createVehicleSchema.partial();
    const validation = validateSchema(partialSchema, updates);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      );
    }

    const { data: vehicle, error } = await (supabase as any)
      .from('vehicles')
      .update(validation.data as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error('[API Vehicles] PATCH error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/vehicles - Supprimer un véhicule
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'ID depuis les search params ou le body
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du véhicule requis' }, { status: 400 });
    }

    // Validation UUID
    const { uuidSchema } = await import('@/lib/validation/schemas');
    const uuidValidation = uuidSchema.safeParse(id);
    
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Vehicles] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
