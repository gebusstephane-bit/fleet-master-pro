-- ============================================
-- FLEETMASTER AI PREDICT - DONNÉES SYNTHÉTIQUES
-- 1000 lignes de données d'entraînement réalistes
-- ============================================

-- ============================================
-- 1. GÉNÉRER TÉLÉMÉTRIE SYNTHÉTIQUE (1000 lignes)
-- ============================================

DO $$
DECLARE
    v_vehicle_id UUID;
    v_record_date TIMESTAMP WITH TIME ZONE;
    v_mileage INTEGER;
    v_engine_hours DECIMAL(10,2);
    v_vehicle_age INTEGER;
    v_base_fault_rate DECIMAL(5,4);
    v_harsh_driving_factor DECIMAL(5,2);
    i INTEGER;
    v_batch_size INTEGER := 1000;
BEGIN
    -- Supprimer données existantes si nécessaire
    -- DELETE FROM vehicle_telemetry WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Pour chaque véhicule existant, générer des données
    FOR v_vehicle_id IN (SELECT id FROM vehicles LIMIT 20) LOOP
        
        -- Récupérer l'âge et le kilométrage du véhicule
        SELECT 
            EXTRACT(DAY FROM AGE(NOW(), COALESCE(created_at, NOW())))::INTEGER / 365,
            COALESCE(mileage, 50000)
        INTO v_vehicle_age, v_mileage
        FROM vehicles 
        WHERE id = v_vehicle_id;
        
        -- Facteurs de risque basés sur l'âge
        v_base_fault_rate := LEAST(0.1 + (v_vehicle_age * 0.05), 0.5); -- 10% + 5% par an
        v_harsh_driving_factor := random() * 2 + 0.5; -- 0.5 à 2.5
        v_engine_hours := v_mileage / 40.0; -- Estimation: 40 km/h moyenne
        
        -- Générer 50 enregistrements par véhicule
        FOR i IN 1..50 LOOP
            v_record_date := NOW() - (i * INTERVAL '1 day') * (random() * 2 + 0.5);
            
            INSERT INTO vehicle_telemetry (
                vehicle_id,
                mileage,
                engine_hours,
                rpm_avg,
                coolant_temp,
                oil_pressure,
                harsh_braking_count,
                harsh_acceleration_count,
                idle_time_minutes,
                avg_speed,
                max_speed,
                fault_codes,
                battery_voltage,
                recorded_at,
                weather_condition,
                temperature_c
            ) VALUES (
                v_vehicle_id,
                v_mileage + (i * (50 + random() * 100)::INTEGER), -- Augmentation progressive
                v_engine_hours + (i * 2),
                (1500 + random() * 1500)::INTEGER, -- RPM 1500-3000
                CASE 
                    WHEN random() < v_base_fault_rate THEN 95 + random() * 25 -- Surchauffe possible
                    ELSE 85 + random() * 10 -- Normal 85-95°C
                END,
                CASE 
                    WHEN random() < v_base_fault_rate * 0.5 THEN 20 + random() * 15 -- Pression basse
                    ELSE 35 + random() * 15 -- Normal 35-50 PSI
                END,
                (random() * 5 * v_harsh_driving_factor)::INTEGER, -- Freinages brusques
                (random() * 4 * v_harsh_driving_factor)::INTEGER, -- Accélérations brusques
                (random() * 120)::INTEGER, -- Temps ralenti (0-120 min)
                40 + random() * 60, -- Vitesse moyenne 40-100 km/h
                80 + random() * 80, -- Vitesse max 80-160 km/h
                CASE 
                    WHEN random() < v_base_fault_rate THEN 
                        jsonb_build_array(
                            jsonb_build_object('code', 'P0' || (100 + (random() * 899)::INTEGER), 'severity', 'medium'),
                            CASE WHEN random() < 0.3 THEN jsonb_build_object('code', 'P0' || (100 + (random() * 899)::INTEGER), 'severity', 'high') END
                        )
                    ELSE '[]'::JSONB
                END,
                CASE 
                    WHEN random() < v_base_fault_rate THEN 11.5 + random() * 1.5 -- Batterie faible
                    ELSE 12.4 + random() * 1.2 -- Normal 12.4-13.6V
                END,
                v_record_date,
                (ARRAY['sunny', 'rainy', 'cloudy', 'snowy'])[1 + (random() * 3)::INTEGER],
                -5 + random() * 35 -- Température -5°C à 30°C
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 2. GÉNÉRER PRÉDICTIONS SYNTHÉTIQUES AVEC FEEDBACK
-- ============================================

DO $$
DECLARE
    v_vehicle_id UUID;
    v_prediction_id UUID;
    v_failure_prob DECIMAL(5,4);
    v_prediction_date TIMESTAMP WITH TIME ZONE;
    v_actual_failure BOOLEAN;
    i INTEGER;
BEGIN
    FOR v_vehicle_id IN (SELECT id FROM vehicles LIMIT 20) LOOP
        FOR i IN 1..10 LOOP
            v_prediction_date := NOW() - (i * INTERVAL '7 days');
            
            -- Probabilité basée sur facteurs réalistes
            v_failure_prob := 0.1 + random() * 0.6; -- 10% à 70%
            
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
                actual_failure_occurred,
                feedback_provided_at,
                feedback_notes,
                model_version,
                created_at
            ) VALUES (
                v_vehicle_id,
                v_failure_prob,
                (ARRAY[
                    'Freinage',
                    'Moteur - Surchauffe',
                    'Batterie - Décharge',
                    'Transmission',
                    'Suspension',
                    'Courroie distribution'
                ])[1 + (random() * 5)::INTEGER],
                0.7 + random() * 0.25, -- Confiance 70-95%
                7 + (random() * 7)::INTEGER, -- Horizon 7-14 jours
                jsonb_build_object(
                    'vehicle_age_years', 2 + random() * 8,
                    'days_since_last_maintenance', 60 + (random() * 200)::INTEGER,
                    'harsh_braking_30d', (random() * 50)::INTEGER,
                    'fault_code_count_30d', (random() * 5)::INTEGER
                ),
                CASE 
                    WHEN v_failure_prob > 0.6 THEN 'Planifier maintenance urgente sous 7 jours'
                    WHEN v_failure_prob > 0.4 THEN 'Inspection recommandée sous 14 jours'
                    ELSE 'Continuer surveillance, maintenance routine'
                END,
                CASE 
                    WHEN v_failure_prob > 0.6 THEN 2500 + random() * 2000
                    WHEN v_failure_prob > 0.4 THEN 800 + random() * 1200
                    ELSE 200 + random() * 500
                END,
                CASE 
                    WHEN v_failure_prob > 0.6 THEN 'high'
                    WHEN v_failure_prob > 0.4 THEN 'medium'
                    ELSE 'low'
                END,
                CASE 
                    WHEN random() < v_failure_prob THEN true
                    WHEN random() < 0.3 THEN false
                    ELSE NULL -- Pas encore de feedback
                END,
                CASE 
                    WHEN random() < 0.7 THEN v_prediction_date + INTERVAL '14 days'
                    ELSE NULL
                END,
                CASE 
                    WHEN random() < 0.7 THEN 'Prédiction confirmée par événement réel'
                    ELSE NULL
                END,
                '1.0.0',
                v_prediction_date
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 3. CALCULER ET STOCKER MÉTRIQUES MODÈLE
-- ============================================

INSERT INTO model_training_history (
    model_version,
    training_date,
    accuracy,
    precision_score,
    recall,
    f1_score,
    auc_roc,
    training_samples_count,
    features_count,
    hyperparameters
)
SELECT 
    '1.0.0',
    NOW() - INTERVAL '30 days',
    0.82, -- 82% accuracy
    0.78, -- 78% precision
    0.85, -- 85% recall
    0.81, -- F1 score
    0.87, -- AUC-ROC
    (SELECT COUNT(*) FROM ai_predictions WHERE model_version = '1.0.0'),
    10,
    jsonb_build_object(
        'algorithm', 'RandomForest',
        'n_estimators', 100,
        'max_depth', 15,
        'min_samples_split', 10,
        'class_weight', 'balanced'
    );

-- ============================================
-- 4. STATISTIQUES
-- ============================================

SELECT 
    'Télémétrie générée' as metric,
    COUNT(*)::TEXT as value
FROM vehicle_telemetry
UNION ALL
SELECT 
    'Prédictions générées',
    COUNT(*)::TEXT
FROM ai_predictions
UNION ALL
SELECT 
    'Taux feedback',
    ROUND(100.0 * COUNT(*) FILTER (WHERE actual_failure_occurred IS NOT NULL) / COUNT(*), 1)::TEXT || '%'
FROM ai_predictions;
