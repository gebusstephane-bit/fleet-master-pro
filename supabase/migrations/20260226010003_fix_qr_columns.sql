-- ============================================
-- FIX: Ajout des colonnes QR Code - VERSION MINIMALE
-- ============================================

-- Étape 1: S'assurer que companies existe
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Étape 2: Ajouter qr_code_data à vehicles (la table existe déjà selon vos données)
DO $$
BEGIN
  -- Vérifier si la colonne existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'qr_code_data'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN qr_code_data UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Étape 3: Index
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);

-- Étape 4: Mettre à jour les véhicules existants qui n'ont pas de token
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- Étape 5: Créer fuel_records (table principale pour les pleins)
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  vehicle_id UUID NOT NULL,
  driver_id UUID,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fuel_type TEXT CHECK (fuel_type IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg')),
  quantity_liters DECIMAL(8,2) NOT NULL,
  price_total DECIMAL(10,2) NOT NULL,
  price_per_liter DECIMAL(8,3),
  mileage_at_fill INTEGER NOT NULL,
  consumption_l_per_100km DECIMAL(5,2),
  station_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Étape 6: Index fuel_records
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company ON fuel_records(company_id);

-- Étape 7: Activer RLS sur fuel_records
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Étape 8: Créer les policies (si la table profiles existe)
DO $$
BEGIN
  -- Vérifier si profiles existe avant de créer les policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Policy SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'fuel_records' AND policyname = 'fuel_records_company_select'
    ) THEN
      CREATE POLICY fuel_records_company_select ON fuel_records
        FOR SELECT USING (
          company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    -- Policy INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'fuel_records' AND policyname = 'fuel_records_company_insert'
    ) THEN
      CREATE POLICY fuel_records_company_insert ON fuel_records
        FOR INSERT WITH CHECK (
          company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- Étape 9: Fonction pour créer un plein via QR (simplifiée)
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
  v_vehicle_token UUID;
BEGIN
  -- Récupérer le token et company_id du véhicule
  SELECT qr_code_data, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'active';
  
  -- Vérifier le token
  IF v_vehicle_token IS NULL OR v_vehicle_token != p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Insérer le plein
  INSERT INTO fuel_records (
    company_id, vehicle_id, fuel_type, quantity_liters, price_total,
    price_per_liter, mileage_at_fill, station_name, notes
  ) VALUES (
    v_company_id, p_vehicle_id, p_fuel_type, p_liters, p_price_total,
    ROUND((p_price_total / p_liters)::numeric, 3), p_mileage, p_station_name,
    'Saisi par ' || COALESCE(p_driver_name, 'Conducteur') || ' via QR'
  )
  RETURNING id INTO v_record_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage), updated_at = NOW()
  WHERE id = p_vehicle_id AND mileage < p_mileage;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_id', v_record_id,
    'ticket_number', SUBSTRING(v_record_id::text, 1, 8)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 10: Fonction de vérification token
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token UUID
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT id, registration_number, brand, model, type, qr_code_data
  INTO v_vehicle
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Véhicule non trouvé');
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
