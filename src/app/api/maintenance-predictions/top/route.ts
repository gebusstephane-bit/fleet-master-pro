import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/maintenance-predictions/top
 * Retourne les 5 prédictions les plus urgentes pour la company de l'utilisateur courant.
 * Lit depuis la table cache `maintenance_predictions` (alimentée par le cron quotidien).
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Récupère le company_id de l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ predictions: [] })

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (!profile?.company_id) return NextResponse.json({ predictions: [] })

    const { data: rows } = await supabase
      .from('maintenance_predictions')
      .select(`
        vehicle_id,
        rule_id,
        current_km,
        estimated_due_km,
        estimated_due_date,
        km_until_due,
        days_until_due,
        status,
        priority,
        last_maintenance_date,
        last_maintenance_km,
        vehicles ( registration_number, brand, model ),
        maintenance_rules ( name, category )
      `)
      .eq('company_id', profile.company_id)
      .in('status', ['overdue', 'due', 'upcoming'])
      .order('status')
      .order('priority')
      .limit(5)

    if (!rows?.length) return NextResponse.json({ predictions: [] })

    const predictions = rows.map((p: any) => ({
      vehicleId: p.vehicle_id,
      vehicleName: `${p.vehicles?.registration_number?.toUpperCase() ?? '?'} — ${p.vehicles?.brand ?? ''} ${p.vehicles?.model ?? ''}`,
      ruleId: p.rule_id,
      ruleName: p.maintenance_rules?.name ?? '',
      category: p.maintenance_rules?.category ?? '',
      priority: p.priority,
      lastMaintenanceDate: p.last_maintenance_date ?? null,
      lastMaintenanceKm: p.last_maintenance_km ?? null,
      currentKm: p.current_km,
      estimatedDueDate: p.estimated_due_date ?? null,
      estimatedDueKm: p.estimated_due_km ?? null,
      kmUntilDue: p.km_until_due ?? null,
      daysUntilDue: p.days_until_due ?? null,
      usagePercent: 0,
      status: p.status,
    }))

    return NextResponse.json({ predictions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
