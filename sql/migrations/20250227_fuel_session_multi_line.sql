-- ============================================================================
-- MIGRATION: Formulaire Multi-Carburant (Session de Ravitaillement)
-- Date: 2025-02-27
-- Contexte: Tests terrain avec conducteurs - 3 problèmes identifiés
-- ============================================================================
-- 1. Prix optionnel : Les conducteurs sur AS24 (automate) n'ont pas le prix sous les yeux immédiatement
-- 2. GNR sans kilométrage : Le GNR alimente le groupe frigo, pas le moteur
-- 3. UX Multi-plein : Un conducteur fait le plein de Gasoil + AdBlue + GNR en UNE SEULE FOIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 1: Assouplissement des contraintes
-- ----------------------------------------------------------------------------

-- Rendre le prix optionnel (certains ne l'ont pas sur le moment)
ALTER TABLE fuel_records ALTER COLUMN price_total DROP NOT NULL;
ALTER TABLE fuel_records ALTER COLUMN price_per_liter DROP NOT NULL;

-- Rendre le kilométrage nullable (pour GNR qui n'a pas de lien km)
ALTER TABLE fuel_records ALTER COLUMN mileage_at_fill DROP NOT NULL;

-- Supprimer la contrainte CHECK sur price_total si elle existe
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_records_price_total_check;
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_records_price_check;

-- Supprimer la contrainte CHECK sur mileage_at_fill si elle existe
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_records_mileage_check;

-- ----------------------------------------------------------------------------
-- ÉTAPE 2: Fonction RPC pour session multi-carburants
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_fuel_session(
  p_vehicle_id UUID,
  p_token UUID,
  p_fuels JSONB, -- Format: [{"type":"diesel","liters":47.5,"price":85.50,"mileage":45230}, {"type":"gnr","liters":8.5,"price":null,"mileage":null}]
  p_driver_name TEXT DEFAULT NULL,
  p_station_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_token TEXT;
  v_fuel JSONB;
  v_record_id UUID;
  v_record_ids UUID[] := '{}';
  v_consumption DECIMAL;
  v_prev_mileage INTEGER;
  v_prev_liters DECIMAL;
  v_fuel_type TEXT;
  v_liters DECIMAL;
  v_price DECIMAL;
  v_mileage INTEGER;
  v_max_mileage INTEGER := 0;
BEGIN
  -- Vérification token unique pour toute la session
  SELECT qr_code_data::text, company_id 
  INTO v_vehicle_token, v_company_id
  FROM vehicles 
  WHERE id = p_vehicle_id AND status = 'ACTIF';
  
  IF v_vehicle_token IS NULL OR v_vehicle_token != p_token::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide ou véhicule inactif');
  END IF;

  -- Validation: au moins un carburant
  IF jsonb_array_length(p_fuels) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun carburant fourni');
  END IF;

  -- Validation: maximum 3 carburants
  IF jsonb_array_length(p_fuels) > 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum 3 carburants par session');
  END IF;

  -- Boucle sur chaque carburant du tableau
  FOR v_fuel IN SELECT * FROM jsonb_array_elements(p_fuels)
  LOOP
    -- Extraction des valeurs
    v_fuel_type := v_fuel->>'type';
    v_liters := (v_fuel->>'liters')::DECIMAL;
    v_price := NULLIF((v_fuel->>'price')::DECIMAL, 0);
    v_mileage := NULLIF((v_fuel->>'mileage')::INTEGER, 0);

    -- Validation: litres obligatoires et > 0
    IF v_liters IS NULL OR v_liters <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quantité de litres invalide pour ' || v_fuel_type);
    END IF;

    -- Logique GNR : pas de calcul conso, pas de km
    IF v_fuel_type = 'gnr' THEN
      v_consumption := NULL;
      v_mileage := NULL; -- Forcer NULL pour GNR même si envoyé
    ELSE
      -- Pour les autres carburants, mileage est requis
      IF v_mileage IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kilométrage requis pour ' || v_fuel_type);
      END IF;
      
      -- Calcul conso seulement si on a un km
      v_consumption := NULL; -- Par défaut
      
      -- Chercher le plein précédent du même type pour ce véhicule
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
      
      -- Tracker le kilométrage max pour mise à jour véhicule
      IF v_mileage > v_max_mileage THEN
        v_max_mileage := v_mileage;
      END IF;
    END IF;
    
    -- Insertion du record
    INSERT INTO fuel_records (
      company_id,
      vehicle_id,
      fuel_type,
      quantity_liters,
      price_total,
      price_per_liter,
      mileage_at_fill,
      consumption_l_per_100km,
      station_name,
      notes,
      created_at
    ) VALUES (
      v_company_id,
      p_vehicle_id,
      v_fuel_type,
      v_liters,
      v_price,
      CASE 
        WHEN v_price IS NOT NULL AND v_liters > 0 
        THEN ROUND((v_price / v_liters)::numeric, 3)
        ELSE NULL
      END,
      v_mileage,
      v_consumption,
      p_station_name,
      'Saisi via QR par ' || COALESCE(p_driver_name, 'Conducteur'),
      NOW()
    )
    RETURNING id INTO v_record_id;
    
    v_record_ids := array_append(v_record_ids, v_record_id);
  END LOOP;
  
  -- Mise à jour kilométrage véhicule si au moins un carburant a du km
  IF v_max_mileage > 0 THEN
    UPDATE vehicles 
    SET mileage = GREATEST(COALESCE(mileage, 0), v_max_mileage), 
        updated_at = NOW()
    WHERE id = p_vehicle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'record_ids', v_record_ids,
    'count', array_length(v_record_ids, 1),
    'ticket_number', SUBSTRING(v_record_ids[1]::text, 1, 8)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- ÉTAPE 3: Accorder les permissions sur la nouvelle fonction
-- ----------------------------------------------------------------------------

-- Permission pour les rôles anonymes (accès QR Code)
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_fuel_session(UUID, UUID, JSONB, TEXT, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- ÉTAPE 4: Mettre à jour la fonction existante create_public_fuel_record (dépréciée)
-- ----------------------------------------------------------------------------

-- La fonction legacy reste pour compatibilité mais utilise la nouvelle logique
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
  v_fuels JSONB;
  v_result JSONB;
BEGIN
  -- Convertir les paramètres legacy en format session
  v_fuels := jsonb_build_array(
    jsonb_build_object(
      'type', p_fuel_type,
      'liters', p_liters,
      'price', p_price_total,
      'mileage', p_mileage
    )
  );
  
  -- Appeler la nouvelle fonction
  v_result := create_fuel_session(
    p_vehicle_id,
    p_token,
    v_fuels,
    p_driver_name,
    p_station_name
  );
  
  -- Retourner dans le format legacy pour compatibilité
  IF (v_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', true,
      'ticket_number', v_result->>'ticket_number',
      'consumption', (
        SELECT consumption_l_per_100km 
        FROM fuel_records 
        WHERE id = (v_result->'record_ids'->>0)::UUID
      )
    );
  ELSE
    RETURN v_result;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- ÉTAPE 5: Commentaires et documentation
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION create_fuel_session IS 
'Crée une session de ravitaillement multi-carburants via QR Code.
Paramètres:
  - p_vehicle_id: UUID du véhicule
  - p_token: Token d''accès du QR Code
  - p_fuels: Tableau JSONB [{type, liters, price, mileage}, ...]
  - p_driver_name: Nom du conducteur (optionnel)
  - p_station_name: Nom de la station (optionnel)
Règles:
  - Maximum 3 carburants par session
  - GNR: pas de kilométrage, pas de calcul conso
  - Prix optionnel (NULL si non fourni)
  - Transaction: tout ou rien';

-- ----------------------------------------------------------------------------
-- VÉRIFICATION
-- ----------------------------------------------------------------------------

-- Afficher la structure actuelle de la table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'fuel_records'
ORDER BY ordinal_position;
