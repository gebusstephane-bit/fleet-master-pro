import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Utiliser le client admin pour contourner RLS
    const supabase = createAdminClient();
    
    // Récupérer toutes les prédictions
    const { data: predictions, error } = await supabase
      .from('ai_predictions')
      .select('vehicle_id, failure_probability, urgency_level, predicted_failure_type, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Garder seulement la dernière prédiction par véhicule
    const latestByVehicle: Record<string, {
      vehicle_id: string;
      failure_probability: number;
      urgency_level: string;
      predicted_failure_type: string;
    }> = {};

    predictions?.forEach((p: any) => {
      if (!latestByVehicle[p.vehicle_id]) {
        latestByVehicle[p.vehicle_id] = p;
      }
    });

    return NextResponse.json({ 
      predictions: latestByVehicle,
      count: Object.keys(latestByVehicle).length
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: (error as Error).message },
      { status: 500 }
    );
  }
}
