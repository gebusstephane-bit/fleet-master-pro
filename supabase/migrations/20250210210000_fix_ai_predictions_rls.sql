-- ============================================
-- FIX: Politiques RLS pour ai_predictions
-- Permettre aux utilisateurs d'insérer des prédictions via trigger
-- ============================================

-- Activer RLS sur ai_predictions si pas déjà fait
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view predictions for their company vehicles" ON ai_predictions;
DROP POLICY IF EXISTS "Users can insert predictions for their company vehicles" ON ai_predictions;
DROP POLICY IF EXISTS "Users can update predictions for their company vehicles" ON ai_predictions;
DROP POLICY IF EXISTS "Service role can manage all predictions" ON ai_predictions;

-- Politique SELECT: Les utilisateurs peuvent voir les prédictions des véhicules de leur entreprise
CREATE POLICY "Users can view predictions for their company vehicles"
    ON ai_predictions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vehicles v
            JOIN profiles p ON p.company_id = v.company_id
            WHERE v.id = ai_predictions.vehicle_id
            AND p.id = auth.uid()
        )
    );

-- Politique INSERT: Permettre l'insertion via trigger (bypass RLS pour les fonctions)
-- Note: Les triggers s'exécutent avec SECURITY DEFINER par défaut
CREATE POLICY "Users can insert predictions for their company vehicles"
    ON ai_predictions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vehicles v
            JOIN profiles p ON p.company_id = v.company_id
            WHERE v.id = ai_predictions.vehicle_id
            AND p.id = auth.uid()
        )
    );

-- Politique UPDATE: Les utilisateurs peuvent mettre à jour les prédictions de leur entreprise
CREATE POLICY "Users can update predictions for their company vehicles"
    ON ai_predictions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM vehicles v
            JOIN profiles p ON p.company_id = v.company_id
            WHERE v.id = ai_predictions.vehicle_id
            AND p.id = auth.uid()
        )
    );

-- Créer une fonction sécurisée qui bypass RLS pour le trigger
CREATE OR REPLACE FUNCTION create_initial_prediction()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer une prédiction initiale pour le nouveau véhicule
    INSERT INTO ai_predictions (
        vehicle_id,
        failure_probability,
        predicted_failure_type,
        confidence_score,
        prediction_horizon_days,
        features_used,
        recommended_action,
        estimated_roi,
        urgency_level,
        risk_factors,
        model_version
    ) VALUES (
        NEW.id,
        0.25 + random() * 0.30, -- Risque faible à moyen (25-55%)
        (ARRAY['Freinage', 'Pneumatiques', 'Vidange'])[1 + (random() * 2)::INTEGER],
        0.70 + random() * 0.15, -- Confiance 70-85%
        14, -- Horizon 14 jours
        jsonb_build_object(
            'vehicle_age_years', EXTRACT(YEAR FROM AGE(NOW(), COALESCE(NEW.created_at, NOW()))) + 
                                 EXTRACT(MONTH FROM AGE(NOW(), COALESCE(NEW.created_at, NOW()))) / 12.0,
            'current_mileage', COALESCE(NEW.mileage, 0),
            'days_since_last_maintenance', 0,
            'harsh_braking_30d', 0,
            'fault_code_count_30d', 0
        ),
        'Maintenance préventive : effectuer un contrôle initial sous 14 jours',
        500 + (random() * 1000)::INTEGER,
        'low',
        ARRAY['Nouveau véhicule - surveillance initiale'],
        '1.0.0'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS tr_create_prediction_on_vehicle ON vehicles;

CREATE TRIGGER tr_create_prediction_on_vehicle
    AFTER INSERT ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_prediction();

SELECT 'Politiques RLS ai_predictions corrigées!' as status;
