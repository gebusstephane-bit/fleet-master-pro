-- ============================================
-- VERSION MINIMALE - Sans policies RLS problématiques
-- ============================================

-- 1. CONVERTIR LES TOKENS EXISTANTS
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data, '')) < 30;

-- S'assurer qu'aucun véhicule n'a de token NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);

-- 2. TABLE FUEL_RECORDS (sans RLS pour l'instant)
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  vehicle_id UUID NOT NULL,
  driver_id UUID,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fuel_type TEXT,
  quantity_liters DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_liter DECIMAL(8,3),
  mileage_at_fill INTEGER NOT NULL DEFAULT 0,
  consumption_l_per_100km DECIMAL(5,2),
  station_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);

-- 3. FONCTIONS RPC

-- Vérifier token
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT 
    id, registration_number, brand, model, type, 
    qr_code_data, status
  INTO v_vehicle
  FROM vehicles
  WHERE id = p_vehicle_id;
  
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
      'type', v_vehicle.type
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un plein
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
  SELECT qr_code_data, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle_token != p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, 
    price_total, mileage_at_fill, station_name, notes
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters,
    p_price_total, p_mileage, p_station_name,
    'Saisi via QR par ' || COALESCE(p_driver_name, 'Conducteur')
  )
  RETURNING id INTO v_record_id;
  
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

-- Créer une inspection
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
  SELECT qr_code_data, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle_token != p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  IF p_reported_defects @> '[{"severity": "CRITIQUE"}]'::jsonb THEN
    v_status := 'CRITICAL_ISSUES';
  ELSIF jsonb_array_length(p_reported_defects) > 0 THEN
    v_status := 'ISSUES_FOUND';
  ELSE
    v_status := 'COMPLETED';
  END IF;
  
  INSERT INTO vehicle_inspections (
    vehicle_id, company_id, mileage, fuel_level, driver_name, location,
    score, grade, status, reported_defects, cleanliness_exterior, 
    cleanliness_interior, inspection_date, defects_count
  ) VALUES (
    p_vehicle_id, v_company_id, p_mileage, p_fuel_level, p_driver_name, p_location,
    p_score, p_grade, v_status, p_reported_defects, 3, 3, NOW(), 
    jsonb_array_length(p_reported_defects)
  )
  RETURNING id INTO v_inspection_id;
  
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
  'Migration minimale QR terminée' as status,
  (SELECT COUNT(*) FROM vehicles) as total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE qr_code_data IS NOT NULL) as with_token,
  (SELECT COUNT(*) FROM fuel_records) as fuel_records;
