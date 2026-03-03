import { NextRequest, NextResponse } from 'next/server'
import { predictMaintenanceForVehicle } from '@/lib/maintenance-predictor'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer toutes les prédictions (pas seulement les actionable)
    // Le filtrage se fera côté client pour permettre d'afficher les maintenances réglementaires
    const predictions = await predictMaintenanceForVehicle(params.id, false)
    return NextResponse.json({ predictions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
