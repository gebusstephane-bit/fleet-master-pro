-- ============================================================================
-- Mettre à jour create_fuel_session pour stocker driver_name
-- ============================================================================

DROP FUNCTION IF EXISTS create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_fuel_session(
  p_vehicle_id UUID,
  p_token UUID,
  p_fuels JSONB,
  p_driver_name TEXT DEFAULT NULL,
  p_station_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_token TEXT;
  v_fuel JSONB;
  v_record_id UUID;
  v_record_ids UUID[] := ARRAY[]::UUID[];
  v_consumption DECIMAL;
  v_prev_mileage INTEGER;
  v_prev_liters DECIMAL;
  v_fuel_type TEXT;
  v_liters DECIMAL;
  v_price DECIMAL;
  v_mileage INTEGER;
  v_max_mileage INTEGER := 0;
BEGIN
  -- Vérification token
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'ACTIF';
  
  IF v_vehicle_token IS NULL OR v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide ou véhicule inactif');
  END IF;

  -- Validation
  IF p_fuels IS NULL OR jsonb_array_length(p_fuels) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun carburant fourni');
  END IF;

  IF jsonb_array_length(p_fuels) > 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum 3 carburants par session');
  END IF;

  -- Boucle sur chaque carburant
  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    v_fuel_type := lower(trim(v_fuel->>'type'));
    v_liters := NULLIF((v_fuel->>'liters')::DECIMAL, 0);
    v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
    v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);

    IF v_liters IS NULL OR v_liters <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quantité invalide pour ' || COALESCE(v_fuel_type, 'inconnu'));
    END IF;

    IF v_fuel_type NOT IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Type de carburant invalide: ' || COALESCE(v_fuel_type, 'NULL'));
    END IF;

    -- Logique GNR
    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL;
    ELSE
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilométrage requis pour ' || v_fuel_type);
      END IF;
      
      v_consumption := NULL;
      
      SELECT fr.mileage_at_fill, fr.quantity_liters
      INTO v_prev_mileage, v_prev_liters
      FROM fuel_records fr
      WHERE fr.vehicle_id = p_vehicle_id 
      AND fr.fuel_type = v_fuel_type
      AND fr.mileage_at_fill IS NOT NULL
      AND fr.mileage_at_fill < v_mileage
      ORDER BY fr.mileage_at_fill DESC
      LIMIT 1;
      
      IF v_prev_mileage IS NOT NULL AND (v_mileage - v_prev_mileage) > 0 THEN
        v_consumption := (v_prev_liters / (v_mileage - v_prev_mileage)::DECIMAL) * 100;
      END IF;
      
      IF v_mileage > v_max_mileage THEN
        v_max_mileage := v_mileage;
      END IF;
    END IF;
    
    -- Insertion avec driver_name
    INSERT INTO fuel_records (
      company_id, vehicle_id, fuel_type, quantity_liters,
      price_total, price_per_liter, mileage_at_fill,
      consumption_l_per_100km, station_name, driver_name, notes, created_at
    ) VALUES (
      v_company_id, p_vehicle_id, v_fuel_type, v_liters,
      v_price,
      CASE WHEN v_price IS NOT NULL AND v_liters > 0 
           THEN ROUND((v_price / v_liters)::numeric, 3)
           ELSE NULL END,
      v_mileage,
      v_consumption,
      p_station_name,
      p_driver_name,  -- STOCKER LE NOM DU CONDUCTEUR
      'Saisi via QR',
      NOW()
    )
    RETURNING id INTO v_record_id;
    
    v_record_ids := array_append(v_record_ids, v_record_id);
  END LOOP;
  
  -- Mise à jour kilométrage véhicule
  IF v_max_mileage > 0 THEN
    UPDATE vehicles 
    SET mileage = GREATEST(COALESCE(mileage, 0), v_max_mileage), 
        updated_at = NOW()
    WHERE id = p_vehicle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_ids', v_record_ids,
    'count', COALESCE(array_length(v_record_ids, 1), 0),
    'ticket_number', SUBSTRING(v_record_ids[1]::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;
