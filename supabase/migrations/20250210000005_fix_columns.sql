-- ============================================
-- FIX COLUMNS - Adapter aux colonnes réelles
-- ============================================

-- ============================================
-- 1. FIX RLS RECURSION SUR PROFILES
-- ============================================

DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: view own or same company" ON profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON profiles;

-- Policy simple sans récursion
CREATE POLICY "Profiles: view own or same company"
ON profiles FOR SELECT
USING (
    id = auth.uid() 
    OR company_id IN (
        SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Profiles: update own"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- ============================================
-- 2. VÉRIFIER LES COLONNES DE MAINTENANCE_RECORDS
-- ============================================

-- Ajouter les colonnes manquantes si besoin
DO $$
BEGIN
    -- mileage_at_service
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'mileage_at_service'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN mileage_at_service INTEGER;
    END IF;
    
    -- description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'description'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN description TEXT;
    END IF;
    
    -- cost
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'cost'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN cost DECIMAL(10, 2);
    END IF;
    
    -- performed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'performed_by'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN performed_by VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- 3. DONNÉES DE TEST - UTILISANT scheduled_date
-- ============================================

-- Maintenances de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
    v_count INTEGER;
BEGIN
    -- Compter les maintenances existantes
    SELECT COUNT(*) INTO v_count FROM maintenance_records;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Maintenances déjà existantes: %', v_count;
    ELSE
        RAISE NOTICE 'Aucune maintenance, création de données de test...';
    END IF;
    
    -- Récupérer un company_id
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE 'Aucun véhicule trouvé';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Company ID: %', v_company_id;
    
    -- Créer 3 maintenances
    FOR v_vehicle IN 
        SELECT id FROM vehicles WHERE company_id = v_company_id LIMIT 3
    LOOP
        BEGIN
            INSERT INTO maintenance_records (
                vehicle_id,
                company_id,
                type,
                description,
                cost,
                mileage_at_service,
                status,
                scheduled_date
            ) VALUES (
                v_vehicle.id,
                v_company_id,
                'routine',
                'Vidange et révision périodique',
                150.00,
                50000,
                'scheduled',
                CURRENT_DATE + INTERVAL '5 days'
            );
            
            RAISE NOTICE '✓ Maintenance créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Erreur: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Inspections de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM inspections;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Inspections déjà existantes: %', v_count;
        RETURN;
    END IF;
    
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RETURN;
    END IF;
    
    FOR v_vehicle IN 
        SELECT id FROM vehicles WHERE company_id = v_company_id LIMIT 2
    LOOP
        BEGIN
            INSERT INTO inspections (
                company_id,
                vehicle_id,
                inspection_type,
                status,
                notes
            ) VALUES (
                v_company_id,
                v_vehicle.id,
                'État général',
                'pending',
                'Inspection à réaliser'
            );
            
            RAISE NOTICE '✓ Inspection créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Erreur inspection: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Prédictions IA de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM ai_predictions;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Prédictions déjà existantes: %', v_count;
        RETURN;
    END IF;
    
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RETURN;
    END IF;
    
    FOR v_vehicle IN 
        SELECT id FROM vehicles WHERE company_id = v_company_id LIMIT 3
    LOOP
        BEGIN
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
                0.4 + (random() * 0.4),
                CASE (random() * 3)::int
                    WHEN 0 THEN 'Usure freins'
                    WHEN 1 THEN 'Batterie faible'
                    WHEN 2 THEN 'Perte de liquide'
                    ELSE 'Suspension usée'
                END,
                0.75,
                7,
                'high',
                'Intervention recommandée sous 7 jours',
                '1.0.0'
            );
            
            RAISE NOTICE '✓ Prédiction créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Erreur prédiction: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 4. TABLE ACTIVITY_LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity logs: view by company" ON activity_logs;
CREATE POLICY "Activity logs: view by company"
ON activity_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Log de test
DO $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    SELECT id INTO v_user_id FROM profiles WHERE company_id = v_company_id LIMIT 1;
    
    IF v_company_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO activity_logs (company_id, user_id, action_type, entity_type, entity_name, description)
        VALUES (v_company_id, v_user_id, 'SYSTEM', 'dashboard', 'Setup', 'Configuration dashboard terminée')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- 5. VÉRIFICATION FINALE
-- ============================================

SELECT 
    'Véhicules' as table_name, 
    COUNT(*) as count 
FROM vehicles
UNION ALL
SELECT 
    'Maintenances', 
    COUNT(*) 
FROM maintenance_records
UNION ALL
SELECT 
    'Inspections', 
    COUNT(*) 
FROM inspections
UNION ALL
SELECT 
    'Prédictions IA', 
    COUNT(*) 
FROM ai_predictions
UNION ALL
SELECT 
    'Activity Logs', 
    COUNT(*) 
FROM activity_logs;
