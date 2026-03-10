-- ============================================
-- SOLUTION: Fonction RPC pour créer une inspection
-- Bypass la vérification stricte de type enum
-- ============================================

CREATE OR REPLACE FUNCTION create_inspection_safe(
  p_vehicle_id UUID,
  p_company_id UUID,
  p_mileage INTEGER,
  p_fuel_level INTEGER,
  p_adblue_level INTEGER DEFAULT NULL,
  p_gnr_level INTEGER DEFAULT NULL,
  p_cleanliness_exterior INTEGER DEFAULT 3,
  p_cleanliness_interior INTEGER DEFAULT 3,
  p_cleanliness_cargo_area INTEGER DEFAULT NULL,
  p_compartment_c1_temp NUMERIC DEFAULT NULL,
  p_compartment_c2_temp NUMERIC DEFAULT NULL,
  p_tires_condition JSONB DEFAULT NULL,
  p_reported_defects JSONB DEFAULT '[]',
  p_photos JSONB DEFAULT '[]',
  p_driver_name TEXT DEFAULT NULL,
  p_driver_signature TEXT DEFAULT NULL,
  p_inspector_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'Dépôt',
  p_created_by UUID DEFAULT NULL,
  p_score INTEGER DEFAULT NULL,
  p_grade TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'COMPLETED'
)
RETURNS JSONB AS $$
DECLARE
  v_inspection_id UUID;
  v_current_mileage INTEGER;
BEGIN
  -- Vérifier que le kilométrage n'est pas inférieur au kilométrage actuel
  SELECT mileage INTO v_current_mileage
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_current_mileage IS NOT NULL AND p_mileage < v_current_mileage THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kilométrage invalide : ' || p_mileage || ' km est inférieur au kilométrage actuel (' || v_current_mileage || ' km)'
    );
  END IF;
  
  -- Insérer l'inspection (le cast ::inspection_status fonctionne côté SQL)
  INSERT INTO vehicle_inspections (
    vehicle_id,
    company_id,
    inspection_date,
    mileage,
    fuel_level,
    adblue_level,
    gnr_level,
    cleanliness_exterior,
    cleanliness_interior,
    cleanliness_cargo_area,
    compartment_c1_temp,
    compartment_c2_temp,
    tires_condition,
    reported_defects,
    photos,
    driver_name,
    driver_signature,
    inspector_notes,
    location,
    created_by,
    score,
    grade,
    status
  ) VALUES (
    p_vehicle_id,
    p_company_id,
    NOW(),
    p_mileage,
    p_fuel_level,
    p_adblue_level,
    p_gnr_level,
    p_cleanliness_exterior,
    p_cleanliness_interior,
    p_cleanliness_cargo_area,
    p_compartment_c1_temp,
    p_compartment_c2_temp,
    p_tires_condition,
    p_reported_defects,
    p_photos,
    p_driver_name,
    p_driver_signature,
    p_inspector_notes,
    p_location,
    p_created_by,
    p_score,
    p_grade,
    p_status::inspection_status  -- Cast explicite vers l'enum
  )
  RETURNING id INTO v_inspection_id;
  
  -- Mettre à jour le kilométrage du véhicule (protection GREATEST)
  UPDATE vehicles 
  SET mileage = GREATEST(COALESCE(mileage, 0), p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION create_inspection_safe TO authenticated;
GRANT EXECUTE ON FUNCTION create_inspection_safe TO anon;

SELECT 'Fonction create_inspection_safe créée avec succès' as status;
