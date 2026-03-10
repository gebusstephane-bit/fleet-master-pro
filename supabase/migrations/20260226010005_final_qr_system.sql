-- ============================================
-- MIGRATION FINALE: Système QR Code Triple Accès
-- Compatible avec la structure existante
-- ============================================

-- ============================================
-- 1. FIX QR_CODE_DATA (convertir anciens formats)
-- ============================================
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data, '')) != 36;

-- S'assurer qu'il n'y a plus de NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- ============================================
-- 2. TABLE FUEL_RECORDS (structure minimale)
-- ============================================
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);

-- RLS
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Policies (uniquement si profiles existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP POLICY IF EXISTS fuel_records_select ON fuel_records;
    CREATE POLICY fuel_records_select ON fuel_records
      FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
    
    DROP POLICY IF EXISTS fuel_records_insert ON fuel_records;
    CREATE POLICY fuel_records_insert ON fuel_records
      FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================
-- 3. FONCTION: Créer un plein via QR Code
-- ============================================
CREATE OR REPLACE FUNCTION create_public_fuel_record(
  p_vehicle_id UUID,
  p_token UUID,
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
  -- Récupérer le token du véhicule
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  -- Vérifier que le véhicule existe
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  -- Vérifier le token
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Insérer le plein
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, price_total,
    price_per_liter, mileage_at_fill, station_name, notes
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters, p_price_total,
    CASE WHEN p_liters > 0 THEN ROUND((p_price_total / p_liters)::numeric, 3) ELSE 0 END,
    p_mileage, p_station_name,
    'Saisi par ' || COALESCE(p_driver_name, 'Conducteur') || ' via QR Code'
  )
  RETURNING id INTO v_record_id;
  
  -- Mettre à jour le kilométrage du véhicule si nécessaire
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

-- ============================================
-- 4. FONCTION: Vérifier un token QR
-- ============================================
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token UUID
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT id, registration_number, brand, model, type, qr_code_data::text as qr_token, status
  INTO v_vehicle
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_vehicle IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle.status != 'active' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule inactif');
  END IF;
  
  IF v_vehicle.qr_token != p_token::text THEN
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

-- ============================================
-- 5. FONCTION: Créer une inspection via QR
-- ============================================
CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_token UUID,
  p_mileage INTEGER,
  p_fuel_level INTEGER DEFAULT 50,
  p_driver_name TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'Dépôt',
  p_score INTEGER DEFAULT 100,
  p_grade TEXT DEFAULT 'A',
  p_status TEXT DEFAULT 'PENDING'
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_inspection_id UUID;
  v_vehicle_token TEXT;
BEGIN
  -- Vérifier le token
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL OR v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Créer l'inspection (table vehicle_inspections doit exister)
  INSERT INTO vehicle_inspections (
    vehicle_id, company_id, mileage, fuel_level, driver_name, location,
    score, grade, status, cleanliness_exterior, cleanliness_interior, inspection_date
  ) VALUES (
    p_vehicle_id, v_company_id, p_mileage, p_fuel_level, p_driver_name, p_location,
    p_score, p_grade, p_status, 3, 3, NOW()
  )
  RETURNING id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage), updated_at = NOW()
  WHERE id = p_vehicle_id AND COALESCE(mileage, 0) < p_mileage;
  
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'ticket_number', SUBSTRING(v_inspection_id::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Si vehicle_inspections n'existe pas, retourner une erreur explicative
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. VÉRIFICATION
-- ============================================
SELECT 
  'Migration terminée' as status,
  COUNT(*) as total_vehicles,
  COUNT(qr_code_data) as with_token
FROM vehicles;
