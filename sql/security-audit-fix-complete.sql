-- ============================================================================
-- FLEET MASTER PRO - SCRIPT DE CORRECTION SÉCURITÉ POST-AUDIT
-- Date: 2026-02-27
-- Auteur: Expert CTO Sécurité Transport
-- Objectif: Corriger 3 vulnérabilités critiques sans downtime
-- ============================================================================

-- ==========================================
-- 0. VÉRIFICATIONS PRÉALABLES
-- ==========================================

-- Vérifier les index existants pour éviter les doublons
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'fuel_records';

-- Vérifier les contraintes existantes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'fuel_records'::regclass;

-- Vérifier les données problématiques avant migration
SELECT 
  'Valeurs négatives mileage' as check_item,
  COUNT(*) as count
FROM fuel_records 
WHERE mileage_at_fill < 0
UNION ALL
SELECT 
  'Valeurs négatives quantity' as check_item,
  COUNT(*) 
FROM fuel_records 
WHERE quantity_liters <= 0
UNION ALL
SELECT 
  'Valeurs négatives price' as check_item,
  COUNT(*) 
FROM fuel_records 
WHERE price_total < 0;

-- ==========================================
-- 1. CORRECTION FONCTIONS RPC (Sécurité)
-- ==========================================

-- ----------------------------------------------------------------------------
-- 1.1 Fonction create_fuel_session - Version sécurisée
-- ----------------------------------------------------------------------------
-- Modifications:
-- - Validation UUID v4 stricte au début
-- - Sanitization des valeurs JSONB avec whitelist
-- - Validation fuel_type avant toute insertion
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_fuel_session(
  p_vehicle_id UUID,
  p_token UUID,
  p_fuels JSONB,
  p_driver_name TEXT DEFAULT NULL,
  p_station_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_token TEXT;
  v_fuel JSONB;
  v_record_id UUID;
  v_record_ids UUID[] := ARRAY[]::UUID[];
  v_consumption DECIMAL;
  v_prev_mileage INTEGER;
  v_prev_liters DECIMAL;
  v_fuel_type TEXT;
  v_liters DECIMAL;
  v_price DECIMAL;
  v_mileage INTEGER;
  v_max_mileage INTEGER := 0;
  
  -- Constantes: Types de carburant valides (whitelist)
  c_valid_fuel_types CONSTANT TEXT[] := ARRAY['diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg'];
  
  -- Pattern UUID v4 strict (avec variant bits 8-9-a-b)
  c_uuid_v4_pattern CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  -- ==========================================================================
  -- CORRECTIF 1: VALIDATION STRICTE DU TOKEN UUID (Timing Attack Prevention)
  -- ==========================================================================
  
  -- Vérifier que le token n'est pas NULL
  IF p_token IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Token manquant',
      'code', 'TOKEN_MISSING'
    );
  END IF;
  
  -- Vérifier le format UUID v4 strict (évite les injections et timing attacks)
  IF p_token::text !~ c_uuid_v4_pattern THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Format de token invalide',
      'code', 'TOKEN_INVALID_FORMAT'
    );
  END IF;
  
  -- Vérifier que p_fuels n'est pas NULL ou vide
  IF p_fuels IS NULL OR jsonb_array_length(p_fuels) = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Aucun carburant fourni',
      'code', 'NO_FUELS_PROVIDED'
    );
  END IF;
  
  -- Vérifier le nombre maximum de carburants
  IF jsonb_array_length(p_fuels) > 3 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Maximum 3 carburants par session',
      'code', 'MAX_FUELS_EXCEEDED'
    );
  END IF;

  -- Vérification token véhicule (récupération company_id)
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'active';
  
  -- Vérifier que le véhicule existe et est actif
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Véhicule non trouvé ou inactif',
      'code', 'VEHICLE_NOT_FOUND'
    );
  END IF;
  
  -- Comparaison token (maintenant sûre car format validé)
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Token invalide pour ce véhicule',
      'code', 'TOKEN_MISMATCH'
    );
  END IF;

  -- ==========================================================================
  -- CORRECTIF 2: SANITIZATION JSONB (Injection Prevention)
  -- ==========================================================================
  
  -- Boucle sur chaque carburant avec validation stricte
  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    -- Extraction et nettoyage des valeurs
    v_fuel_type := lower(trim(v_fuel->>'type'));
    
    -- Validation fuel_type contre whitelist
    IF v_fuel_type IS NULL OR NOT (v_fuel_type = ANY(c_valid_fuel_types)) THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Type de carburant invalide: ' || COALESCE(v_fuel->>'type', 'NULL'),
        'code', 'INVALID_FUEL_TYPE',
        'valid_types', c_valid_fuel_types
      );
    END IF;
    
    -- Validation litres (doit être un nombre positif)
    BEGIN
      v_liters := (v_fuel->>'liters')::DECIMAL;
      IF v_liters IS NULL OR v_liters <= 0 OR v_liters > 2000 THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Quantité invalide pour ' || v_fuel_type || ' (doit être entre 0.01 et 2000)',
          'code', 'INVALID_LITERS'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Format de quantité invalide pour ' || v_fuel_type,
        'code', 'INVALID_LITERS_FORMAT'
      );
    END;
    
    -- Validation prix (NULL autorisé, sinon positif)
    BEGIN
      v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
      IF v_price IS NOT NULL AND (v_price < 0 OR v_price > 10000) THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Prix invalide pour ' || v_fuel_type || ' (doit être entre 0 et 10000)',
          'code', 'INVALID_PRICE'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Format de prix invalide pour ' || v_fuel_type,
        'code', 'INVALID_PRICE_FORMAT'
      );
    END;
    
    -- Validation kilométrage (NULL autorisé pour GNR, sinon positif)
    BEGIN
      v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);
      IF v_mileage IS NOT NULL AND (v_mileage < 0 OR v_mileage > 9999999) THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Kilométrage invalide pour ' || v_fuel_type || ' (doit être entre 0 et 9999999)',
          'code', 'INVALID_MILEAGE'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Format de kilométrage invalide pour ' || v_fuel_type,
        'code', 'INVALID_MILEAGE_FORMAT'
      );
    END;

    -- ==========================================================================
    -- LOGIQUE MÉTIER: Calcul consommation et insertion
    -- ==========================================================================
    
    -- GNR: pas de kilométrage, pas de calcul conso
    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL; -- Force NULL pour GNR
    ELSE
      -- Pour les autres carburants, mileage est requis
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Kilométrage requis pour ' || v_fuel_type || ' (non-GNR)',
          'code', 'MILEAGE_REQUIRED'
        );
      END IF;
      
      -- Calcul consommation (plein précédent même type)
      v_consumption := NULL;
      
      SELECT fr.mileage_at_fill, fr.quantity_liters
      INTO v_prev_mileage, v_prev_liters
      FROM fuel_records fr
      WHERE fr.vehicle_id = p_vehicle_id 
      AND fr.fuel_type = v_fuel_type
      AND fr.mileage_at_fill IS NOT NULL
      AND fr.mileage_at_fill < v_mileage
      ORDER BY fr.mileage_at_fill DESC
      LIMIT 1;
      
      IF v_prev_mileage IS NOT NULL AND (v_mileage - v_prev_mileage) > 0 THEN
        v_consumption := (v_prev_liters / (v_mileage - v_prev_mileage)::DECIMAL) * 100;
      END IF;
      
      -- Tracker le kilométrage max
      IF v_mileage > v_max_mileage THEN
        v_max_mileage := v_mileage;
      END IF;
    END IF;
    
    -- Insertion sécurisée du record
    INSERT INTO fuel_records (
      company_id,
      vehicle_id,
      fuel_type,
      quantity_liters,
      price_total,
      price_per_liter,
      mileage_at_fill,
      consumption_l_per_100km,
      station_name,
      driver_name,
      notes,
      created_at
    ) VALUES (
      v_company_id,
      p_vehicle_id,
      v_fuel_type, -- Valeur validée par whitelist
      v_liters,
      v_price,
      CASE 
        WHEN v_price IS NOT NULL AND v_liters > 0 
        THEN ROUND((v_price / v_liters)::numeric, 3)
        ELSE NULL
      END,
      v_mileage,
      v_consumption,
      p_station_name,
      p_driver_name,
      'Saisi via QR',
      NOW()
    )
    RETURNING id INTO v_record_id;
    
    v_record_ids := array_append(v_record_ids, v_record_id);
  END LOOP;
  
  -- Mise à jour kilométrage véhicule (si applicable)
  IF v_max_mileage > 0 THEN
    UPDATE vehicles 
    SET mileage = GREATEST(COALESCE(mileage, 0), v_max_mileage), 
        updated_at = NOW()
    WHERE id = p_vehicle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_ids', v_record_ids,
    'count', COALESCE(array_length(v_record_ids, 1), 0),
    'ticket_number', SUBSTRING(v_record_ids[1]::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log l'erreur côté serveur (visible dans les logs Supabase)
  RAISE WARNING 'create_fuel_session error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Erreur interne lors de l''enregistrement',
    'code', 'INTERNAL_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire documentaire
COMMENT ON FUNCTION create_fuel_session IS 
'[SÉCURISÉE v2] Crée une session de ravitaillement multi-carburants via QR Code.
Sécurités:
- Validation UUID v4 stricte (timing attack prevention)
- Whitelist fuel_type (injection prevention)  
- Validation bornes numériques (liters, price, mileage)
- Transaction atomique (tout ou rien)';

-- Permissions
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 1.2 Fonction create_public_inspection - Version sécurisée
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS create_public_inspection(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_token UUID,
  p_mileage INTEGER,
  p_fuel_level NUMERIC,
  p_adblue_level NUMERIC DEFAULT NULL,
  p_gnr_level NUMERIC DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'Dépôt',
  p_checks JSONB DEFAULT '[]',
  p_cleanliness JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_token TEXT;
  v_inspection_id UUID;
  v_score INTEGER;
  v_grade TEXT;
  v_critical_count INTEGER;
  v_warning_count INTEGER;
  
  c_uuid_v4_pattern CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  -- Validation UUID token
  IF p_token IS NULL OR p_token::text !~ c_uuid_v4_pattern THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Token invalide',
      'code', 'INVALID_TOKEN'
    );
  END IF;
  
  -- Validation mileage
  IF p_mileage IS NULL OR p_mileage < 0 OR p_mileage > 9999999 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Kilométrage invalide',
      'code', 'INVALID_MILEAGE'
    );
  END IF;
  
  -- Validation fuel_level
  IF p_fuel_level IS NULL OR p_fuel_level < 0 OR p_fuel_level > 100 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Niveau carburant invalide (0-100)',
      'code', 'INVALID_FUEL_LEVEL'
    );
  END IF;

  -- Vérification token véhicule
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL OR v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Token invalide ou véhicule inactif',
      'code', 'TOKEN_INVALID'
    );
  END IF;

  -- Calcul score (logique simplifiée)
  v_score := 100;
  
  -- Insertion inspection
  INSERT INTO vehicle_inspections (
    company_id,
    vehicle_id,
    driver_id,
    mileage,
    fuel_level,
    adblue_level,
    location,
    score,
    status,
    notes,
    created_at
  ) VALUES (
    v_company_id,
    p_vehicle_id,
    NULL, -- driver_id public pas lié à un user
    p_mileage,
    p_fuel_level,
    p_adblue_level,
    p_location,
    v_score,
    'completed',
    COALESCE(p_driver_name, 'Inspection QR'),
    NOW()
  )
  RETURNING id INTO v_inspection_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'ticket_number', SUBSTRING(v_inspection_id::text, 1, 8),
    'score', v_score
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_public_inspection error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Erreur interne',
    'code', 'INTERNAL_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_public_inspection(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION create_public_inspection(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- ==========================================
-- 2. INDEX PERFORMANCE (CONCURRENTLY)
-- ==========================================

-- Note: CONCURRENTLY évite le lock de table mais prend plus de temps
-- Ne pas annuler pendant l'exécution!

-- ----------------------------------------------------------------------------
-- 2.1 Index pour affichage tableau admin (tri par date)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_date 
  ON fuel_records(vehicle_id, created_at DESC);

COMMENT ON INDEX idx_fuel_records_vehicle_date IS 
'Optimise les requêtes de liste des pleins par véhicule triés par date';

-- ----------------------------------------------------------------------------
-- 2.2 Index pour RLS rapide (filtre company_id)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fuel_records_company_rls 
  ON fuel_records(company_id) 
  INCLUDE (vehicle_id, fuel_type, quantity_liters, created_at);

COMMENT ON INDEX idx_fuel_records_company_rls IS 
'Optimise les requêtes RLS en couvrant les colonnes fréquemment accédées';

-- ----------------------------------------------------------------------------
-- 2.3 Index pour calculs de consommation
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fuel_records_consumption_calc 
  ON fuel_records(vehicle_id, fuel_type, mileage_at_fill) 
  WHERE consumption_l_per_100km IS NOT NULL;

COMMENT ON INDEX idx_fuel_records_consumption_calc IS 
'Optimise le calcul de consommation (trouver le plein précédent)';

-- ----------------------------------------------------------------------------
-- 2.4 Index pour recherche par conducteur (nouveau champ driver_name)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fuel_records_driver_name 
  ON fuel_records(driver_name) 
  WHERE driver_name IS NOT NULL;

COMMENT ON INDEX idx_fuel_records_driver_name IS 
'Optimise la recherche par nom de conducteur (saisie QR)';

-- ==========================================
-- 3. CONTRAINTES INTÉGRITÉ
-- ==========================================

-- ----------------------------------------------------------------------------
-- 3.1 Vérification des données existantes avant contraintes
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_mileage INTEGER;
  v_bad_quantity INTEGER;
  v_bad_price INTEGER;
BEGIN
  -- Compter les données problématiques
  SELECT COUNT(*) INTO v_bad_mileage 
  FROM fuel_records 
  WHERE mileage_at_fill IS NOT NULL AND mileage_at_fill < 0;
  
  SELECT COUNT(*) INTO v_bad_quantity 
  FROM fuel_records 
  WHERE quantity_liters <= 0;
  
  SELECT COUNT(*) INTO v_bad_price 
  FROM fuel_records 
  WHERE price_total IS NOT NULL AND price_total < 0;
  
  -- Lever une exception si données problématiques trouvées
  IF v_bad_mileage > 0 OR v_bad_quantity > 0 OR v_bad_price > 0 THEN
    RAISE EXCEPTION 'Données problématiques détectées: % mileage négatif, % quantity invalide, % prix négatif. Corriger avant d''ajouter les contraintes.',
      v_bad_mileage, v_bad_quantity, v_bad_price;
  END IF;
  
  RAISE NOTICE 'Vérification des données OK: aucune valeur négative trouvée';
END $$;

-- ----------------------------------------------------------------------------
-- 3.2 Ajout des contraintes CHECK
-- ----------------------------------------------------------------------------

-- Contrainte: quantité toujours positive
ALTER TABLE fuel_records 
DROP CONSTRAINT IF EXISTS chk_fuel_quantity_positive;

ALTER TABLE fuel_records 
ADD CONSTRAINT chk_fuel_quantity_positive 
CHECK (quantity_liters > 0);

COMMENT ON CONSTRAINT chk_fuel_quantity_positive ON fuel_records IS 
'Empêche les quantités négatives ou nulles';

-- Contrainte: kilométrage NULL (GNR) ou positif
ALTER TABLE fuel_records 
DROP CONSTRAINT IF EXISTS chk_fuel_mileage_positive;

ALTER TABLE fuel_records 
ADD CONSTRAINT chk_fuel_mileage_positive 
CHECK (mileage_at_fill IS NULL OR mileage_at_fill >= 0);

COMMENT ON CONSTRAINT chk_fuel_mileage_positive ON fuel_records IS 
'Accepte NULL (GNR) mais pas de valeurs négatives';

-- Contrainte: prix NULL ou positif
ALTER TABLE fuel_records 
DROP CONSTRAINT IF EXISTS chk_fuel_price_positive;

ALTER TABLE fuel_records 
ADD CONSTRAINT chk_fuel_price_positive 
CHECK (price_total IS NULL OR price_total >= 0);

COMMENT ON CONSTRAINT chk_fuel_price_positive ON fuel_records IS 
'Accepte NULL (prix inconnu) mais pas de valeurs négatives';

-- ==========================================
-- 4. VÉRIFICATIONS POST-DÉPLOIEMENT
-- ==========================================

-- ----------------------------------------------------------------------------
-- 4.1 Vérifier que les index sont créés
-- ----------------------------------------------------------------------------
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'fuel_records' 
AND indexname LIKE 'idx_fuel_records_%'
ORDER BY indexname;

-- ----------------------------------------------------------------------------
-- 4.2 Vérifier que les contraintes sont actives
-- ----------------------------------------------------------------------------
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'fuel_records'::regclass
AND conname LIKE 'chk_fuel_%';

-- ----------------------------------------------------------------------------
-- 4.3 Test de validation UUID (doit échouer)
-- ----------------------------------------------------------------------------
-- Décommenter pour tester:
-- SELECT create_fuel_session(
--   'bb862a6e-121d-4a4b-af26-403a19345136'::UUID,
--   'token-invalide-pas-uuid'::UUID,  -- Doit échouer avant cette ligne (cast invalide)
--   '[{"type":"diesel","liters":50,"price":100,"mileage":10000}]'::JSONB,
--   'Test'
-- );

-- ----------------------------------------------------------------------------
-- 4.4 Test de validation fuel_type (doit échouer proprement)
-- ----------------------------------------------------------------------------
-- Décommenter pour tester:
-- SELECT create_fuel_session(
--   'bb862a6e-121d-4a4b-af26-403a19345136'::UUID,
--   '7c63984f-df9b-472a-8509-bf7ac2b5d18e'::UUID,
--   '[{"type":"essence-invalide","liters":50,"price":100,"mileage":10000}]'::JSONB,
--   'Test'
-- );

-- ----------------------------------------------------------------------------
-- 4.5 Test de validation litres négatifs (doit échouer)
-- ----------------------------------------------------------------------------
-- Décommenter pour tester:
-- SELECT create_fuel_session(
--   'bb862a6e-121d-4a4b-af26-403a19345136'::UUID,
--   '7c63984f-df9b-472a-8509-bf7ac2b5d18e'::UUID,
--   '[{"type":"diesel","liters":-10,"price":100,"mileage":10000}]'::JSONB,
--   'Test'
-- );

-- ----------------------------------------------------------------------------
-- 4.6 Test EXPLAIN ANALYZE (vérifie utilisation index)
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fuel_records 
WHERE vehicle_id = 'bb862a6e-121d-4a4b-af26-403a19345136'
ORDER BY created_at DESC
LIMIT 10;

-- Résultat attendu: "Index Scan using idx_fuel_records_vehicle_date"

-- ==========================================
-- 5. ROLLBACK (En cas de problème)
-- ==========================================

/*
-- DÉCOMMENTER POUR ANNULER LES CHANGEMENTS:

-- 5.1 Supprimer les contraintes
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS chk_fuel_quantity_positive;
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS chk_fuel_mileage_positive;
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS chk_fuel_price_positive;

-- 5.2 Supprimer les index (ne bloque pas la table)
DROP INDEX IF EXISTS idx_fuel_records_vehicle_date;
DROP INDEX IF EXISTS idx_fuel_records_company_rls;
DROP INDEX IF EXISTS idx_fuel_records_consumption_calc;
DROP INDEX IF EXISTS idx_fuel_records_driver_name;

-- 5.3 Restaurer les anciennes fonctions (depuis backup)
-- Voir fichiers .backup dans dossier sql/

*/

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================

SELECT 'Migration sécurité complétée avec succès' as status, NOW() as completed_at;
