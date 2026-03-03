-- ============================================
-- MIGRATION: Système QR Code Triple Accès
-- Inspection, Carburant (anonymes), Carnet Digital (auth)
-- ============================================

-- ============================================
-- 0. TABLES DE BASE (si non existantes)
-- ============================================

-- Créer companies si elle n'existe pas
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer profiles si elle n'existe pas
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

-- Créer drivers si elle n'existe pas
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer vehicles si elle n'existe pas (structure minimale)
CREATE TABLE IF NOT EXISTS vehicles (
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

-- ============================================
-- 1. AJOUT COLUMNS À VEHICLES POUR TOKENS QR
-- ============================================

-- Ajouter company_id si non existante (clé étrangère vers companies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ajouter qr_code_data si non existante (token d'accès public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'qr_code_data'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN qr_code_data UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Ajouter status si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Ajouter mileage si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'mileage'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mileage INTEGER DEFAULT 0;
  END IF;
END $$;

-- Ajouter registration_number si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_number TEXT;
  END IF;
END $$;

-- Ajouter brand si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'brand'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN brand TEXT;
  END IF;
END $$;

-- Ajouter model si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'model'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN model TEXT;
  END IF;
END $$;

-- Ajouter type si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN type TEXT;
  END IF;
END $$;

-- Ajouter updated_at si non existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Créer vehicle_inspections si elle n'existe pas
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

-- S'assurer que access_token existe sur vehicle_inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_inspections' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE vehicle_inspections ADD COLUMN access_token UUID;
  END IF;
END $$;

-- Index sur qr_code_data pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);

-- Créer maintenance_records si elle n'existe pas
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

-- Créer activity_logs si elle n'existe pas
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
-- 2. TABLE FUEL_RECORDS (si pas déjà créée)
-- ============================================

CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  
  -- Données du plein
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fuel_type TEXT CHECK (fuel_type IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg')),
  quantity_liters DECIMAL(8,2) NOT NULL,
  price_total DECIMAL(10,2) NOT NULL,
  price_per_liter DECIMAL(8,3),
  mileage_at_fill INTEGER NOT NULL,
  
  -- Calcul automatique
  consumption_l_per_100km DECIMAL(5,2),
  
  -- Station service
  station_name TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Traçabilité
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_mileage ON fuel_records(vehicle_id, mileage_at_fill);

-- Trigger pour updated_at
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
-- 3. RLS POLICIES - ISOLEMENT TOTAL
-- ============================================

-- Activer RLS sur fuel_records
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs authentifiés voient uniquement les records de leur entreprise
DROP POLICY IF EXISTS fuel_records_company_select ON fuel_records;
CREATE POLICY fuel_records_company_select ON fuel_records
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Les utilisateurs authentifiés insèrent uniquement dans leur entreprise
DROP POLICY IF EXISTS fuel_records_company_insert ON fuel_records;
CREATE POLICY fuel_records_company_insert ON fuel_records
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Les utilisateurs authentifiés modifient uniquement leur entreprise
DROP POLICY IF EXISTS fuel_records_company_update ON fuel_records;
CREATE POLICY fuel_records_company_update ON fuel_records
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 4. FONCTIONS RPC SÉCURISÉES POUR ACCÈS PUBLIC
-- ============================================

/**
 * Vérifie la validité d'un token QR Code et retourne les infos publiques du véhicule
 * Utilisée par les actions publiques avant affichage du formulaire
 */
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

/**
 * Crée un plein de carburant via accès public (QR Code)
 * Rate limiting doit être géré côté application
 */
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
  -- Vérifier le token et récupérer company_id
  SELECT v.company_id INTO v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id
  AND v.qr_code_data = p_token
  AND v.status = 'active';
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide ou véhicule non trouvé';
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
    COALESCE(p_notes, '') || ' (Saisi via QR Code)'
  )
  RETURNING fuel_records.id INTO v_record_id;
  
  -- Mettre à jour le kilométrage du véhicule si nécessaire
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND mileage < p_mileage;
  
  -- Logger l'activité
  INSERT INTO activity_logs (
    company_id,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_company_id,
    'FUEL_RECORD_PUBLIC_CREATED',
    'fuel_record',
    v_record_id,
    'Plein de carburant saisi via QR Code',
    jsonb_build_object(
      'fuel_type', p_fuel_type,
      'liters', p_liters,
      'public_access', true
    )
  );
  
  RETURN QUERY SELECT 
    v_record_id,
    SUBSTRING(v_record_id::text, 1, 8)::TEXT,
    v_consumption;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Crée une inspection via accès public (QR Code)
 */
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
  -- Vérifier le token et récupérer company_id
  SELECT v.company_id INTO v_company_id
  FROM vehicles v
  WHERE v.id = p_vehicle_id
  AND v.qr_code_data = p_token
  AND v.status = 'active';
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide ou véhicule non trouvé';
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
    inspection_date
  ) VALUES (
    p_vehicle_id,
    v_company_id,
    p_mileage,
    p_fuel_level,
    p_driver_name,
    p_location,
    p_score,
    p_grade,
    p_status,
    p_reported_defects,
    3,
    3,
    NOW()
  )
  RETURNING vehicle_inspections.id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage du véhicule si nécessaire
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND mileage < p_mileage;
  
  -- Créer maintenances pour défauts critiques
  INSERT INTO maintenance_records (
    vehicle_id,
    company_id,
    type,
    status,
    description,
    priority
  )
  SELECT 
    p_vehicle_id,
    v_company_id,
    'CORRECTIVE',
    'DEMANDE_CREEE',
    '[Contrôle QR #' || v_inspection_id || '] ' || (defect->>'description'),
    'HIGH'
  FROM jsonb_array_elements(p_reported_defects) AS defect
  WHERE (defect->>'severity') = 'CRITIQUE';
  
  -- Logger l'activité
  INSERT INTO activity_logs (
    company_id,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_company_id,
    'INSPECTION_PUBLIC_CREATED',
    'vehicle_inspection',
    v_inspection_id,
    'Contrôle pré-départ réalisé via QR Code par ' || p_driver_name,
    jsonb_build_object(
      'score', p_score,
      'grade', p_grade,
      'public_access', true
    )
  );
  
  RETURN QUERY SELECT 
    v_inspection_id,
    SUBSTRING(v_inspection_id::text, 1, 8)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. COMMENTAIRES DOCUMENTATION
-- ============================================

COMMENT ON TABLE fuel_records IS 'Historique des pleins de carburant - accessible via QR Code en insertion uniquement';
COMMENT ON COLUMN vehicles.qr_code_data IS 'Token UUID pour accès public QR Code - régénérable si compromis';
COMMENT ON FUNCTION verify_qr_token IS 'Vérifie la validité d un token QR Code - usage public';
COMMENT ON FUNCTION create_public_fuel_record IS 'Crée un plein via accès QR Code - rate limiting côté app';
COMMENT ON FUNCTION create_public_inspection IS 'Crée une inspection via accès QR Code - rate limiting côté app';

-- ============================================
-- 6. MISE À JOUR DES VÉHICULES EXISTANTS
-- ============================================

-- Générer des tokens pour les véhicules existants qui n'en ont pas
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;
