-- ============================================
-- FIX RLS RECURSION - Profiles
-- ============================================

-- 1. Supprimer toutes les policies sur profiles
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can view all" ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can update all" ON profiles;

-- 2. Recréer avec une policy simple SANS sous-requête récursive
-- Policy 1: Lecture - chaque utilisateur voit son propre profil
CREATE POLICY "Profiles: view own"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Policy 2: Lecture - les admins voient tous les profils de leur entreprise
-- Utilise une fonction sécurisée pour éviter la récursion
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE id = auth.uid();
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy utilisant la fonction
CREATE POLICY "Profiles: view company"
ON profiles FOR SELECT
USING (company_id = get_user_company_id());

-- Policy 3: Modification - chaque utilisateur modifie son propre profil
CREATE POLICY "Profiles: update own"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- ============================================
-- VÉRIFICATION DES COLONNES MAINTENANCE
-- ============================================

-- Vérifier quelles colonnes existent
DO $$
DECLARE
    has_service_date BOOLEAN;
    has_next_service_date BOOLEAN;
    has_rdv_date BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'service_date'
    ) INTO has_service_date;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'next_service_date'
    ) INTO has_next_service_date;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'rdv_date'
    ) INTO has_rdv_date;
    
    RAISE NOTICE 'Colonnes maintenance_records: service_date=%, next_service_date=%, rdv_date=%',
        has_service_date, has_next_service_date, has_rdv_date;
END $$;

-- ============================================
-- DONNÉES DE TEST
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
        RAISE NOTICE 'Aucun véhicule trouvé, impossible de créer des maintenances de test';
        RETURN;
    END IF;
    
    -- Créer des maintenances pour chaque véhicule
    FOR v_vehicle IN 
        SELECT id, company_id FROM vehicles WHERE company_id = v_company_id LIMIT 3
    LOOP
        INSERT INTO maintenance_records (
            vehicle_id,
            company_id,
            type,
            description,
            cost,
            mileage_at_service,
            status,
            service_date
        ) VALUES (
            v_vehicle.id,
            v_vehicle.company_id,
            'routine',
            'Vidange et révision périodique',
            150.00,
            50000,
            'scheduled',
            CURRENT_DATE + INTERVAL '5 days'
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Maintenance créée pour véhicule %', v_vehicle.id;
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
        RAISE NOTICE 'Aucun véhicule trouvé';
        RETURN;
    END IF;
    
    FOR v_vehicle IN 
        SELECT id FROM vehicles WHERE company_id = v_company_id LIMIT 2
    LOOP
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
        )
        ON CONFLICT DO NOTHING;
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
        RAISE NOTICE 'Aucun véhicule trouvé';
        RETURN;
    END IF;
    
    FOR v_vehicle IN 
        SELECT id FROM vehicles WHERE company_id = v_company_id LIMIT 3
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
            0.4 + (random() * 0.4),  -- 40-80%
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
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

SELECT 'Fix RLS et données de test terminés!' as status;
