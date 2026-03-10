import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Récupérer vehicleId depuis les query params
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId requis' },
        { status: 400 }
      );
    }

    // Récupérer dernière prédiction
    const { data: prediction, error } = await supabase
      .from('ai_predictions')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !prediction) {
      return NextResponse.json(
        { error: 'Aucune prédiction disponible' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
