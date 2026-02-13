-- ============================================
-- DASHBOARD FINAL - Vérification et création des tables manquantes
-- ============================================

-- ============================================
-- 1. TABLE ACTIVITY_LOGS (pour le feed d'activité)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    action_type VARCHAR(50) NOT NULL,  -- VEHICLE_CREATED, DRIVER_CREATED, etc.
    entity_type VARCHAR(50),           -- vehicle, driver, maintenance, etc.
    entity_id UUID,
    entity_name VARCHAR(255),
    description TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour performances
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Activer RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture par membres de l'entreprise
DROP POLICY IF EXISTS "Activity logs viewable by company" ON activity_logs;
CREATE POLICY "Activity logs viewable by company"
ON activity_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 2. VÉRIFICATION DES COLONNES AI_PREDICTIONS
-- ============================================

-- Ajouter urgency_level si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_predictions' AND column_name = 'urgency_level'
    ) THEN
        ALTER TABLE ai_predictions ADD COLUMN urgency_level TEXT 
        CHECK (urgency_level IN ('low', 'medium', 'high', 'critical'))
        DEFAULT 'medium';
    END IF;
END $$;

-- Ajouter prediction_horizon_days si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_predictions' AND column_name = 'prediction_horizon_days'
    ) THEN
        ALTER TABLE ai_predictions ADD COLUMN prediction_horizon_days INTEGER DEFAULT 7;
    END IF;
END $$;

-- ============================================
-- 3. FONCTION: Log activité automatique
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
    p_company_id UUID,
    p_user_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_entity_name VARCHAR,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        company_id, user_id, action_type, entity_type, entity_id, 
        entity_name, description, metadata
    ) VALUES (
        p_company_id, p_user_id, p_action_type, p_entity_type, p_entity_id,
        p_entity_name, p_description, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGERS POUR LOG AUTOMATIQUE
-- ============================================

-- Log création véhicule
CREATE OR REPLACE FUNCTION tr_log_vehicle_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Récupérer l'utilisateur courant
    v_user_id := auth.uid();
    v_company_id := NEW.company_id;
    
    IF v_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        PERFORM log_activity(
            v_company_id, v_user_id, 'VEHICLE_CREATED', 'vehicle',
            NEW.id, NEW.registration_number || ' (' || NEW.brand || ' ' || NEW.model || ')',
            'Nouveau véhicule ajouté à la flotte'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_vehicle_created_log ON vehicles;
CREATE TRIGGER tr_vehicle_created_log
    AFTER INSERT ON vehicles
    FOR EACH ROW EXECUTE FUNCTION tr_log_vehicle_created();

-- Log création chauffeur
CREATE OR REPLACE FUNCTION tr_log_driver_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_company_id := NEW.company_id;
    
    IF v_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        PERFORM log_activity(
            v_company_id, v_user_id, 'DRIVER_CREATED', 'driver',
            NEW.id, NEW.first_name || ' ' || NEW.last_name,
            'Nouveau chauffeur ajouté'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_driver_created_log ON drivers;
CREATE TRIGGER tr_driver_created_log
    AFTER INSERT ON drivers
    FOR EACH ROW EXECUTE FUNCTION tr_log_driver_created();

-- Log création maintenance
CREATE OR REPLACE FUNCTION tr_log_maintenance_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_vehicle_name TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Récupérer company_id depuis le véhicule
    SELECT company_id, registration_number || ' (' || brand || ' ' || model || ')'
    INTO v_company_id, v_vehicle_name
    FROM vehicles WHERE id = NEW.vehicle_id;
    
    IF v_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        PERFORM log_activity(
            v_company_id, v_user_id, 'MAINTENANCE_CREATED', 'maintenance',
            NEW.id, v_vehicle_name,
            'Maintenance planifiée: ' || COALESCE(NEW.type, 'Entretien')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_maintenance_created_log ON maintenance_records;
CREATE TRIGGER tr_maintenance_created_log
    AFTER INSERT ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION tr_log_maintenance_created();

-- Log création inspection
CREATE OR REPLACE FUNCTION tr_log_inspection_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_vehicle_name TEXT;
BEGIN
    v_user_id := auth.uid();
    v_company_id := NEW.company_id;
    
    -- Récupérer nom véhicule
    SELECT registration_number || ' (' || brand || ' ' || model || ')'
    INTO v_vehicle_name
    FROM vehicles WHERE id = NEW.vehicle_id;
    
    IF v_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        PERFORM log_activity(
            v_company_id, v_user_id, 'INSPECTION_CREATED', 'inspection',
            NEW.id, v_vehicle_name,
            'Inspection créée: ' || COALESCE(NEW.inspection_type, 'Inspection')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inspection_created_log ON inspections;
CREATE TRIGGER tr_inspection_created_log
    AFTER INSERT ON inspections
    FOR EACH ROW EXECUTE FUNCTION tr_log_inspection_created();

-- ============================================
-- 5. DONNÉES DE TEST POUR AI_PREDICTIONS (si vide)
-- ============================================
DO $$
DECLARE
    v_vehicle RECORD;
    v_count INTEGER;
BEGIN
    -- Vérifier s'il y a des données
    SELECT COUNT(*) INTO v_count FROM ai_predictions;
    
    IF v_count = 0 THEN
        -- Générer des prédictions pour quelques véhicules
        FOR v_vehicle IN 
            SELECT id, company_id, brand, model 
            FROM vehicles 
            LIMIT 5
        LOOP
            INSERT INTO ai_predictions (
                vehicle_id, 
                failure_probability, 
                predicted_failure_type,
                confidence_score,
                prediction_horizon_days,
                urgency_level,
                recommended_action,
                model_version
            ) VALUES (
                v_vehicle.id,
                0.3 + (random() * 0.6),  -- Probabilité entre 30% et 90%
                CASE (random() * 4)::int
                    WHEN 0 THEN 'Usure freins'
                    WHEN 1 THEN 'Problème moteur'
                    WHEN 2 THEN 'Perte de liquide'
                    WHEN 3 THEN 'Batterie faible'
                    ELSE 'Suspension usée'
                END,
                0.7 + (random() * 0.25),
                7 + (random() * 7)::int,
                CASE 
                    WHEN random() > 0.7 THEN 'critical'
                    WHEN random() > 0.4 THEN 'high'
                    ELSE 'medium'
                END,
                'Intervention recommandée sous 7-14 jours',
                '1.0.0'
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 'Dashboard final setup terminé!' as status;
