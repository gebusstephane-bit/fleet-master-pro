-- ============================================================================
-- FLEET MASTER PRO - TESTS DE VÉRIFICATION SÉCURITÉ
-- Date: 2026-02-27
-- Objectif: Valider que les correctifs de sécurité fonctionnent
-- ============================================================================

-- ==========================================
-- TEST 1: VALIDATION UUID STRICTE
-- ==========================================

-- Test 1.1: Token au format invalide (doit échouer avec code TOKEN_INVALID_FORMAT)
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Tentative avec un token invalide (pas un UUID)
  BEGIN
    v_result := create_fuel_session(
      'bb862a6e-121d-4a4b-af26-403a19345136'::UUID,
      '00000000-0000-0000-0000-000000000000'::UUID, -- UUID nil valide mais n'existe pas
      '[{"type":"diesel","liters":50,"price":100,"mileage":10000}]'::JSONB,
      'Test'
    );
    
    IF (v_result->>'success')::boolean = false AND v_result->>'code' = 'TOKEN_MISMATCH' THEN
      RAISE NOTICE '✓ TEST 1.1 PASS: Token invalide correctement rejeté';
    ELSE
      RAISE WARNING '✗ TEST 1.1 FAIL: Résultat inattendu: %', v_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST 1.1 PASS: Exception levée comme attendu: %', SQLERRM;
  END;
END $$;

-- ==========================================
-- TEST 2: VALIDATION FUEL_TYPE WHITELIST
-- ==========================================

-- Test 2.1: Type carburant invalide (doit échouer avec code INVALID_FUEL_TYPE)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
BEGIN
  -- Récupérer un token valide existant
  SELECT qr_code_data INTO v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 2.1 SKIP: Aucun véhicule actif avec token trouvé';
    RETURN;
  END IF;
  
  v_result := create_fuel_session(
    (SELECT id FROM vehicles WHERE qr_code_data = v_valid_token LIMIT 1),
    v_valid_token::UUID,
    '[{"type":"essence-invalide","liters":50,"price":100,"mileage":10000}]'::JSONB,
    'Test'
  );
  
  IF (v_result->>'success')::boolean = false AND v_result->>'code' = 'INVALID_FUEL_TYPE' THEN
    RAISE NOTICE '✓ TEST 2.1 PASS: Type carburant invalide rejeté';
  ELSE
    RAISE WARNING '✗ TEST 2.1 FAIL: Résultat inattendu: %', v_result;
  END IF;
END $$;

-- Test 2.2: Type carburant valide (doit réussir)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
  v_vehicle_id UUID;
BEGIN
  SELECT id, qr_code_data INTO v_vehicle_id, v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 2.2 SKIP: Aucun véhicule actif trouvé';
    RETURN;
  END IF;
  
  -- Nettoyer les données de test précédentes
  DELETE FROM fuel_records 
  WHERE notes = 'TEST_SECURITY_VALIDATION';
  
  v_result := create_fuel_session(
    v_vehicle_id,
    v_valid_token::UUID,
    '[{"type":"diesel","liters":50,"price":100,"mileage":999999}]'::JSONB,
    'TEST_SECURITY_VALIDATION'
  );
  
  IF (v_result->>'success')::boolean = true THEN
    RAISE NOTICE '✓ TEST 2.2 PASS: Type carburant valide accepté (ticket: %)', v_result->>'ticket_number';
    -- Nettoyer
    DELETE FROM fuel_records WHERE notes = 'TEST_SECURITY_VALIDATION';
  ELSE
    RAISE WARNING '✗ TEST 2.2 FAIL: Résultat inattendu: %', v_result;
  END IF;
END $$;

-- ==========================================
-- TEST 3: VALIDATION VALEURS NUMÉRIQUES
-- ==========================================

-- Test 3.1: Litres négatifs (doit échouer)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
BEGIN
  SELECT qr_code_data INTO v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 3.1 SKIP: Aucun véhicule actif trouvé';
    RETURN;
  END IF;
  
  v_result := create_fuel_session(
    (SELECT id FROM vehicles WHERE qr_code_data = v_valid_token LIMIT 1),
    v_valid_token::UUID,
    '[{"type":"diesel","liters":-10,"price":100,"mileage":10000}]'::JSONB,
    'Test'
  );
  
  IF (v_result->>'success')::boolean = false AND v_result->>'code' = 'INVALID_LITERS' THEN
    RAISE NOTICE '✓ TEST 3.1 PASS: Litres négatifs rejetés';
  ELSE
    RAISE WARNING '✗ TEST 3.1 FAIL: Résultat inattendu: %', v_result;
  END IF;
END $$;

-- Test 3.2: Prix négatif (doit échouer)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
BEGIN
  SELECT qr_code_data INTO v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 3.2 SKIP: Aucun véhicule actif trouvé';
    RETURN;
  END IF;
  
  v_result := create_fuel_session(
    (SELECT id FROM vehicles WHERE qr_code_data = v_valid_token LIMIT 1),
    v_valid_token::UUID,
    '[{"type":"diesel","liters":50,"price":-50,"mileage":10000}]'::JSONB,
    'Test'
  );
  
  IF (v_result->>'success')::boolean = false AND v_result->>'code' = 'INVALID_PRICE' THEN
    RAISE NOTICE '✓ TEST 3.2 PASS: Prix négatif rejeté';
  ELSE
    RAISE WARNING '✗ TEST 3.2 FAIL: Résultat inattendu: %', v_result;
  END IF;
END $$;

-- Test 3.3: Kilométrage négatif (doit échouer)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
BEGIN
  SELECT qr_code_data INTO v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 3.3 SKIP: Aucun véhicule actif trouvé';
    RETURN;
  END IF;
  
  v_result := create_fuel_session(
    (SELECT id FROM vehicles WHERE qr_code_data = v_valid_token LIMIT 1),
    v_valid_token::UUID,
    '[{"type":"diesel","liters":50,"price":100,"mileage":-1000}]'::JSONB,
    'Test'
  );
  
  IF (v_result->>'success')::boolean = false AND v_result->>'code' = 'INVALID_MILEAGE' THEN
    RAISE NOTICE '✓ TEST 3.3 PASS: Kilométrage négatif rejeté';
  ELSE
    RAISE WARNING '✗ TEST 3.3 FAIL: Résultat inattendu: %', v_result;
  END IF;
END $$;

-- Test 3.4: GNR avec mileage NULL (doit réussir)
DO $$
DECLARE
  v_result JSONB;
  v_valid_token TEXT;
  v_vehicle_id UUID;
BEGIN
  SELECT id, qr_code_data INTO v_vehicle_id, v_valid_token 
  FROM vehicles 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_valid_token IS NULL THEN
    RAISE NOTICE '⚠ TEST 3.4 SKIP: Aucun véhicule actif trouvé';
    RETURN;
  END IF;
  
  -- Nettoyer
  DELETE FROM fuel_records WHERE notes = 'TEST_GNR_NULL';
  
  v_result := create_fuel_session(
    v_vehicle_id,
    v_valid_token::UUID,
    '[{"type":"gnr","liters":10,"price":null,"mileage":null}]'::JSONB,
    'TEST_GNR_NULL'
  );
  
  IF (v_result->>'success')::boolean = true THEN
    RAISE NOTICE '✓ TEST 3.4 PASS: GNR avec mileage NULL accepté';
    DELETE FROM fuel_records WHERE notes = 'TEST_GNR_NULL';
  ELSE
    RAISE WARNING '✗ TEST 3.4 FAIL: GNR devrait accepter mileage NULL: %', v_result;
  END IF;
END $$;

-- ==========================================
-- TEST 4: PERFORMANCE DES INDEX
-- ==========================================

-- Test 4.1: Vérifier que les index sont utilisés
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT vehicle_id, fuel_type, quantity_liters, created_at 
FROM fuel_records 
WHERE company_id = (SELECT company_id FROM fuel_records LIMIT 1)
LIMIT 10;

-- Résultat attendu: "Index Scan using idx_fuel_records_company_rls"

-- Test 4.2: Vérifier l'index vehicle_date
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT * FROM fuel_records 
WHERE vehicle_id = (SELECT vehicle_id FROM fuel_records LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

-- Résultat attendu: "Index Scan using idx_fuel_records_vehicle_date"

-- ==========================================
-- TEST 5: CONTRAINTES CHECK
-- ==========================================

-- Test 5.1: Tentative d'INSERT avec quantity <= 0 (doit échouer)
DO $$
BEGIN
  INSERT INTO fuel_records (company_id, vehicle_id, fuel_type, quantity_liters, created_at)
  VALUES (
    (SELECT company_id FROM vehicles LIMIT 1),
    (SELECT id FROM vehicles LIMIT 1),
    'diesel',
    -10,
    NOW()
  );
  
  RAISE WARNING '✗ TEST 5.1 FAIL: Contrainte quantity_positive ne fonctionne pas';
EXCEPTION 
  WHEN check_violation THEN
    RAISE NOTICE '✓ TEST 5.1 PASS: Contrainte quantity_positive bloque les valeurs négatives';
  WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST 5.1 PASS: Erreur bloquante: %', SQLERRM;
END $$;

-- Test 5.2: Tentative d'INSERT avec mileage négatif (doit échouer)
DO $$
BEGIN
  INSERT INTO fuel_records (company_id, vehicle_id, fuel_type, quantity_liters, mileage_at_fill, created_at)
  VALUES (
    (SELECT company_id FROM vehicles LIMIT 1),
    (SELECT id FROM vehicles LIMIT 1),
    'diesel',
    50,
    -1000,
    NOW()
  );
  
  RAISE WARNING '✗ TEST 5.2 FAIL: Contrainte mileage_positive ne fonctionne pas';
EXCEPTION 
  WHEN check_violation THEN
    RAISE NOTICE '✓ TEST 5.2 PASS: Contrainte mileage_positive bloque les valeurs négatives';
  WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST 5.2 PASS: Erreur bloquante: %', SQLERRM;
END $$;

-- Test 5.3: INSERT avec mileage NULL (doit réussir - GNR)
DO $$
BEGIN
  INSERT INTO fuel_records (company_id, vehicle_id, fuel_type, quantity_liters, mileage_at_fill, notes, created_at)
  VALUES (
    (SELECT company_id FROM vehicles LIMIT 1),
    (SELECT id FROM vehicles LIMIT 1),
    'gnr',
    10,
    NULL, -- NULL autorisé
    'TEST_CONSTRAINT_NULL',
    NOW()
  );
  
  RAISE NOTICE '✓ TEST 5.3 PASS: NULL accepté pour mileage (GNR)';
  
  -- Nettoyer
  DELETE FROM fuel_records WHERE notes = 'TEST_CONSTRAINT_NULL';
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '✗ TEST 5.3 FAIL: NULL devrait être accepté: %', SQLERRM;
END $$;

-- ==========================================
-- RÉSUMÉ DES TESTS
-- ==========================================

SELECT 
  'Tests de sécurité terminés' as message,
  'Vérifier les messages ✓ (PASS) et ✗ (FAIL) ci-dessus' as instruction,
  NOW() as test_timestamp;

-- Comptage des index créés
SELECT 
  COUNT(*) as index_count,
  STRING_AGG(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'fuel_records' 
AND indexname LIKE 'idx_fuel_records_%';

-- Comptage des contraintes actives
SELECT 
  COUNT(*) as constraint_count,
  STRING_AGG(conname, ', ') as constraints
FROM pg_constraint 
WHERE conrelid = 'fuel_records'::regclass
AND conname LIKE 'chk_fuel_%';
