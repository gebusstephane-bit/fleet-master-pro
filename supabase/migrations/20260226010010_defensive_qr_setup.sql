-- ============================================
-- MIGRATION DÉFENSIVE: Système QR Code
-- Vérifie l'existence de tout avant création
-- ============================================

-- ============================================
-- 1. S'ASSURER QUE TOUTES LES TABLES EXISTENT
-- ============================================

-- Companies (table de base)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles (avec TOUTES les colonnes nécessaires)
DO $$
BEGIN
  -- Créer la table si elle n'existe pas
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'EXPLOITANT',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Ajouter les colonnes manquantes une par une
  BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'company_id existe déjà ou erreur: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'EXPLOITANT';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'role existe déjà ou erreur: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'email existe déjà ou erreur: %', SQLERRM;
  END;
END $$;

-- Vehicles (vérifier colonnes)
DO $$
BEGIN
  BEGIN
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vehicles.company_id: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS qr_code_data TEXT DEFAULT gen_random_uuid()::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vehicles.qr_code_data: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vehicles.status: %', SQLERRM;
  END;
END $$;

-- ============================================
-- 2. CONVERTIR LES ANCIENS TOKENS
-- ============================================

UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data, '')) < 30;

-- S'assurer qu'aucun véhicule n'a de token NULL
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()::text
WHERE qr_code_data IS NULL;

-- Mettre à jour les véhicules sans company_id
UPDATE vehicles 
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- ============================================
-- 3. TABLE FUEL_RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
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

-- ============================================
-- 4. RLS POLICIES (VERSION SIMPLIFIÉE)
-- ============================================

-- Activer RLS
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS fuel_records_select ON fuel_records;
DROP POLICY IF EXISTS fuel_records_insert ON fuel_records;
DROP POLICY IF EXISTS fuel_records_company_select ON fuel_records;
DROP POLICY IF EXISTS fuel_records_company_insert ON fuel_records;

-- Créer une fonction de vérification sécurisée
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy SELECT utilisant la fonction
CREATE POLICY fuel_records_select ON fuel_records
  FOR SELECT
  USING (company_id = get_user_company_id());

-- Policy INSERT
CREATE POLICY fuel_records_insert ON fuel_records
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- ============================================
-- 5. FONCTIONS RPC POUR QR CODE
-- ============================================

-- Fonction de vérification token
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

-- Fonction création plein
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

-- ============================================
-- 6. VÉRIFICATION
-- ============================================

SELECT 
  'Migration terminée' as status,
  (SELECT COUNT(*) FROM companies) as companies,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM vehicles) as vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE qr_code_data IS NOT NULL) as with_token;
