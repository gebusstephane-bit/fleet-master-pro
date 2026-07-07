-- ============================================
-- VERSIONING : fonctions create_fuel_session (audit — item C6 / 7)
-- ============================================
-- Ces 2 surcharges EXISTENT déjà en prod mais n'étaient définies dans AUCUNE
-- migration (uniquement dans des scripts sql/ non suivis) → base non
-- reconstructible. On les versionne ici À L'IDENTIQUE de la prod (dump du
-- 2026-07-05), en CREATE OR REPLACE (idempotent, sans changement fonctionnel).
--
-- ⚠️ Bug connu (surcharge 5-args) : le check `status = 'active'` (minuscule)
--    ne matche pas la convention app 'ACTIF' → le RPC renvoie VEHICLE_NOT_FOUND
--    et l'app bascule sur le fallback createFuelSessionDirect. Laissé FIDÈLE à
--    la prod ici ; correction à traiter séparément (polish).
-- ============================================

-- Surcharge 1 : création d'une session (fuel_sessions)
CREATE OR REPLACE FUNCTION public.create_fuel_session(p_vehicle_id uuid, p_driver_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_session_id UUID;
  v_vehicle_record RECORD;
BEGIN
  SELECT id, registration_number, brand, model
  INTO v_vehicle_record
  FROM vehicles
  WHERE id = p_vehicle_id AND status = 'ACTIF';

  IF v_vehicle_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Véhicule introuvable ou inactif');
  END IF;

  INSERT INTO fuel_sessions (vehicle_id, driver_id, company_id, status, created_at)
  VALUES (p_vehicle_id, p_driver_id, p_company_id, 'active', NOW())
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
$function$;

-- Surcharge 2 : session multi-carburants via QR (utilisée par public-scan.ts)
CREATE OR REPLACE FUNCTION public.create_fuel_session(p_vehicle_id uuid, p_token uuid, p_fuels jsonb, p_driver_name text DEFAULT NULL::text, p_station_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  SELECT COALESCE(MAX(mileage_at_fill), 0)
  INTO v_max_existing_mileage
  FROM fuel_records
  WHERE vehicle_id = p_vehicle_id AND mileage_at_fill IS NOT NULL;

  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    v_fuel_type := lower(trim(v_fuel->>'type'));

    IF v_fuel_type IS NULL OR v_fuel_type NOT IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Type carburant invalide', 'code', 'INVALID_FUEL_TYPE');
    END IF;

    BEGIN
      v_liters := (v_fuel->>'liters')::DECIMAL;
      IF v_liters IS NULL OR v_liters <= 0 OR v_liters > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantite invalide', 'code', 'INVALID_LITERS');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format quantite invalide', 'code', 'INVALID_LITERS_FORMAT');
    END;

    BEGIN
      v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
      IF v_price IS NOT NULL AND (v_price < 0 OR v_price > 10000) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prix invalide', 'code', 'INVALID_PRICE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format prix invalide', 'code', 'INVALID_PRICE_FORMAT');
    END;

    BEGIN
      v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);
      IF v_mileage IS NOT NULL AND (v_mileage < 0 OR v_mileage > 9999999) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage invalide', 'code', 'INVALID_MILEAGE');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Format kilometrage invalide', 'code', 'INVALID_MILEAGE_FORMAT');
    END;

    IF v_fuel_type != 'gnr' AND v_mileage IS NOT NULL THEN
      IF v_mileage < v_vehicle_current_mileage THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Kilometrage saisi (' || v_mileage || ') inferieur au kilometrage actuel du vehicule (' || v_vehicle_current_mileage || '). Impossible de revenir en arriere.',
          'code', 'MILEAGE_TOO_LOW'
        );
      END IF;

      IF v_mileage < v_max_existing_mileage THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Kilometrage saisi (' || v_mileage || ') inferieur au dernier plein enregistre (' || v_max_existing_mileage || '). Saisie impossible.',
          'code', 'MILEAGE_LOWER_THAN_PREVIOUS'
        );
      END IF;
    END IF;

    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL;
    ELSE
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilometrage requis pour ' || v_fuel_type, 'code', 'MILEAGE_REQUIRED');
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
$function$;
