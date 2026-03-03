-- ============================================================================
-- FLEET MASTER PRO - CORRECTIONS SÉCURITÉ (VERSION PROPRE)
-- Date: 2026-02-27
-- Compatible: Supabase SQL Editor (exécution en transaction)
-- ============================================================================

-- ==========================================
-- 0. VÉRIFICATIONS PRÉALABLES
-- ==========================================

-- Vérifier les index existants
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'fuel_records';

-- Vérifier les contraintes existantes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'fuel_records'::regclass;

-- ==========================================
-- 1. FONCTIONS RPC SÉCURISÉES
-- ==========================================

-- Supprimer et recréer create_fuel_session avec validations
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
BEGIN
  -- Validation UUID
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token manquant', 'code', 'TOKEN_MISSING');
  END IF;
  
  -- Validation format UUID v4
  IF p_token::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Format token invalide', 'code', 'TOKEN_INVALID_FORMAT');
  END IF;
  
  -- Validation p_fuels
  IF p_fuels IS NULL OR jsonb_array_length(p_fuels) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun carburant', 'code', 'NO_FUELS');
  END IF;
  
  IF jsonb_array_length(p_fuels) > 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 3 carburants', 'code', 'MAX_FUELS');
  END IF;

  -- Vérification token véhicule
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicule non trouve', 'code', 'VEHICLE_NOT_FOUND');
  END IF;
  
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide', 'code', 'TOKEN_MISMATCH');
  END IF;

  -- Boucle sur carburants avec validation
  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    v_fuel_type := lower(trim(v_fuel->>'type'));
    
    -- Validation fuel_type (whitelist)
    IF v_fuel_type IS NULL OR v_fuel_type NOT IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Type carburant invalide: ' || COALESCE(v_fuel->>'type', 'NULL'), 'code', 'INVALID_FUEL_TYPE');
    END IF;
    
    -- Validation litres
    BEGIN
      v_liters := (v_fuel->>'liters')::DECIMAL;
      IF v_liters IS NULL OR v_liters <= 0 OR v_liters > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantite invalide pour ' || v_fuel_type, 'code', 'INVALID_LITERS');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format quantite invalide', 'code', 'INVALID_LITERS_FORMAT');
    END;
    
    -- Validation prix
    BEGIN
      v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
      IF v_price IS NOT NULL AND (v_price < 0 OR v_price > 10000) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prix invalide pour ' || v_fuel_type, 'code', 'INVALID_PRICE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format prix invalide', 'code', 'INVALID_PRICE_FORMAT');
    END;
    
    -- Validation mileage
    BEGIN
      v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);
      IF v_mileage IS NOT NULL AND (v_mileage < 0 OR v_mileage > 9999999) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage invalide', 'code', 'INVALID_MILEAGE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format kilometrage invalide', 'code', 'INVALID_MILEAGE_FORMAT');
    END;

    -- Logique GNR
    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL;
    ELSE
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage requis pour ' || v_fuel_type, 'code', 'MILEAGE_REQUIRED');
      END IF;
      
      -- Calcul consommation
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
      
      IF v_mileage > v_max_mileage THEN
        v_max_mileage := v_mileage;
      END IF;
    END IF;
    
    -- Insertion
    INSERT INTO fuel_records (
      company_id, vehicle_id, fuel_type, quantity_liters,
      price_total, price_per_liter, mileage_at_fill,
      consumption_l_per_100km, station_name, driver_name, notes, created_at
    ) VALUES (
      v_company_id, p_vehicle_id, v_fuel_type, v_liters,
      v_price,
      CASE WHEN v_price IS NOT NULL AND v_liters > 0 THEN ROUND((v_price / v_liters)::numeric, 3) ELSE NULL END,
      v_mileage, v_consumption, p_station_name, p_driver_name, 'Saisi via QR', NOW()
    )
    RETURNING id INTO v_record_id;
    
    v_record_ids := array_append(v_record_ids, v_record_id);
  END LOOP;
  
  -- Mise a jour kilometrage vehicule
  IF v_max_mileage > 0 THEN
    UPDATE vehicles 
    SET mileage = GREATEST(COALESCE(mileage, 0), v_max_mileage), updated_at = NOW()
    WHERE id = p_vehicle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_ids', v_record_ids,
    'count', COALESCE(array_length(v_record_ids, 1), 0),
    'ticket_number', SUBSTRING(v_record_ids[1]::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_fuel_session error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', 'Erreur interne', 'code', 'INTERNAL_ERROR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;

-- ==========================================
-- 2. INDEX PERFORMANCE
-- ==========================================

-- Index pour affichage tableau
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_date 
  ON fuel_records(vehicle_id, created_at DESC);

-- Index pour RLS
CREATE INDEX IF NOT EXISTS idx_fuel_records_company_rls 
  ON fuel_records(company_id);

-- Index pour calculs conso
CREATE INDEX IF NOT EXISTS idx_fuel_records_consumption_calc 
  ON fuel_records(vehicle_id, fuel_type, mileage_at_fill) 
  WHERE consumption_l_per_100km IS NOT NULL;

-- Index pour driver_name
CREATE INDEX IF NOT EXISTS idx_fuel_records_driver_name 
  ON fuel_records(driver_name) 
  WHERE driver_name IS NOT NULL;

-- ==========================================
-- 3. CONTRAINTES CHECK
-- ==========================================

-- Verification donnees existantes
DO $$
DECLARE
  v_bad_mileage INTEGER;
  v_bad_quantity INTEGER;
  v_bad_price INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_bad_mileage FROM fuel_records WHERE mileage_at_fill < 0;
  SELECT COUNT(*) INTO v_bad_quantity FROM fuel_records WHERE quantity_liters <= 0;
  SELECT COUNT(*) INTO v_bad_price FROM fuel_records WHERE price_total < 0;
  
  IF v_bad_mileage > 0 OR v_bad_quantity > 0 OR v_bad_price > 0 THEN
    RAISE EXCEPTION 'Donnees problematiques: % mileage, % quantity, % prix', v_bad_mileage, v_bad_quantity, v_bad_price;
  END IF;
END $$;

-- Contraintes
ALTER TABLE fuel_records 
  DROP CONSTRAINT IF EXISTS chk_fuel_quantity_positive,
  DROP CONSTRAINT IF EXISTS chk_fuel_mileage_positive,
  DROP CONSTRAINT IF EXISTS chk_fuel_price_positive;

ALTER TABLE fuel_records 
  ADD CONSTRAINT chk_fuel_quantity_positive CHECK (quantity_liters > 0),
  ADD CONSTRAINT chk_fuel_mileage_positive CHECK (mileage_at_fill IS NULL OR mileage_at_fill >= 0),
  ADD CONSTRAINT chk_fuel_price_positive CHECK (price_total IS NULL OR price_total >= 0);

-- ==========================================
-- 4. VERIFICATIONS
-- ==========================================

-- Verifier index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'fuel_records' AND indexname LIKE 'idx_fuel_records_%';

-- Verifier contraintes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'fuel_records'::regclass AND conname LIKE 'chk_fuel_%';

-- ==========================================
-- FIN
-- ==========================================

SELECT 'Migration securite terminee' as status, NOW() as completed_at;
