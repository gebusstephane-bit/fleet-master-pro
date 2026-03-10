import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/maintenance-predictions/reset
 * Marque une prédiction comme "ok" immédiatement après qu'une intervention a été créée.
 * La prédiction sera recalculée proprement lors du prochain cron.
 */
export async function POST(request: NextRequest) {
  try {
    const { vehicleId, ruleId } = await request.json()

    if (!vehicleId || !ruleId) {
      return NextResponse.json({ error: 'vehicleId et ruleId sont requis' }, { status: 400 })
    }

    const supabase = await createClient()

    // Vérification auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Invalider la prédiction en cache (RLS garantit l'isolation par company)
    await supabase
      .from('maintenance_predictions')
      .update({
        status: 'ok',
        alert_sent_at: null,
        calculated_at: new Date().toISOString(),
      })
      .eq('vehicle_id', vehicleId)
      .eq('rule_id', ruleId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
