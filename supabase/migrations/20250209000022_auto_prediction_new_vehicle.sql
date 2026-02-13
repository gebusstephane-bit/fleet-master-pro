-- ============================================
-- TRIGGER: Créer une prédiction IA quand un véhicule est ajouté
-- ============================================

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
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS tr_create_prediction_on_vehicle ON vehicles;

-- Créer le trigger
CREATE TRIGGER tr_create_prediction_on_vehicle
    AFTER INSERT ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_prediction();

SELECT 'Trigger créé avec succès!' as status;
