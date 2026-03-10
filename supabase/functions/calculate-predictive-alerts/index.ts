/**
 * Edge Function : calculate-predictive-alerts
 *
 * Calcule les alertes prédictives par véhicule en comparant les 2 dernières
 * inspections. Appelée par un cron job Supabase quotidien (6h).
 *
 * SÉCURITÉ :
 * - Authentification par CRON_SECRET (Bearer token)
 * - Isolation stricte par company_id
 * - Service role key — bypass RLS, mais company_id vérifié manuellement
 * - Aucune donnée sensible loggée (pas d'immatriculation, pas de VIN)
 *
 * DÉPLOIEMENT :
 *   supabase functions deploy calculate-predictive-alerts
 *
 * CRON (Supabase Dashboard > Database > Cron Jobs) :
 *   Schedule : 0 6 * * *   (tous les jours à 6h UTC)
 *   Command  : SELECT net.http_post(
 *                url := 'https://<project>.supabase.co/functions/v1/calculate-predictive-alerts',
 *                headers := '{"Authorization": "Bearer <CRON_SECRET>"}',
 *                body := '{}'
 *              );
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================================
// Types
// ============================================================

interface Company {
  id: string;
}

interface Vehicle {
  id: string;
  year: number;
  category: string | null;
  company_id: string;
}

interface Inspection {
  id: string;
  vehicle_id: string;
  company_id: string;
  score: number | null;
  tires_condition: Record<string, { pressure: number | null; wear: string; damage: string | null }>;
  reported_defects: Array<{ category: string; description: string; severity: string }>;
  created_at: string;
  mileage: number;
}

interface Threshold {
  sensitivity_multiplier: number;
  custom_threshold_score: number;
}

interface AlertResult {
  vehicle: string;
  level: string;
}

// ============================================================
// Entrée principale
// ============================================================

Deno.serve(async (req: Request) => {
  // Authentification par CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Récupérer les companies actives (filtre sur subscription_status)
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .not('subscription_status', 'in', '("cancelled","expired")');

    if (companyError) {
      console.error('[PREDICTIVE] Failed to fetch companies:', companyError.code);
      return new Response(JSON.stringify({ error: 'Failed to fetch companies' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results: AlertResult[] = [];
    const errors: string[] = [];

    // Traitement par company — isolation garantie
    for (const company of (companies as Company[]) ?? []) {
      const companyId = company.id;

      // Véhicules actifs de cette company
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, year, category, company_id')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (vehicleError) {
        console.error(`[PREDICTIVE] vehicles fetch error (company: masked):`, vehicleError.code);
        continue;
      }

      for (const vehicle of (vehicles as Vehicle[]) ?? []) {
        try {
          // Vérifier s'il existe déjà une alerte ACTIVE pour ce véhicule
          // → Éviter les doublons
          const { data: existingAlert } = await supabase
            .from('predictive_alerts')
            .select('id')
            .eq('vehicle_id', vehicle.id)
            .eq('company_id', companyId)
            .eq('status', 'active')
            .maybeSingle();

          if (existingAlert) continue; // Alerte active déjà en cours

          // Récupérer les 2 dernières inspections de ce véhicule
          // Double vérification company_id pour l'isolation
          const { data: inspections, error: inspError } = await supabase
            .from('vehicle_inspections')
            .select('id, vehicle_id, company_id, score, tires_condition, reported_defects, created_at, mileage')
            .eq('vehicle_id', vehicle.id)
            .eq('company_id', companyId) // Isolation stricte
            .not('score', 'is', null)    // Score requis pour le calcul
            .order('created_at', { ascending: false })
            .limit(2);

          if (inspError) {
            console.error(`[PREDICTIVE] inspections fetch error:`, inspError.code);
            continue;
          }

          if (!inspections || inspections.length < 2) continue; // Pas assez d'historique

          const [current, previous] = inspections as Inspection[];
          const currentScore = current.score ?? 0;
          const previousScore = previous.score ?? 0;

          // Calcul de la dégradation par jour
          const daysDiff =
            (new Date(current.created_at).getTime() - new Date(previous.created_at).getTime()) /
            (1000 * 3600 * 24);

          if (daysDiff < 1) continue; // Inspections trop proches (évite division par zéro)

          const scoreDiff = previousScore - currentScore;
          const degradationSpeed = scoreDiff / daysDiff; // Points perdus / jour

          if (degradationSpeed <= 0) continue; // Stable ou amélioration — pas d'alerte

          // Récupérer le seuil personnalisé pour ce véhicule (ou valeurs par défaut)
          const { data: threshold } = await supabase
            .from('vehicle_predictive_thresholds')
            .select('sensitivity_multiplier, custom_threshold_score')
            .eq('vehicle_id', vehicle.id)
            .eq('company_id', companyId)
            .maybeSingle();

          const sensitivity = (threshold as Threshold | null)?.sensitivity_multiplier ?? 1.0;
          const criticalThreshold = (threshold as Threshold | null)?.custom_threshold_score ?? 70;

          // Jours avant d'atteindre le seuil critique
          const daysUntilCritical = Math.floor(
            (currentScore - criticalThreshold) / (degradationSpeed * sensitivity),
          );

          // Date prédite (minimum 1 jour dans le futur)
          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + Math.max(1, daysUntilCritical));

          // Détection du composant concerné à partir des données de l'inspection
          const { component, reasoning } = detectComponent(
            current,
            previous,
            currentScore,
            previousScore,
            Math.round(daysDiff),
          );

          // Niveau d'urgence basé sur le score actuel et le délai
          const { urgencyLevel, urgencyScore } = computeUrgency(
            currentScore,
            criticalThreshold,
            daysUntilCritical,
          );

          // Insertion de l'alerte (service_role bypass RLS)
          const { error: insertError } = await supabase
            .from('predictive_alerts')
            .insert({
              company_id: companyId,
              vehicle_id: vehicle.id,
              calculated_at: new Date().toISOString(),
              current_score: currentScore,
              previous_score: previousScore,
              degradation_speed: Math.round(degradationSpeed * 100) / 100,
              days_until_critical: Math.max(0, daysUntilCritical),
              predicted_control_date: predictedDate.toISOString().split('T')[0],
              urgency_score: urgencyScore,
              urgency_level: urgencyLevel,
              component_concerned: component,
              reasoning,
              linked_inspection_id: current.id,
              status: 'active',
            });

          if (insertError) {
            // Logguer le code d'erreur sans données sensibles
            console.error(`[PREDICTIVE] Insert failed:`, insertError.code, insertError.message);
            errors.push(`vehicle_error:${insertError.code}`);
          } else {
            results.push({ vehicle: 'masked', level: urgencyLevel });
          }
        } catch (vehicleErr) {
          // Continuer le traitement des autres véhicules
          console.error(`[PREDICTIVE] Vehicle processing error:`, (vehicleErr as Error).message);
          errors.push('vehicle_processing_error');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: results.length,
        errors: errors.length,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (criticalErr) {
    // Erreur critique — pas de données sensibles dans les logs
    console.error('[PREDICTIVE] Critical error:', (criticalErr as Error).message);
    return new Response(
      JSON.stringify({ error: 'Internal processing error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

// ============================================================
// Helpers algorithmiques
// ============================================================

/**
 * Détecte le composant probablement concerné à partir des données de l'inspection.
 * Priorité : Pneumatiques > Freinage (défauts) > Général
 */
function detectComponent(
  current: Inspection,
  previous: Inspection,
  currentScore: number,
  previousScore: number,
  daysDiff: number,
): { component: string; reasoning: string } {
  // Détection dégradation pneus
  try {
    const currentTires = current.tires_condition as Record<
      string,
      { pressure: number | null; wear: string; damage: string | null }
    >;
    const previousTires = previous.tires_condition as Record<
      string,
      { pressure: number | null; wear: string; damage: string | null }
    >;

    const tirePositions = ['front_left', 'front_right', 'rear_left', 'rear_right'];
    for (const pos of tirePositions) {
      const prevWear = previousTires?.[pos]?.wear;
      const currWear = currentTires?.[pos]?.wear;
      if (prevWear === 'OK' && currWear && currWear !== 'OK') {
        return {
          component: 'Pneumatiques',
          reasoning: `Changement d'état du pneu ${pos.replace('_', ' ')}: ${prevWear} → ${currWear}. Score passé de ${previousScore} à ${currentScore} en ${daysDiff} jours.`,
        };
      }
    }
  } catch {
    // Données pneus malformées — continuer
  }

  // Détection défauts mécaniques / freinage
  try {
    const defects = current.reported_defects as Array<{
      category: string;
      severity: string;
      description: string;
    }>;

    if (Array.isArray(defects) && defects.length > 0) {
      const brakeDefect = defects.find((d) =>
        d.category === 'MECANIQUE' && d.severity !== 'MINEUR',
      );
      if (brakeDefect) {
        return {
          component: 'Freinage',
          reasoning: `Défaut mécanique signalé lors de la dernière inspection. Score: ${currentScore}/100. Dégradation de ${previousScore - currentScore} pts en ${daysDiff} jours.`,
        };
      }

      const carrosserie = defects.find((d) => d.category === 'CARROSSERIE');
      if (carrosserie) {
        return {
          component: 'Carrosserie',
          reasoning: `Défaut carrosserie signalé. Score: ${currentScore}/100. Vérification recommandée.`,
        };
      }
    }
  } catch {
    // Défauts malformés — continuer
  }

  // Dégradation générale
  return {
    component: 'Général',
    reasoning: `Dégradation générale du score: ${previousScore} → ${currentScore} en ${daysDiff} jours (${((previousScore - currentScore) / daysDiff).toFixed(1)} pts/jour).`,
  };
}

/**
 * Détermine le niveau d'urgence en fonction du score actuel et du délai estimé.
 */
function computeUrgency(
  currentScore: number,
  criticalThreshold: number,
  daysUntilCritical: number,
): { urgencyLevel: string; urgencyScore: number } {
  if (currentScore < criticalThreshold) {
    return { urgencyLevel: 'intervention_immediate', urgencyScore: 0.95 };
  }
  if (daysUntilCritical <= 3) {
    return { urgencyLevel: 'controle_urgent', urgencyScore: 0.80 };
  }
  if (daysUntilCritical <= 14) {
    return { urgencyLevel: 'controle_recommande', urgencyScore: 0.60 };
  }
  return { urgencyLevel: 'surveillance', urgencyScore: 0.30 };
}
