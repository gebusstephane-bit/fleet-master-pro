-- ============================================
-- MIGRATION: Système QR Code Triple Accès
-- Basé sur la structure existante FleetMaster
-- ============================================

-- ============================================
-- 1. CONVERSION DES ANCIENS TOKENS QR
-- ============================================

-- Convertir les anciens tokens fleetmaster:// en UUID valides
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data::text, '')) != 36;

-- S'assurer qu'aucun véhicule n'a de token NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);

-- ============================================
-- 2. TABLE FUEL_RECORDS (Nouvelle)
-- ============================================

CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fuel_type TEXT CHECK (fuel_type IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg')),
  quantity_liters DECIMAL(8,2) NOT NULL,
  price_total DECIMAL(10,2) NOT NULL,
  price_per_liter DECIMAL(8,3),
  mileage_at_fill INTEGER NOT NULL,
  consumption_l_per_100km DECIMAL(5,2),
  station_name TEXT,
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fuel_records_updated_at ON fuel_records;
CREATE TRIGGER update_fuel_records_updated_at
  BEFORE UPDATE ON fuel_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS POLICIES POUR FUEL_RECORDS
-- ============================================

ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fuel_records_company_select ON fuel_records;
CREATE POLICY fuel_records_company_select ON fuel_records
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fuel_records_company_insert ON fuel_records;
CREATE POLICY fuel_records_company_insert ON fuel_records
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fuel_records_company_update ON fuel_records;
CREATE POLICY fuel_records_company_update ON fuel_records
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 4. FONCTIONS RPC POUR ACCÈS PUBLIC QR
-- ============================================

-- Vérifier la validité d'un token QR
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token UUID
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT 
    id, 
    registration_number, 
    brand, 
    model, 
    type, 
    qr_code_data::text as qr_token, 
    status
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

-- Créer un plein de carburant via QR
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
  v_consumption DECIMAL;
  v_prev_mileage INTEGER;
  v_prev_liters DECIMAL;
  v_vehicle_token TEXT;
BEGIN
  -- Vérifier le token et récupérer company_id
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id
  AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Calculer la consommation si possible
  SELECT fr.mileage_at_fill, fr.quantity_liters
  INTO v_prev_mileage, v_prev_liters
  FROM fuel_records fr
  WHERE fr.vehicle_id = p_vehicle_id
  AND fr.mileage_at_fill < p_mileage
  ORDER BY fr.mileage_at_fill DESC
  LIMIT 1;
  
  IF v_prev_mileage IS NOT NULL AND (p_mileage - v_prev_mileage) > 0 THEN
    v_consumption := (v_prev_liters / (p_mileage - v_prev_mileage)) * 100;
  ELSE
    v_consumption := NULL;
  END IF;
  
  -- Insérer le plein
  INSERT INTO fuel_records (
    company_id,
    vehicle_id,
    fuel_type,
    quantity_liters,
    price_total,
    price_per_liter,
    mileage_at_fill,
    station_name,
    consumption_l_per_100km,
    notes
  ) VALUES (
    v_company_id,
    p_vehicle_id,
    p_fuel_type,
    p_liters,
    p_price_total,
    ROUND((p_price_total / p_liters)::numeric, 3),
    p_mileage,
    p_station_name,
    v_consumption,
    COALESCE(p_notes, '') || ' (Saisi via QR Code par ' || COALESCE(p_driver_name, 'Conducteur') || ')'
  )
  RETURNING id INTO v_record_id;
  
  -- Mettre à jour le kilométrage du véhicule si nécessaire
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND COALESCE(mileage, 0) < p_mileage;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_id', v_record_id,
    'ticket_number', SUBSTRING(v_record_id::text, 1, 8),
    'consumption', v_consumption
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une inspection via QR (utilise vehicle_inspections existante)
CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_token UUID,
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
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id
  AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle_token != p_token::text THEN
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
  
  -- Créer l'inspection
  INSERT INTO vehicle_inspections (
    vehicle_id,
    company_id,
    mileage,
    fuel_level,
    driver_name,
    location,
    score,
    grade,
    status,
    reported_defects,
    cleanliness_exterior,
    cleanliness_interior,
    inspection_date,
    defects_count
  ) VALUES (
    p_vehicle_id,
    v_company_id,
    p_mileage,
    p_fuel_level,
    p_driver_name,
    p_location,
    p_score,
    p_grade,
    v_status,
    p_reported_defects,
    3,
    3,
    NOW(),
    jsonb_array_length(p_reported_defects)
  )
  RETURNING id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND COALESCE(mileage, 0) < p_mileage;
  
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

-- ============================================
-- 5. COMMENTAIRES
-- ============================================

COMMENT ON TABLE fuel_records IS 'Historique des pleins de carburant - accessible via QR Code en insertion uniquement';
COMMENT ON COLUMN vehicles.qr_code_data IS 'Token UUID pour accès public QR Code - régénérable si compromis';
COMMENT ON FUNCTION verify_qr_token IS 'Vérifie la validité d un token QR Code - usage public';
COMMENT ON FUNCTION create_public_fuel_record IS 'Crée un plein via accès QR Code - rate limiting côté app';
COMMENT ON FUNCTION create_public_inspection IS 'Crée une inspection via accès QR Code - rate limiting côté app';

-- ============================================
-- 6. VÉRIFICATION
-- ============================================
SELECT 
  'Migration QR Code Triple Accès terminée' as status,
  (SELECT COUNT(*) FROM vehicles) as total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE qr_code_data IS NOT NULL) as with_token,
  (SELECT COUNT(*) FROM fuel_records) as fuel_records_count;
