-- ============================================================================
-- FIX : Fonction sécurisée pour créer une pending_registration
-- Cette fonction contourne la RLS car elle utilise SECURITY DEFINER
-- ============================================================================

-- Supprimer la fonction si elle existe
DROP FUNCTION IF EXISTS create_pending_registration CASCADE;

-- Créer la fonction avec SECURITY DEFINER (exécute avec les droits du créateur)
CREATE OR REPLACE FUNCTION create_pending_registration(
  p_email TEXT,
  p_password_hash TEXT,
  p_company_name TEXT,
  p_siret TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_plan_type TEXT,
  p_price_id TEXT
)
RETURNS TABLE (
  id UUID,
  setup_token UUID,
  email TEXT
) 
SECURITY DEFINER -- Exécute avec les droits de l'owner (service_role)
AS $$
DECLARE
  v_setup_token UUID := gen_random_uuid();
  v_id UUID;
BEGIN
  INSERT INTO pending_registrations (
    setup_token,
    email,
    password_hash,
    company_name,
    siret,
    first_name,
    last_name,
    phone,
    metadata,
    expires_at
  ) VALUES (
    v_setup_token,
    p_email,
    p_password_hash,
    p_company_name,
    p_siret,
    p_first_name,
    p_last_name,
    p_phone,
    jsonb_build_object('plan_type', p_plan_type, 'price_id', p_price_id),
    now() + interval '15 minutes'
  )
  RETURNING pending_registrations.id INTO v_id;
  
  RETURN QUERY 
  SELECT pending_registrations.id, pending_registrations.setup_token, pending_registrations.email
  FROM pending_registrations 
  WHERE pending_registrations.id = v_id;
END;
$$ LANGUAGE plpgsql;

-- Donner les droits d'exécution à anon et authenticated
GRANT EXECUTE ON FUNCTION create_pending_registration TO anon;
GRANT EXECUTE ON FUNCTION create_pending_registration TO authenticated;

-- Vérifier que la fonction existe
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'create_pending_registration';
