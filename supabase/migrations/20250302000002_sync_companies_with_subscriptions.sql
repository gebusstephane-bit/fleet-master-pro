-- =====================================================
-- MIGRATION: Synchronisation de companies avec subscriptions
-- La table companies doit refléter le plan actif de subscriptions
-- =====================================================

-- 1. Synchroniser toutes les companies avec leur subscription active
UPDATE companies c
SET 
  subscription_plan = UPPER(s.plan::text), -- Mettre en majuscules (pro -> PRO, essential -> ESSENTIAL)
  subscription_status = LOWER(s.status::text), -- Mettre en minuscules pour cohérence
  max_vehicles = s.vehicle_limit,
  max_drivers = s.user_limit,
  updated_at = NOW()
FROM subscriptions s
WHERE s.company_id = c.id;

-- 2. Créer une fonction pour synchroniser automatiquement companies quand subscriptions change
CREATE OR REPLACE FUNCTION sync_company_from_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour la table companies quand subscriptions est modifiée
  UPDATE companies
  SET 
    subscription_plan = UPPER(NEW.plan::text),
    subscription_status = LOWER(NEW.status::text),
    max_vehicles = NEW.vehicle_limit,
    max_drivers = NEW.user_limit,
    updated_at = NOW()
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger sur subscriptions
DROP TRIGGER IF EXISTS tr_sync_company_on_subscription_change ON subscriptions;
CREATE TRIGGER tr_sync_company_on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_from_subscription();

-- 4. Créer une fonction pour vérifier les incohérences
CREATE OR REPLACE FUNCTION check_subscription_sync()
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  company_plan TEXT,
  subscription_plan TEXT,
  company_max_vehicles INTEGER,
  sub_vehicle_limit INTEGER,
  company_max_drivers INTEGER,
  sub_user_limit INTEGER,
  sync_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as company_id,
    c.name as company_name,
    c.subscription_plan::text as company_plan,
    s.plan::text as subscription_plan,
    c.max_vehicles as company_max_vehicles,
    s.vehicle_limit as sub_vehicle_limit,
    c.max_drivers as company_max_drivers,
    s.user_limit as sub_user_limit,
    CASE 
      WHEN UPPER(c.subscription_plan::text) != UPPER(s.plan::text) THEN 'PLAN MISMATCH'
      WHEN c.max_vehicles != s.vehicle_limit THEN 'VEHICLE LIMIT MISMATCH'
      WHEN c.max_drivers != s.user_limit THEN 'USER LIMIT MISMATCH'
      ELSE 'OK'
    END as sync_status
  FROM companies c
  JOIN subscriptions s ON s.company_id = c.id
  WHERE 
    UPPER(c.subscription_plan::text) != UPPER(s.plan::text)
    OR c.max_vehicles != s.vehicle_limit
    OR c.max_drivers != s.user_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. Vérifier la synchronisation
SELECT 
  c.id,
  c.name,
  c.subscription_plan as company_plan,
  s.plan as subscription_plan,
  c.max_vehicles as company_max_v,
  s.vehicle_limit as sub_max_v,
  c.max_drivers as company_max_u,
  s.user_limit as sub_max_u,
  CASE 
    WHEN UPPER(c.subscription_plan::text) != UPPER(s.plan::text) THEN 'PLAN MISMATCH'
    WHEN c.max_vehicles != s.vehicle_limit THEN 'VEHICLE LIMIT MISMATCH'
    WHEN c.max_drivers != s.user_limit THEN 'USER LIMIT MISMATCH'
    ELSE 'OK'
  END as sync_status
FROM companies c
JOIN subscriptions s ON s.company_id = c.id;

SELECT 'Synchronisation companies ↔ subscriptions terminée' AS result;
