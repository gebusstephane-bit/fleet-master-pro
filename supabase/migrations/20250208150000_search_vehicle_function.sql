-- =====================================================
-- FONCTION: Recherche de vehicule par plaque
-- =====================================================

DROP FUNCTION IF EXISTS search_vehicle_by_plate(TEXT);

CREATE OR REPLACE FUNCTION search_vehicle_by_plate(search_term TEXT)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  registration_number TEXT,
  brand TEXT,
  model TEXT,
  type TEXT,
  mileage INTEGER,
  qr_code_data TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_search TEXT;
BEGIN
  -- Normaliser le terme de recherche (majuscules, sans espaces ni tirets)
  normalized_search := upper(regexp_replace(search_term, '[-\s]', '', 'g'));
  
  RETURN QUERY
  SELECT 
    v.id,
    v.company_id,
    v.registration_number,
    v.brand,
    v.model,
    v.type,
    v.mileage,
    v.qr_code_data
  FROM vehicles v
  WHERE 
    -- Recherche exacte (insensible à la casse)
    upper(v.registration_number) = upper(search_term)
    -- OU recherche partielle (sans normaliser)
    OR upper(v.registration_number) LIKE '%' || upper(search_term) || '%'
    -- OU recherche avec normalisation (retire tirets/espaces de la BD aussi)
    OR upper(regexp_replace(v.registration_number, '[-\s]', '', 'g')) = normalized_search
    -- OU recherche partielle normalisée
    OR upper(regexp_replace(v.registration_number, '[-\s]', '', 'g')) LIKE '%' || normalized_search || '%'
  ORDER BY v.registration_number
  LIMIT 5;
END;
$$;

-- Donner les droits
GRANT EXECUTE ON FUNCTION search_vehicle_by_plate(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_vehicle_by_plate(TEXT) TO anon;

-- Verification
SELECT 'Fonction de recherche creee' as info;

-- Test rapide (decommenter si besoin)
-- SELECT * FROM search_vehicle_by_plate('TN-846-RG');
-- SELECT * FROM search_vehicle_by_plate('TN846RG');
