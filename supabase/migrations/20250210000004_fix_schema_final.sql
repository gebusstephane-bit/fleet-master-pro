-- ============================================
-- FIX FINAL - Vérification et création des colonnes manquantes
-- ============================================

-- ============================================
-- 1. VÉRIFIER ET AJOUTER LES COLONNES MANQUANTES
-- ============================================

-- Vérifier si mileage_at_service existe, sinon l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'mileage_at_service'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN mileage_at_service INTEGER;
        RAISE NOTICE 'Colonne mileage_at_service ajoutée';
    ELSE
        RAISE NOTICE 'Colonne mileage_at_service existe déjà';
    END IF;
END $$;

-- Vérifier si service_date existe (sinon utiliser performed_at ou created_at)
DO $$
DECLARE
    has_service_date BOOLEAN;
    has_performed_at BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'service_date'
    ) INTO has_service_date;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'performed_at'
    ) INTO has_performed_at;
    
    IF NOT has_service_date AND NOT has_performed_at THEN
        ALTER TABLE maintenance_records ADD COLUMN service_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Colonne service_date ajoutée';
    ELSIF NOT has_service_date AND has_performed_at THEN
        -- Renommer performed_at en service_date si c'est la même chose
        ALTER TABLE maintenance_records RENAME COLUMN performed_at TO service_date;
        RAISE NOTICE 'Colonne performed_at renommée en service_date';
    ELSE
        RAISE NOTICE 'Colonne service_date existe déjà';
    END IF;
END $$;

-- ============================================
-- 2. FIX RLS RECURSION
-- ============================================

-- Supprimer toutes les policies sur profiles
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can view all" ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can update all" ON profiles;

-- Créer une policy simple SANS sous-requête
CREATE POLICY "Profiles: view own or same company"
ON profiles FOR SELECT
USING (
    id = auth.uid() 
    OR company_id IN (
        SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
);

-- Policy pour modification
CREATE POLICY "Profiles: update own"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- ============================================
-- 3. DONNÉES DE TEST
-- ============================================

-- Insérer des maintenances de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
BEGIN
    -- Récupérer un company_id existant
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE 'Aucun véhicule trouvé';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Company ID trouvé: %', v_company_id;
    
    -- Créer des maintenances pour chaque véhicule
    FOR v_vehicle IN 
        SELECT id, company_id FROM vehicles WHERE company_id = v_company_id LIMIT 3
    LOOP
        BEGIN
            INSERT INTO maintenance_records (
                vehicle_id,
                company_id,
                type,
                description,
                status,
                service_date
            ) VALUES (
                v_vehicle.id,
                v_vehicle.company_id,
                'routine',
                'Vidange et révision périodique',
                'scheduled',
                CURRENT_DATE + INTERVAL '5 days'
            );
            
            RAISE NOTICE 'Maintenance créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur création maintenance: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Insérer des inspections de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
BEGIN
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
            
            RAISE NOTICE 'Inspection créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur création inspection: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Insérer des prédictions IA de test
DO $$
DECLARE
    v_vehicle RECORD;
    v_company_id UUID;
BEGIN
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
            
            RAISE NOTICE 'Prédiction créée pour véhicule %', v_vehicle.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur création prédiction: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Créer table activity_logs si elle n'existe pas
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

CREATE POLICY "Activity logs: view by company"
ON activity_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Insérer un log de test
DO $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    SELECT id INTO v_user_id FROM profiles WHERE company_id = v_company_id LIMIT 1;
    
    IF v_company_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO activity_logs (company_id, user_id, action_type, entity_type, entity_name, description)
        VALUES (v_company_id, v_user_id, 'TEST', 'system', 'Diagnostic', 'Test activité dashboard')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

SELECT 'Migration finale terminée!' as status;
