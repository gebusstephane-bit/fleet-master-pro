-- ============================================
-- FLEETMASTER AI PREDICT - SCHÉMA BASE DE DONNÉES
-- Prédiction de pannes par IA
-- ============================================

-- ============================================
-- 1. TABLE TÉLÉMÉTRIE VÉHICULE
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- Métriques moteur
    mileage INTEGER,                    -- Kilométrage total
    engine_hours DECIMAL(10,2),         -- Heures moteur
    rpm_avg INTEGER,                    -- RPM moyen
    coolant_temp DECIMAL(5,2),          -- Température liquide refroidissement
    oil_pressure DECIMAL(5,2),          -- Pression huile
    
    -- Métriques conduite
    harsh_braking_count INTEGER DEFAULT 0,      -- Freinages brusques
    harsh_acceleration_count INTEGER DEFAULT 0, -- Accélérations brusques
    idle_time_minutes INTEGER DEFAULT 0,        -- Temps au ralenti
    avg_speed DECIMAL(5,2),                     -- Vitesse moyenne
    max_speed DECIMAL(5,2),                     -- Vitesse max
    
    -- Données OBD/codes défaut
    fault_codes JSONB DEFAULT '[]',     -- Codes erreur OBD-II
    battery_voltage DECIMAL(5,2),       -- Voltage batterie
    
    -- Météo/Contexte
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    weather_condition TEXT,             -- sunny, rainy, snowy, etc.
    temperature_c DECIMAL(5,2),         -- Température extérieure
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle ON vehicle_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded ON vehicle_telemetry(recorded_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON vehicle_telemetry(vehicle_id, recorded_at DESC);

-- ============================================
-- 2. TABLE PRÉDICTIONS IA
-- ============================================
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- Résultat prédiction
    failure_probability DECIMAL(5,4) NOT NULL,  -- 0.0000 à 1.0000
    predicted_failure_type TEXT,                -- Type de panne prédite
    confidence_score DECIMAL(5,4),              -- Confiance du modèle
    
    -- Détails
    prediction_horizon_days INTEGER,            -- Jours dans le futur
    features_used JSONB,                        -- Features utilisées pour la prédiction
    
    -- Recommandations
    recommended_action TEXT,                    -- Action recommandée
    estimated_roi DECIMAL(10,2),                -- ROI estimé de l'intervention
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Feedback
    actual_failure_occurred BOOLEAN,            -- Une panne est-elle survenue ?
    feedback_provided_at TIMESTAMP WITH TIME ZONE,
    feedback_notes TEXT,
    model_version TEXT DEFAULT '1.0.0',         -- Version du modèle utilisé
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_vehicle ON ai_predictions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON ai_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_probability ON ai_predictions(failure_probability DESC) WHERE failure_probability > 0.5;
CREATE INDEX IF NOT EXISTS idx_predictions_feedback ON ai_predictions(actual_failure_occurred) WHERE actual_failure_occurred IS NULL;

-- ============================================
-- 3. TABLE HISTORIQUE ENTRAÎNEMENT MODÈLE
-- ============================================
CREATE TABLE IF NOT EXISTS model_training_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_version TEXT NOT NULL,
    training_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métriques performance
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    auc_roc DECIMAL(5,4),
    
    -- Détails
    training_samples_count INTEGER,
    features_count INTEGER,
    hyperparameters JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. RLS POLICIES
-- ============================================
ALTER TABLE vehicle_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_history ENABLE ROW LEVEL SECURITY;

-- Telemetry: visible par les membres de l'entreprise
DROP POLICY IF EXISTS "Telemetry viewable by company" ON vehicle_telemetry;
CREATE POLICY "Telemetry viewable by company" ON vehicle_telemetry
FOR SELECT USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Predictions: visible par les membres de l'entreprise
DROP POLICY IF EXISTS "Predictions viewable by company" ON ai_predictions;
CREATE POLICY "Predictions viewable by company" ON ai_predictions
FOR SELECT USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Predictions: feedback uniquement par owner
DROP POLICY IF EXISTS "Predictions feedback by company" ON ai_predictions;
CREATE POLICY "Predictions feedback by company" ON ai_predictions
FOR UPDATE USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Model history: visible par tous (lecture seule)
DROP POLICY IF EXISTS "Model history viewable by all" ON model_training_history;
CREATE POLICY "Model history viewable by all" ON model_training_history
FOR SELECT USING (true);

-- ============================================
-- 5. FONCTION: Générer features pour prédiction
-- ============================================
CREATE OR REPLACE FUNCTION get_vehicle_prediction_features(p_vehicle_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_features JSONB;
    v_vehicle RECORD;
    v_last_maintenance RECORD;
    v_telemetry_stats RECORD;
    v_fault_count INTEGER;
    v_days_since_maintenance INTEGER;
BEGIN
    -- Infos véhicule
    SELECT * INTO v_vehicle FROM vehicles WHERE id = p_vehicle_id;
    
    -- Dernière maintenance
    SELECT * INTO v_last_maintenance 
    FROM maintenance_records 
    WHERE vehicle_id = p_vehicle_id 
    AND status IN ('TERMINEE', 'completed')
    ORDER BY COALESCE(completed_at, requested_at) DESC 
    LIMIT 1;
    
    -- Stats télémetrie (30 derniers jours)
    SELECT 
        COUNT(*) as record_count,
        AVG(harsh_braking_count) as avg_harsh_braking,
        AVG(harsh_acceleration_count) as avg_harsh_acceleration,
        AVG(coolant_temp) as avg_coolant_temp,
        AVG(battery_voltage) as avg_battery_voltage,
        MAX(mileage) - MIN(mileage) as mileage_delta
    INTO v_telemetry_stats
    FROM vehicle_telemetry
    WHERE vehicle_id = p_vehicle_id
    AND recorded_at > NOW() - INTERVAL '30 days';
    
    -- Nombre de codes défaut
    SELECT COUNT(*) INTO v_fault_count
    FROM vehicle_telemetry
    WHERE vehicle_id = p_vehicle_id
    AND recorded_at > NOW() - INTERVAL '30 days'
    AND jsonb_array_length(fault_codes) > 0;
    
    -- Jours depuis dernière maintenance
    IF v_last_maintenance IS NOT NULL THEN
        v_days_since_maintenance := CURRENT_DATE - COALESCE(v_last_maintenance.completed_at::date, v_last_maintenance.requested_at::date);
    ELSE
        v_days_since_maintenance := 365; -- Valeur par défaut haute si jamais entretenu
    END IF;
    
    -- Construire le JSON de features
    v_features := jsonb_build_object(
        'vehicle_age_years', EXTRACT(YEAR FROM AGE(NOW(), COALESCE(v_vehicle.created_at, NOW()))) + 
                             EXTRACT(MONTH FROM AGE(NOW(), COALESCE(v_vehicle.created_at, NOW()))) / 12.0,
        'current_mileage', v_vehicle.mileage,
        'days_since_last_maintenance', v_days_since_maintenance,
        'last_maintenance_type', v_last_maintenance.type,
        'harsh_braking_30d', COALESCE(v_telemetry_stats.avg_harsh_braking, 0),
        'harsh_acceleration_30d', COALESCE(v_telemetry_stats.avg_harsh_acceleration, 0),
        'avg_coolant_temp', COALESCE(v_telemetry_stats.avg_coolant_temp, 90),
        'avg_battery_voltage', COALESCE(v_telemetry_stats.avg_battery_voltage, 12.6),
        'mileage_last_30d', COALESCE(v_telemetry_stats.mileage_delta, 0),
        'fault_code_count_30d', v_fault_count,
        'telemetry_records_30d', COALESCE(v_telemetry_stats.record_count, 0)
    );
    
    RETURN v_features;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGER: Auto-générer prédiction quand nouvelle télémétrie
-- ============================================
CREATE OR REPLACE FUNCTION trigger_prediction_on_telemetry()
RETURNS TRIGGER AS $$
BEGIN
    -- Si conditions réunies (télémétrie significative), déclencher prédiction
    -- Note: La prédiction réelle est faite par Edge Function, ici on log juste
    IF NEW.mileage IS NOT NULL AND NEW.engine_hours IS NOT NULL THEN
        -- Insertion dans une queue ou notification (à implémenter)
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_telemetry_prediction ON vehicle_telemetry;
CREATE TRIGGER tr_telemetry_prediction
    AFTER INSERT ON vehicle_telemetry
    FOR EACH ROW
    EXECUTE FUNCTION trigger_prediction_on_telemetry();

SELECT 'Schéma AI Predict créé avec succès!' as status;
