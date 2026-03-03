import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  
  try {
    // Récupérer le véhicule HY-122-DS
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, registration_number, type, technical_control_date, tachy_control_date, mileage, created_at')
      .eq('registration_number', 'HY-122-DS')
      .single()

    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 })
    }

    // Récupérer toutes les prédictions pour ce véhicule
    const { data: predictions } = await supabase
      .from('maintenance_predictions')
      .select(`
        *,
        maintenance_rules(name, category, interval_months, interval_km)
      `)
      .eq('vehicle_id', vehicle.id)

    // Récupérer les maintenances records terminées
    const { data: maintenances } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .eq('status', 'TERMINEE')

    // Vérifier les règles pour POIDS_LOURD
    const { data: rules } = await supabase
      .from('maintenance_rules')
      .select('*')
      .eq('is_active', true)
      .contains('applicable_vehicle_types', ['POIDS_LOURD'])

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
        mileage: vehicle.mileage,
        technical_control_date: vehicle.technical_control_date,
        tachy_control_date: vehicle.tachy_control_date,
        created_at: vehicle.created_at,
      },
      predictions: predictions?.map(p => ({
        rule_name: p.maintenance_rules?.name,
        status: p.status,
        is_initialized: p.is_initialized,
        last_maintenance_date: p.last_maintenance_date,
        days_until_due: p.days_until_due,
      })),
      maintenances: maintenances?.map(m => ({
        description: m.description,
        status: m.status,
        completed_at: m.completed_at,
      })),
      rules: rules?.map(r => ({
        name: r.name,
        category: r.category,
        interval_months: r.interval_months,
        interval_km: r.interval_km,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
