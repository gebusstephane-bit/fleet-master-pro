-- =====================================================
-- MIGRATION: Correction de la fonction check_subscription_sync
-- Problème de type: character varying(255) vs text
-- =====================================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS check_subscription_sync();

-- Recréer avec les bons types
CREATE OR REPLACE FUNCTION check_subscription_sync()
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),
  company_plan VARCHAR(50),
  subscription_plan VARCHAR(50),
  company_max_vehicles INTEGER,
  sub_vehicle_limit INTEGER,
  company_max_drivers INTEGER,
  sub_user_limit INTEGER,
  sync_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::UUID as company_id,
    c.name::VARCHAR(255) as company_name,
    c.subscription_plan::VARCHAR(50) as company_plan,
    s.plan::VARCHAR(50) as subscription_plan,
    c.max_vehicles::INTEGER as company_max_vehicles,
    s.vehicle_limit::INTEGER as sub_vehicle_limit,
    c.max_drivers::INTEGER as company_max_drivers,
    s.user_limit::INTEGER as sub_user_limit,
    CASE 
      WHEN UPPER(c.subscription_plan::text) != UPPER(s.plan::text) THEN 'PLAN MISMATCH'
      WHEN c.max_vehicles != s.vehicle_limit THEN 'VEHICLE LIMIT MISMATCH'
      WHEN c.max_drivers != s.user_limit THEN 'USER LIMIT MISMATCH'
      ELSE 'OK'
    END::TEXT as sync_status
  FROM companies c
  JOIN subscriptions s ON s.company_id = c.id
  WHERE 
    UPPER(c.subscription_plan::text) != UPPER(s.plan::text)
    OR c.max_vehicles != s.vehicle_limit
    OR c.max_drivers != s.user_limit;
END;
$$ LANGUAGE plpgsql;

SELECT 'Fonction check_subscription_sync corrigée' AS result;
