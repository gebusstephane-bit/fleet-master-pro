-- ============================================
-- MIGRATION: Système QR Code Triple Accès - VERSION CORRIGÉE
-- ============================================

-- ============================================
-- 1. TABLES DE BASE (création conditionnelle)
-- ============================================

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'EXPLOITANT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLE VEHICLES AVEC TOUTES LES COLONNES
-- ============================================

-- Supprimer et recréer vehicles si elle existe sans les bonnes colonnes
-- (Alternative: utiliser ALTER TABLE, mais c'est plus complexe)
DO $$
BEGIN
  -- Vérifier si vehicles existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
    -- Vérifier si company_id manque
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND column_name = 'company_id'
    ) THEN
      -- Ajouter toutes les colonnes manquantes
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS qr_code_data UUID DEFAULT gen_random_uuid();
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_number TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS type TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  ELSE
    -- Créer la table vehicles complète
    CREATE TABLE vehicles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      registration_number TEXT,
      brand TEXT,
      model TEXT,
      type TEXT,
      status TEXT DEFAULT 'active',
      mileage INTEGER DEFAULT 0,
      qr_code_data UUID DEFAULT gen_random_uuid(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id);

-- ============================================
-- 3. TABLE FUEL_RECORDS
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

CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);

-- ============================================
-- 4. TABLE VEHICLE_INSPECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  mileage INTEGER NOT NULL,
  fuel_level INTEGER CHECK (fuel_level BETWEEN 0 AND 100),
  driver_name TEXT,
  location TEXT DEFAULT 'Dépôt',
  score INTEGER,
  grade TEXT,
  status TEXT DEFAULT 'PENDING',
  reported_defects JSONB DEFAULT '[]'::jsonb,
  cleanliness_exterior INTEGER DEFAULT 3,
  cleanliness_interior INTEGER DEFAULT 3,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_token UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company ON vehicle_inspections(company_id);

-- ============================================
-- 5. TABLE MAINTENANCE_RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT,
  status TEXT DEFAULT 'DEMANDE_CREEE',
  description TEXT,
  priority TEXT DEFAULT 'NORMAL',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. TABLE ACTIVITY_LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Fuel records policies
DROP POLICY IF EXISTS fuel_records_company_select ON fuel_records;
CREATE POLICY fuel_records_company_select ON fuel_records
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS fuel_records_company_insert ON fuel_records;
CREATE POLICY fuel_records_company_insert ON fuel_records
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Inspections policies
DROP POLICY IF EXISTS inspections_company_isolation ON vehicle_inspections;
CREATE POLICY inspections_company_isolation ON vehicle_inspections
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- 8. FONCTIONS RPC
-- ============================================

-- verify_qr_token
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token UUID
)
RETURNS TABLE (
  id UUID,
  registration_number TEXT,
  type TEXT,
  brand TEXT,
  model TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.registration_number::TEXT,
    v.type::TEXT,
    v.brand::TEXT,
    v.model::TEXT,
    (v.qr_code_data = p_token AND v.status = 'active')::BOOLEAN as is_valid
  FROM vehicles v
  WHERE v.id = p_vehicle_id
  AND v.qr_code_data = p_token
  AND v.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_public_fuel_record
CREATE OR REPLACE FUNCTION create_public_fuel_record(
  p_vehicle_id UUID,
  p_token UUID,
  p_fuel_type TEXT,
  p_liters DECIMAL,
  p_price_total DECIMAL,
  p_mileage INTEGER,
  p_station_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  record_id UUID,
  ticket_number TEXT,
  consumption_calculated DECIMAL
) AS $$
DECLARE
  v_company_id UUID;
  v_record_id UUID;
  v_consumption DECIMAL;
  v_prev_mileage INTEGER;
  v_prev_liters DECIMAL;
BEGIN
  SELECT v.company_id INTO v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id
  AND v.qr_code_data = p_token
  AND v.status = 'active';
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;
  
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
  
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, price_total,
    price_per_liter, mileage_at_fill, station_name, consumption_l_per_100km, notes
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters, p_price_total,
    ROUND((p_price_total / p_liters)::numeric, 3), p_mileage, p_station_name,
    v_consumption, COALESCE(p_notes, '') || ' (QR Code)'
  )
  RETURNING fuel_records.id INTO v_record_id;
  
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage), updated_at = NOW()
  WHERE id = p_vehicle_id AND mileage < p_mileage;
  
  INSERT INTO activity_logs (company_id, action_type, entity_type, entity_id, description, metadata)
  VALUES (
    v_company_id, 'FUEL_RECORD_PUBLIC_CREATED', 'fuel_record', v_record_id,
    'Plein via QR Code', jsonb_build_object('liters', p_liters, 'public_access', true)
  );
  
  RETURN QUERY SELECT v_record_id, SUBSTRING(v_record_id::text, 1, 8)::TEXT, v_consumption;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_public_inspection
CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_token UUID,
  p_mileage INTEGER,
  p_fuel_level INTEGER,
  p_driver_name TEXT,
  p_location TEXT DEFAULT 'Dépôt',
  p_score INTEGER DEFAULT 100,
  p_grade TEXT DEFAULT 'A',
  p_status TEXT DEFAULT 'PENDING',
  p_reported_defects JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  inspection_id UUID,
  ticket_number TEXT
) AS $$
DECLARE
  v_company_id UUID;
  v_inspection_id UUID;
BEGIN
  SELECT v.company_id INTO v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id
  AND v.qr_code_data = p_token
  AND v.status = 'active';
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;
  
  INSERT INTO vehicle_inspections (
    vehicle_id, company_id, mileage, fuel_level, driver_name, location,
    score, grade, status, reported_defects, cleanliness_exterior, cleanliness_interior, inspection_date
  ) VALUES (
    p_vehicle_id, v_company_id, p_mileage, p_fuel_level, p_driver_name, p_location,
    p_score, p_grade, p_status, p_reported_defects, 3, 3, NOW()
  )
  RETURNING vehicle_inspections.id INTO v_inspection_id;
  
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage), updated_at = NOW()
  WHERE id = p_vehicle_id AND mileage < p_mileage;
  
  INSERT INTO maintenance_records (vehicle_id, company_id, type, status, description, priority)
  SELECT 
    p_vehicle_id, v_company_id, 'CORRECTIVE', 'DEMANDE_CREEE',
    '[QR #' || v_inspection_id || '] ' || (defect->>'description'), 'HIGH'
  FROM jsonb_array_elements(p_reported_defects) AS defect
  WHERE (defect->>'severity') = 'CRITIQUE';
  
  INSERT INTO activity_logs (company_id, action_type, entity_type, entity_id, description, metadata)
  VALUES (
    v_company_id, 'INSPECTION_PUBLIC_CREATED', 'vehicle_inspection', v_inspection_id,
    'Contrôle QR par ' || p_driver_name, jsonb_build_object('score', p_score, 'public_access', true)
  );
  
  RETURN QUERY SELECT v_inspection_id, SUBSTRING(v_inspection_id::text, 1, 8)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. MISE À JOUR DES VÉHICULES EXISTANTS
-- ============================================

UPDATE vehicles SET qr_code_data = gen_random_uuid() WHERE qr_code_data IS NULL;
