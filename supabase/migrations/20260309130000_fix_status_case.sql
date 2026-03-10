-- ============================================================================
-- FIX : Correction de la casse du statut véhicule dans les fonctions RPC
-- Problème : Les fonctions utilisaient 'active' (minuscule) au lieu de 'ACTIF'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. SUPPRESSION DES ANCIENNES VERSIONS (avec CASCADE pour éviter les dépendances)
-- ----------------------------------------------------------------------------

-- Supprimer toutes les versions possibles de create_public_inspection
DROP FUNCTION IF EXISTS create_public_inspection(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, INTEGER, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_public_inspection(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_public_inspection(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB) CASCADE;

-- Supprimer toutes les versions possibles de create_public_fuel_record  
DROP FUNCTION IF EXISTS create_public_fuel_record(UUID, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_public_fuel_record(UUID, UUID, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;

-- Supprimer toutes les versions possibles de verify_qr_token
DROP FUNCTION IF EXISTS verify_qr_token(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_qr_token(UUID, UUID) CASCADE;

-- ----------------------------------------------------------------------------
-- 1. FONCTION create_public_inspection (version compatible avec le code)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_token TEXT,
  p_mileage INTEGER,
  p_fuel_level INTEGER DEFAULT 50,
  p_driver_name TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'Dépôt',
  p_score INTEGER DEFAULT 100,
  p_grade TEXT DEFAULT 'A',
  p_reported_defects JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_inspection_id UUID;
  v_vehicle_token TEXT;
  v_status TEXT;
BEGIN
  -- Vérifier le token et récupérer company_id
  SELECT v.qr_code_data, v.company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id AND v.status = 'ACTIF';  -- FIX: 'ACTIF' au lieu de 'active'
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé ou inactif');
  END IF;
  
  IF v_vehicle_token != p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Déterminer le statut
  IF p_reported_defects @> '[{"severity": "CRITIQUE"}]'::jsonb THEN
    v_status := 'CRITICAL_ISSUES';
  ELSIF jsonb_array_length(p_reported_defects) > 0 THEN
    v_status := 'ISSUES_FOUND';
  ELSE
    v_status := 'COMPLETED';
  END IF;
  
  -- Insérer l'inspection
  INSERT INTO vehicle_inspections (
    vehicle_id, company_id, mileage, fuel_level, driver_name, location,
    score, grade, status, reported_defects, cleanliness_exterior, 
    cleanliness_interior, inspection_date, defects_count, created_at, updated_at
  ) VALUES (
    p_vehicle_id, v_company_id, p_mileage, p_fuel_level, p_driver_name, p_location,
    p_score, p_grade, v_status, p_reported_defects, 3, 3, NOW(), 
    jsonb_array_length(p_reported_defects), NOW(), NOW()
  )
  RETURNING id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage), 
      updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'inspection_id', v_inspection_id,
    'ticket_number', SUBSTRING(v_inspection_id::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. FONCTION create_public_fuel_record
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_public_fuel_record(
  p_vehicle_id UUID,
  p_token TEXT,
  p_fuel_type TEXT,
  p_liters NUMERIC,
  p_price_total NUMERIC,
  p_mileage INTEGER,
  p_station_name TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_record_id UUID;
  v_vehicle_token TEXT;
BEGIN
  -- Vérifier le token et récupérer company_id
  SELECT v.qr_code_data, v.company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id AND v.status = 'ACTIF';  -- FIX: 'ACTIF' au lieu de 'active'
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé ou inactif');
  END IF;
  
  IF v_vehicle_token != p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Insérer le plein
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, 
    price_total, mileage_at_fill, station_name, notes, date
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters,
    p_price_total, p_mileage, p_station_name,
    'Saisi via QR par ' || COALESCE(p_driver_name, 'Conducteur'),
    NOW()
  )
  RETURNING id INTO v_record_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage), 
      updated_at = NOW()
  WHERE id = p_vehicle_id AND COALESCE(mileage, 0) < p_mileage;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_id', v_record_id,
    'ticket_number', SUBSTRING(v_record_id::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. FONCTION verify_qr_token
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT id, registration_number, brand, model, status, qr_code_data
  INTO v_vehicle
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_vehicle IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle.status != 'ACTIF' THEN  -- FIX: 'ACTIF' au lieu de 'active'
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule inactif');
  END IF;
  
  IF v_vehicle.qr_code_data != p_token THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token invalide');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'registration_number', v_vehicle.registration_number,
      'brand', v_vehicle.brand,
      'model', v_vehicle.model
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('valid', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION create_public_inspection(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION create_public_inspection(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION create_public_fuel_record(UUID, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_public_fuel_record(UUID, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION verify_qr_token(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_qr_token(UUID, TEXT) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION create_public_inspection IS 'Crée une inspection via QR - corrigé pour utiliser status = ACTIF';
