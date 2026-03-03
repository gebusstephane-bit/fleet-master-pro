-- ============================================================================
-- CORRECTION: Validation kilométrage doit être supérieur au maximum existant
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
  v_vehicle_current_mileage INTEGER;
  v_max_existing_mileage INTEGER;
BEGIN
  -- Validation UUID
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token manquant', 'code', 'TOKEN_MISSING');
  END IF;
  
  IF p_token::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Format token invalide', 'code', 'TOKEN_INVALID_FORMAT');
  END IF;
  
  IF p_fuels IS NULL OR jsonb_array_length(p_fuels) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun carburant', 'code', 'NO_FUELS');
  END IF;
  
  IF jsonb_array_length(p_fuels) > 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 3 carburants', 'code', 'MAX_FUELS');
  END IF;

  -- Verification token ET recuperation kilometrage actuel du vehicule
  SELECT qr_code_data::text, company_id, COALESCE(mileage, 0)
  INTO v_vehicle_token, v_company_id, v_vehicle_current_mileage
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'active';
  
  IF v_vehicle_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicule non trouve', 'code', 'VEHICLE_NOT_FOUND');
  END IF;
  
  IF v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide', 'code', 'TOKEN_MISMATCH');
  END IF;

  -- Recuperer le kilometrage maximum des pleins existants pour ce vehicule
  SELECT COALESCE(MAX(mileage_at_fill), 0)
  INTO v_max_existing_mileage
  FROM fuel_records
  WHERE vehicle_id = p_vehicle_id
  AND mileage_at_fill IS NOT NULL;

  -- Boucle sur carburants
  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    v_fuel_type := lower(trim(v_fuel->>'type'));
    
    -- Validation fuel_type
    IF v_fuel_type IS NULL OR v_fuel_type NOT IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Type carburant invalide', 'code', 'INVALID_FUEL_TYPE');
    END IF;
    
    -- Validation litres
    BEGIN
      v_liters := (v_fuel->>'liters')::DECIMAL;
      IF v_liters IS NULL OR v_liters <= 0 OR v_liters > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantite invalide', 'code', 'INVALID_LITERS');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format quantite invalide', 'code', 'INVALID_LITERS_FORMAT');
    END;
    
    -- Validation prix
    BEGIN
      v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
      IF v_price IS NOT NULL AND (v_price < 0 OR v_price > 10000) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prix invalide', 'code', 'INVALID_PRICE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format prix invalide', 'code', 'INVALID_PRICE_FORMAT');
    END;
    
    -- Validation mileage
    BEGIN
      v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);
      IF v_mileage IS NOT NULL AND (v_mileage < 0 OR v_mileage > 9999999) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage invalide', 'code', 'INVALID_MILEAGE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format kilometrage invalide', 'code', 'INVALID_MILEAGE_FORMAT');
    END;

    -- ===================================================================
    -- VALIDATION CRITIQUE: Kilometrage doit etre superieur au maximum existant
    -- ===================================================================
    IF v_fuel_type != 'gnr' AND v_mileage IS NOT NULL THEN
      -- Verifier contre le kilometrage du vehicule
      IF v_mileage < v_vehicle_current_mileage THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Kilometrage saisi (' || v_mileage || ') inferieur au kilometrage actuel du vehicule (' || v_vehicle_current_mileage || '). Impossible de revenir en arriere.',
          'code', 'MILEAGE_TOO_LOW'
        );
      END IF;
      
      -- Verifier contre les pleins existants
      IF v_mileage < v_max_existing_mileage THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Kilometrage saisi (' || v_mileage || ') inferieur au dernier plein enregistre (' || v_max_existing_mileage || '). Saisie impossible.',
          'code', 'MILEAGE_LOWER_THAN_PREVIOUS'
        );
      END IF;
    END IF;

    -- Logique GNR
    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL;
    ELSE
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage requis pour ' || v_fuel_type, 'code', 'MILEAGE_REQUIRED');
      END IF;
      
      -- Calcul consommation
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
    
    -- Insertion
    INSERT INTO fuel_records (
      company_id, vehicle_id, fuel_type, quantity_liters,
      price_total, price_per_liter, mileage_at_fill,
      consumption_l_per_100km, station_name, driver_name, notes, created_at
    ) VALUES (
      v_company_id, p_vehicle_id, v_fuel_type, v_liters,
      v_price,
      CASE WHEN v_price IS NOT NULL AND v_liters > 0 THEN ROUND((v_price / v_liters)::numeric, 3) ELSE NULL END,
      v_mileage, v_consumption, p_station_name, p_driver_name, 'Saisi via QR', NOW()
    )
    RETURNING id INTO v_record_id;
    
    v_record_ids := array_append(v_record_ids, v_record_id);
  END LOOP;
  
  -- Mise a jour kilometrage vehicule
  IF v_max_mileage > 0 THEN
    UPDATE vehicles 
    SET mileage = GREATEST(COALESCE(mileage, 0), v_max_mileage), updated_at = NOW()
    WHERE id = p_vehicle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_ids', v_record_ids,
    'count', COALESCE(array_length(v_record_ids, 1), 0),
    'ticket_number', SUBSTRING(v_record_ids[1]::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_fuel_session error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', 'Erreur interne', 'code', 'INTERNAL_ERROR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;

SELECT 'Fonction mise a jour avec validation kilometrage' as status;
