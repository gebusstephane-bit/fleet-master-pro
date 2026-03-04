-- ============================================================================
-- MIGRATION COMPLÈTE : Harmonisation des statuts véhicules
-- ============================================================================
-- À exécuter dans l'ordre dans Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 0 : Sauvegarde (optionnel mais recommandé)
-- ----------------------------------------------------------------------------
-- CREATE TABLE vehicles_backup AS SELECT * FROM vehicles;

-- ----------------------------------------------------------------------------
-- ÉTAPE 1 : Vérifier les statuts actuels avant migration
-- ----------------------------------------------------------------------------
SELECT 'STATUTS AVANT MIGRATION' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM vehicles 
GROUP BY status 
ORDER BY status;

-- ----------------------------------------------------------------------------
-- ÉTAPE 2 : Supprimer temporairement la contrainte CHECK (si elle existe)
-- ----------------------------------------------------------------------------
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

-- ----------------------------------------------------------------------------
-- ÉTAPE 3 : Migrer les données (tous les cas possibles)
-- ----------------------------------------------------------------------------
SELECT 'MIGRATION DES DONNÉES...' as info;

-- Actif (toutes variantes possibles)
UPDATE vehicles 
SET status = 'ACTIF' 
WHERE LOWER(status) IN ('active', 'actif') 
   OR status IN ('Actif', 'ACTIF');

-- Inactif (toutes variantes possibles)
UPDATE vehicles 
SET status = 'INACTIF' 
WHERE LOWER(status) IN ('inactive', 'inactif', 'hors_service') 
   OR status IN ('Inactif', 'INACTIF', 'HORS_SERVICE');

-- En maintenance (toutes variantes possibles)
UPDATE vehicles 
SET status = 'EN_MAINTENANCE' 
WHERE LOWER(status) IN ('maintenance', 'en_maintenance') 
   OR status IN ('Maintenance', 'EN_MAINTENANCE', 'En maintenance');

-- Archivé (toutes variantes possibles)
UPDATE vehicles 
SET status = 'ARCHIVE' 
WHERE LOWER(status) IN ('retired', 'archived', 'archive') 
   OR status IN ('Retired', 'Archived', 'Archive', 'ARCHIVE');

-- ----------------------------------------------------------------------------
-- ÉTAPE 4 : Vérifier qu'il ne reste que les 4 statuts standards
-- ----------------------------------------------------------------------------
SELECT 'STATUTS APRÈS MIGRATION' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM vehicles 
GROUP BY status 
ORDER BY status;

-- Si des statuts non reconnus subsistent, les afficher :
SELECT 'STATUTS NON RECONNUS (à corriger manuellement)' as warning;
SELECT DISTINCT status 
FROM vehicles 
WHERE status NOT IN ('ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE');

-- ----------------------------------------------------------------------------
-- ÉTAPE 5 : Ajouter la nouvelle contrainte CHECK
-- ----------------------------------------------------------------------------
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_status_check 
CHECK (status IN ('ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE'));

-- ----------------------------------------------------------------------------
-- ÉTAPE 6 : Mettre à jour les fonctions stockées
-- ----------------------------------------------------------------------------

-- Fonction create_fuel_session
CREATE OR REPLACE FUNCTION create_fuel_session(
  p_vehicle_id UUID,
  p_driver_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_vehicle_record RECORD;
BEGIN
  -- Vérifier que le véhicule existe et est actif (NOUVEAU STATUT)
  SELECT id, registration_number, brand, model
  INTO v_vehicle_record
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'ACTIF';  -- ← MODIFIÉ: 'active' → 'ACTIF'
  
  IF v_vehicle_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Véhicule introuvable ou inactif'
    );
  END IF;
  
  -- Créer la session
  INSERT INTO fuel_sessions (
    vehicle_id,
    driver_id,
    company_id,
    status,
    created_at
  ) VALUES (
    p_vehicle_id,
    p_driver_id,
    p_company_id,
    'active',
    NOW()
  )
  RETURNING id INTO v_session_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'vehicle', jsonb_build_object(
      'id', v_vehicle_record.id,
      'registration', v_vehicle_record.registration_number,
      'brand', v_vehicle_record.brand,
      'model', v_vehicle_record.model
    )
  );
END;
$$;

-- Fonction create_public_fuel_record
CREATE OR REPLACE FUNCTION create_public_fuel_record(
  p_vehicle_id UUID,
  p_driver_id UUID,
  p_mileage INTEGER,
  p_quantity NUMERIC,
  p_total_cost NUMERIC,
  p_fuel_type TEXT DEFAULT 'diesel',
  p_station_name TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_ticket_number TEXT;
  v_consumption NUMERIC;
  v_last_mileage INTEGER;
  v_distance INTEGER;
BEGIN
  -- Vérifier que le véhicule existe et est actif (NOUVEAU STATUT)
  SELECT company_id, mileage
  INTO v_company_id, v_last_mileage
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'ACTIF';  -- ← MODIFIÉ: 'active' → 'ACTIF'
  
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Véhicule introuvable ou inactif'
    );
  END IF;
  
  -- Générer numéro de ticket
  v_ticket_number := 'CARB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
  
  -- Calculer consommation
  v_distance := p_mileage - COALESCE(v_last_mileage, 0);
  IF v_distance > 0 AND p_quantity > 0 THEN
    v_consumption := ROUND((p_quantity / v_distance) * 100, 2);
  ELSE
    v_consumption := NULL;
  END IF;
  
  -- Insérer le record
  INSERT INTO fuel_records (
    ticket_number,
    vehicle_id,
    driver_id,
    company_id,
    mileage,
    quantity_liters,
    total_cost,
    fuel_type,
    station_name,
    location,
    photo_url,
    consumption_l_per_100km,
    created_at
  ) VALUES (
    v_ticket_number,
    p_vehicle_id,
    p_driver_id,
    v_company_id,
    p_mileage,
    p_quantity,
    p_total_cost,
    p_fuel_type,
    p_station_name,
    p_location,
    p_photo_url,
    v_consumption,
    NOW()
  );
  
  -- Mettre à jour le kilométrage du véhicule
  UPDATE vehicles 
  SET mileage = p_mileage,
      updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'ticket_number', v_ticket_number,
    'consumption', v_consumption
  );
END;
$$;

-- Fonction verify_qr_token
CREATE OR REPLACE FUNCTION verify_qr_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  SELECT v.id, v.registration_number, v.brand, v.model, v.status
  INTO v_vehicle
  FROM vehicles v
  WHERE v.qr_code_data = p_token
    AND v.status = 'ACTIF'  -- ← MODIFIÉ: 'active' → 'ACTIF'
  LIMIT 1;
  
  IF v_vehicle IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token invalide ou véhicule inactif');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'vehicle_id', v_vehicle.id,
    'registration', v_vehicle.registration_number,
    'brand', v_vehicle.brand,
    'model', v_vehicle.model,
    'status', v_vehicle.status
  );
END;
$$;

-- Fonction create_public_inspection
CREATE OR REPLACE FUNCTION create_public_inspection(
  p_vehicle_id UUID,
  p_driver_id UUID,
  p_type TEXT,
  p_mileage INTEGER,
  p_fuel_level INTEGER DEFAULT NULL,
  p_cleanliness_exterior INTEGER DEFAULT NULL,
  p_cleanliness_interior INTEGER DEFAULT NULL,
  p_tire_condition TEXT DEFAULT NULL,
  p_lights_working BOOLEAN DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_inspection_id UUID;
  v_ticket_number TEXT;
BEGIN
  -- Vérifier que le véhicule existe et est actif (NOUVEAU STATUT)
  SELECT company_id
  INTO v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'ACTIF';  -- ← MODIFIÉ: 'active' → 'ACTIF'
  
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Véhicule introuvable ou inactif'
    );
  END IF;
  
  -- Générer numéro de ticket
  v_ticket_number := 'INSP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
  
  -- Insérer l'inspection
  INSERT INTO inspections (
    ticket_number,
    vehicle_id,
    driver_id,
    company_id,
    type,
    status,
    mileage,
    fuel_level,
    cleanliness_exterior,
    cleanliness_interior,
    tire_condition,
    lights_working,
    notes,
    created_at
  ) VALUES (
    v_ticket_number,
    p_vehicle_id,
    p_driver_id,
    v_company_id,
    p_type,
    'PASSED',
    p_mileage,
    p_fuel_level,
    p_cleanliness_exterior,
    p_cleanliness_interior,
    p_tire_condition,
    p_lights_working,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'ticket_number', v_ticket_number,
    'status', 'PASSED'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- ÉTAPE 7 : Vérification finale
-- ----------------------------------------------------------------------------
SELECT 'RÉCAPITULATIF FINAL' as info;
SELECT 
  status,
  COUNT(*) as count,
  CASE status
    WHEN 'ACTIF' THEN '✅ Actif'
    WHEN 'INACTIF' THEN '⚠️ Inactif'
    WHEN 'EN_MAINTENANCE' THEN '🔧 En maintenance'
    WHEN 'ARCHIVE' THEN '📦 Archivé'
    ELSE '❌ INCONNU!'
  END as label
FROM vehicles 
GROUP BY status 
ORDER BY status;

-- Vérifier la contrainte
SELECT 'CONTRAINTE CHECK' as info;
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'vehicles_status_check';
