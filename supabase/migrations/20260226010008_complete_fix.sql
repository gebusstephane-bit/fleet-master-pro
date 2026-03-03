-- ============================================
-- MIGRATION COMPLÈTE: Fix de toutes les dépendances
-- ============================================

-- ============================================
-- 1. TABLES DE BASE (avec toutes les colonnes)
-- ============================================

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer une entreprise par défaut si aucune n'existe
INSERT INTO companies (id, name)
SELECT gen_random_uuid(), 'Entreprise par défaut'
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Profiles avec toutes les colonnes
DO $$
BEGIN
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
  
  -- Ajouter les colonnes si la table existe déjà
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
      ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
      ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'EXPLOITANT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
  END IF;
END $$;

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
-- 2. VEHICLES - Vérifier toutes les colonnes
-- ============================================

DO $$
BEGIN
  -- Colonnes obligatoires pour le système QR
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'qr_code_data') THEN
    ALTER TABLE vehicles ADD COLUMN qr_code_data UUID DEFAULT gen_random_uuid();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'company_id') THEN
    ALTER TABLE vehicles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'status') THEN
    ALTER TABLE vehicles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'mileage') THEN
    ALTER TABLE vehicles ADD COLUMN mileage INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. FIX QR CODE DATA (convertir anciens formats)
-- ============================================

-- Récupérer l'ID de la première entreprise pour les véhicules sans company_id
DO $$
DECLARE
  v_default_company_id UUID;
BEGIN
  SELECT id INTO v_default_company_id FROM companies LIMIT 1;
  
  -- Mettre à jour les véhicules sans company_id
  UPDATE vehicles 
  SET company_id = v_default_company_id
  WHERE company_id IS NULL;
END $$;

-- Convertir les anciens tokens en UUID
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data::text, '')) != 36;

-- S'assurer qu'il n'y a plus de NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- ============================================
-- 4. TABLES POUR LE SYSTÈME QR
-- ============================================

-- Fuel records
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);

-- Vehicle inspections
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  mileage INTEGER NOT NULL DEFAULT 0,
  fuel_level INTEGER DEFAULT 50,
  driver_name TEXT,
  location TEXT DEFAULT 'Dépôt',
  score INTEGER DEFAULT 100,
  grade TEXT DEFAULT 'A',
  status TEXT DEFAULT 'PENDING',
  reported_defects JSONB DEFAULT '[]'::jsonb,
  cleanliness_exterior INTEGER DEFAULT 3,
  cleanliness_interior INTEGER DEFAULT 3,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections(vehicle_id);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'CORRECTIVE',
  status TEXT DEFAULT 'DEMANDE_CREEE',
  description TEXT,
  priority TEXT DEFAULT 'NORMAL',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. RLS POLICIES (après création des colonnes)
-- ============================================

ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Supprimer et recréer les policies
DROP POLICY IF EXISTS fuel_records_select ON fuel_records;
DROP POLICY IF EXISTS fuel_records_insert ON fuel_records;
DROP POLICY IF EXISTS vehicle_inspections_select ON vehicle_inspections;
DROP POLICY IF EXISTS maintenance_records_select ON maintenance_records;

-- Recréer avec les bonnes références
CREATE POLICY fuel_records_select ON fuel_records
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY fuel_records_insert ON fuel_records
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY vehicle_inspections_select ON vehicle_inspections
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY maintenance_records_select ON maintenance_records
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- 6. FONCTIONS RPC
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
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule non trouvé');
  END IF;
  
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, price_total,
    price_per_liter, mileage_at_fill, station_name, notes
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters, p_price_total,
    CASE WHEN p_liters > 0 THEN ROUND((p_price_total / p_liters)::numeric, 3) ELSE 0 END,
    p_mileage, p_station_name,
    'Saisi par ' || COALESCE(p_driver_name, 'Conducteur') || ' via QR'
  )
  RETURNING id INTO v_record_id;
  
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage), updated_at = NOW()
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
-- 7. VÉRIFICATION FINALE
-- ============================================
SELECT 
  'Migration QR Code terminée' as status,
  (SELECT COUNT(*) FROM vehicles) as total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE qr_code_data IS NOT NULL) as with_token,
  (SELECT COUNT(*) FROM companies) as companies,
  (SELECT COUNT(*) FROM profiles) as profiles;
