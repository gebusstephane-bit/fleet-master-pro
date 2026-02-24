import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration sécurisée via variables d'environnement
const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  // Vérification du secret
  const authHeader = request.headers.get('Authorization');
  
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[CRON PREDICTIVE] Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Initialisation Supabase avec Service Role (bypass RLS)
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    let createdCount = 0;
    let errorsCount = 0;

    // Récupérer les companies actives
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .not('subscription_status', 'in', '("cancelled","expired")');

    if (companyError) throw companyError;

    // Traitement par company
    for (const company of companies || []) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, company_id')
        .eq('company_id', company.id)
        .eq('status', 'active');

      for (const vehicle of vehicles || []) {
        try {
          // Vérifier s'il existe déjà une alerte active
          const { data: existing } = await supabase
            .from('predictive_alerts')
            .select('id')
            .eq('vehicle_id', vehicle.id)
            .eq('status', 'active')
            .maybeSingle();

          if (existing) continue;

          // Récupérer 2 dernières inspections
          const { data: inspections } = await supabase
            .from('vehicle_inspections')
            .select('id, score, tires_condition, created_at')
            .eq('vehicle_id', vehicle.id)
            .eq('company_id', company.id)
            .not('score', 'is', null)
            .order('created_at', { ascending: false })
            .limit(2);

          if (!inspections || inspections.length < 2) continue;

          const [current, previous] = inspections;
          const daysDiff = (new Date(current.created_at).getTime() - new Date(previous.created_at).getTime()) / (1000 * 3600 * 24);
          
          if (daysDiff < 1) continue;

          const scoreDiff = (previous.score || 0) - (current.score || 0);
          const degradationSpeed = scoreDiff / daysDiff;

          if (degradationSpeed <= 0) continue; // Stable ou amélioration

          const daysUntil = Math.floor((current.score - 70) / degradationSpeed);
          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + Math.max(1, daysUntil));

          // Déterminer urgence
          let urgencyLevel = 'surveillance';
          let urgencyScore = 0.3;
          
          if (current.score < 70) {
            urgencyLevel = 'intervention_immediate';
            urgencyScore = 0.95;
          } else if (daysUntil <= 3) {
            urgencyLevel = 'controle_urgent';
            urgencyScore = 0.80;
          } else if (daysUntil <= 14) {
            urgencyLevel = 'controle_recommande';
            urgencyScore = 0.60;
          }

          // Détection composant
          let component = 'Général';
          try {
            const currentTires = JSON.parse(current.tires_condition || '{}');
            const previousTires = JSON.parse(previous.tires_condition || '{}');
            for (const pos of ['front_left', 'front_right', 'rear_left', 'rear_right']) {
              if (previousTires[pos]?.wear === 'OK' && currentTires[pos]?.wear !== 'OK') {
                component = 'Pneumatiques';
                break;
              }
            }
          } catch {}

          // Insertion
          const { error: insertError } = await supabase
            .from('predictive_alerts')
            .insert({
              company_id: company.id,
              vehicle_id: vehicle.id,
              calculated_at: new Date().toISOString(),
              current_score: current.score,
              previous_score: previous.score,
              degradation_speed: Math.round(degradationSpeed * 100) / 100,
              days_until_critical: Math.max(0, daysUntil),
              predicted_control_date: predictedDate.toISOString().split('T')[0],
              urgency_score: urgencyScore,
              urgency_level: urgencyLevel,
              component_concerned: component,
              reasoning: `Score ${previous.score}→${current.score} en ${Math.round(daysDiff)}j`,
              linked_inspection_id: current.id,
              status: 'active',
            });

          if (insertError) {
            console.error(`[CRON] Insert error for ${vehicle.id}:`, insertError);
            errorsCount++;
          } else {
            createdCount++;
          }

        } catch (err) {
          console.error(`[CRON] Error processing vehicle ${vehicle.id}:`, err);
          errorsCount++;
        }
      }
    }

    console.log(`[CRON PREDICTIVE] Created: ${createdCount}, Errors: ${errorsCount}`);
    
    return NextResponse.json({
      success: true,
      alerts_created: createdCount,
      errors: errorsCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CRON PREDICTIVE] Critical error:', error);
    return NextResponse.json(
      { error: 'Internal processing error' },
      { status: 500 }
    );
  }
}

// Optionnel : permettre aussi GET pour test manuel simple
export async function GET() {
  return NextResponse.json({ status: 'Predictive cron endpoint active. Use POST with Authorization header.' });
}