-- ============================================
-- MIGRATION FINALE QR CODE - Basée sur votre structure
-- ============================================

-- 1. VÉRIFIER/CORRIGER LES TOKENS QR
-- Convertir uniquement les anciens tokens fleetmaster://
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data LIKE 'fleetmaster://%';

-- S'assurer qu'aucun véhicule n'a de token NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data IS NULL;

-- 2. INDEX POUR PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_data ON vehicles(qr_code_data);

-- 3. FONCTIONS RPC (SECURITY DEFINER = contourne RLS)

-- Vérifier un token QR
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT 
    v.id, v.registration_number, v.brand, v.model, v.type, 
    v.qr_code_data, v.status, v.company_id
  INTO v_vehicle
  FROM vehicles v
  WHERE v.id = p_vehicle_id;
  
  IF v_vehicle IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle.status != 'active' THEN
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
      'model', v_vehicle.model,
      'type', v_vehicle.type,
      'company_id', v_vehicle.company_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un plein via QR
CREATE OR REPLACE FUNCTION create_public_fuel_record(
  p_vehicle_id UUID,
  p_token TEXT,
  p_fuel_type TEXT,
  p_liters DECIMAL,
  p_price_total DECIMAL,
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
  WHERE v.id = p_vehicle_id AND v.status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
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

-- Créer une inspection via QR
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
  -- Vérifier le token
  SELECT v.qr_code_data, v.company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id AND v.status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
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
  
  -- Insérer l'inspection (utilise vehicle_inspections existante)
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
  WHERE id = p_vehicle_id AND COALESCE(mileage, 0) < p_mileage;
  
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'ticket_number', SUBSTRING(v_inspection_id::text, 1, 8),
    'status', v_status
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VÉRIFICATION
SELECT 
  'Migration QR Code terminée' as status,
  (SELECT COUNT(*) FROM vehicles) as total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE qr_code_data IS NOT NULL) as with_token,
  (SELECT COUNT(*) FROM fuel_records) as fuel_records;
