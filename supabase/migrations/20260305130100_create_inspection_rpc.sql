-- ============================================================================
-- FONCTION RPC : create_inspection_safe
-- Objectif : Créer une inspection avec validation du kilométrage
-- ============================================================================

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
  p_compartment_c1_temp DECIMAL DEFAULT NULL,
  p_compartment_c2_temp DECIMAL DEFAULT NULL,
  p_tires_condition JSONB DEFAULT '{
    "front_left": {"wear": "OK", "damage": null, "pressure": null},
    "front_right": {"wear": "OK", "damage": null, "pressure": null},
    "rear_left": {"wear": "OK", "damage": null, "pressure": null},
    "rear_right": {"wear": "OK", "damage": null, "pressure": null},
    "spare": {"wear": "OK", "damage": null, "pressure": null}
  }'::jsonb,
  p_reported_defects JSONB DEFAULT '[]'::jsonb,
  p_photos JSONB DEFAULT '[]'::jsonb,
  p_driver_name TEXT DEFAULT '',
  p_driver_signature TEXT DEFAULT NULL,
  p_inspector_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'Dépôt',
  p_created_by UUID DEFAULT NULL,
  p_score INTEGER DEFAULT 100,
  p_grade TEXT DEFAULT 'A',
  p_status TEXT DEFAULT 'PENDING'
)
RETURNS JSONB AS $$
DECLARE
  v_inspection_id UUID;
  v_current_mileage INTEGER;
  v_result JSONB;
BEGIN
  -- Vérifier que le véhicule existe et récupérer son kilométrage actuel
  SELECT mileage INTO v_current_mileage
  FROM vehicles
  WHERE id = p_vehicle_id;

  IF v_current_mileage IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Véhicule non trouvé'
    );
  END IF;

  -- Validation : le kilométrage doit être >= au kilométrage actuel
  IF p_mileage < v_current_mileage THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Kilométrage invalide : %s km est inférieur au kilométrage actuel (%s km)', 
        p_mileage, v_current_mileage)
    );
  END IF;

  -- Validation : max 4 photos
  IF jsonb_array_length(COALESCE(p_photos, '[]'::jsonb)) > 4 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maximum 4 photos autorisées'
    );
  END IF;

  -- Insérer l'inspection
  INSERT INTO vehicle_inspections (
    vehicle_id,
    company_id,
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
    status,
    inspection_date
  ) VALUES (
    p_vehicle_id,
    p_company_id,
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
    p_status::inspection_status,
    NOW()
  )
  RETURNING id INTO v_inspection_id;

  -- Mettre à jour le kilométrage du véhicule si nécessaire
  UPDATE vehicles 
  SET mileage = GREATEST(mileage, p_mileage),
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND mileage < p_mileage;

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'message', 'Inspection créée avec succès'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION create_inspection_safe IS 'Crée une inspection véhicule avec validation du kilométrage et gestion des photos (max 4)';

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION create_inspection_safe TO authenticated;
GRANT EXECUTE ON FUNCTION create_inspection_safe TO anon;
