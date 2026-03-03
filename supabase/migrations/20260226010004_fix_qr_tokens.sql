-- ============================================
-- FIX: Conversion des anciens tokens QR en UUID
-- ============================================

-- Étape 1: Convertir les anciens tokens fleetmaster:// en UUID
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL 
   OR qr_code_data LIKE 'fleetmaster://%'
   OR LENGTH(COALESCE(qr_code_data, '')) != 36; -- UUID = 36 caractères

-- Étape 2: S'assurer que tous les véhicules ont un token UUID valide
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- Étape 3: Créer une fonction pour régénérer un token si besoin
CREATE OR REPLACE FUNCTION regenerate_vehicle_qr_token(p_vehicle_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_token UUID;
BEGIN
  v_new_token := gen_random_uuid();
  
  UPDATE vehicles 
  SET qr_code_data = v_new_token, updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 4: Vérification - retourne le nombre de véhicules avec token valide
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(qr_code_data) as with_token,
  COUNT(CASE WHEN LENGTH(qr_code_data) = 36 THEN 1 END) as valid_uuid_tokens
FROM vehicles;
