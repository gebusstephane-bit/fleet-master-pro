-- =====================================================
-- MIGRATION: Mise à jour des plans vers la nouvelle grille
-- Ancienne grille: Starter(1v) → Basic(5v) → Pro(15v) → Enterprise(999v)
-- Nouvelle grille: Essential(5v/10u) → Pro(20v/50u) → Unlimited(illimité)
-- =====================================================

-- 1. Ajouter les nouvelles valeurs à l'enum plan_type (si elles n'existent pas déjà)
-- Note: PostgreSQL ne permet pas de supprimer des valeurs d'enum facilement,
-- donc on garde les anciennes pour la compatibilité mais on mappe sur les nouvelles

-- 2. Mettre à jour la fonction get_plan_limits avec les nouvelles limites
CREATE OR REPLACE FUNCTION get_plan_limits(p_plan plan_type)
RETURNS TABLE (
  vehicle_limit INTEGER,
  user_limit INTEGER,
  price_monthly INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    -- Nouveaux plans
    ('ESSENTIAL'::plan_type, 5, 10, 2900, '["vehicles", "inspections_qr", "basic_profile", "maintenance_workflow", "fuel_tracking", "alerts_email", "compliance_basic"]'::jsonb),
    ('PRO'::plan_type, 20, 50, 4900, '["vehicles", "inspections_qr", "maintenance_workflow", "fuel_tracking", "alerts_email", "route_optimization", "ai_predictions", "analytics", "webhooks", "advanced_reports", "priority_support", "compliance_basic"]'::jsonb),
    ('UNLIMITED'::plan_type, 999999, 999999, 12900, '["all_features", "api_access", "ai_assistant", "sso", "dedicated_manager", "sla_99_9", "training_included", "compliance_advanced"]'::jsonb),
    
    -- Anciens plans (pour compatibilité - mappés sur les nouveaux)
    ('STARTER'::plan_type, 5, 10, 0, '["vehicles", "inspections_qr", "basic_profile"]'::jsonb), -- Migré vers Essential
    ('BASIC'::plan_type, 5, 10, 2900, '["vehicles", "inspections_qr", "maintenance_workflow", "fuel_tracking", "alerts_email"]'::jsonb), -- Migré vers Essential
    ('ENTERPRISE'::plan_type, 999999, 999999, 0, '["all_features", "api_access", "ai_assistant", "sso", "dedicated_manager", "sla_99_9"]'::jsonb) -- Migré vers Unlimited
  ) AS t(plan, vehicle_limit, user_limit, price_monthly, features)
  WHERE t.plan = p_plan;
END;
$$ LANGUAGE plpgsql;

-- 3. Mettre à jour la vue company_subscription
CREATE OR REPLACE VIEW company_subscription AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  s.plan,
  s.status,
  s.vehicle_limit,
  s.user_limit,
  s.current_period_end,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id) AS current_vehicle_count,
  (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) AS current_user_count,
  CASE 
    WHEN s.plan IN ('UNLIMITED', 'ENTERPRISE') THEN TRUE
    ELSE (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id) < s.vehicle_limit
  END AS can_add_vehicle,
  CASE 
    WHEN s.plan IN ('UNLIMITED', 'ENTERPRISE') THEN TRUE
    ELSE (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) < s.user_limit
  END AS can_add_user
FROM companies c
LEFT JOIN subscriptions s ON s.company_id = c.id;

-- 4. Fonction pour synchroniser les limites selon le plan
CREATE OR REPLACE FUNCTION sync_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_limits RECORD;
BEGIN
  -- Récupérer les limites du plan
  SELECT * INTO v_limits FROM get_plan_limits(NEW.plan);
  
  IF FOUND THEN
    NEW.vehicle_limit := v_limits.vehicle_limit;
    NEW.user_limit := v_limits.user_limit;
    NEW.features := v_limits.features;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger pour synchroniser automatiquement les limites
DROP TRIGGER IF EXISTS tr_sync_subscription_limits ON subscriptions;
CREATE TRIGGER tr_sync_subscription_limits
  BEFORE INSERT OR UPDATE OF plan ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_limits();

-- 5. Migrer les abonnements existants vers les nouveaux plans
-- STARTER et BASIC -> ESSENTIAL (même prix que Basic mais 5v/10u)
UPDATE subscriptions 
SET 
  plan = 'ESSENTIAL',
  vehicle_limit = 5,
  user_limit = 10,
  features = '["vehicles", "inspections_qr", "basic_profile", "maintenance_workflow", "fuel_tracking", "alerts_email", "compliance_basic"]'::jsonb
WHERE plan IN ('STARTER', 'BASIC');

-- PRO reste PRO mais avec nouvelles limites (20v/50u au lieu de 15v/5u)
UPDATE subscriptions 
SET 
  vehicle_limit = 20,
  user_limit = 50,
  features = '["vehicles", "inspections_qr", "maintenance_workflow", "fuel_tracking", "alerts_email", "route_optimization", "ai_predictions", "analytics", "webhooks", "advanced_reports", "priority_support", "compliance_basic"]'::jsonb
WHERE plan = 'PRO';

-- ENTERPRISE -> UNLIMITED
UPDATE subscriptions 
SET 
  plan = 'UNLIMITED',
  vehicle_limit = 999999,
  user_limit = 999999,
  features = '["all_features", "api_access", "ai_assistant", "sso", "dedicated_manager", "sla_99_9", "training_included", "compliance_advanced"]'::jsonb
WHERE plan = 'ENTERPRISE';

-- 6. Mettre à jour les companies pour refléter les nouveaux plans
UPDATE companies c
SET 
  subscription_plan = s.plan,
  max_vehicles = s.vehicle_limit,
  max_drivers = s.user_limit
FROM subscriptions s
WHERE s.company_id = c.id;

-- 7. Mettre à jour la fonction de création d'abonnement Starter (crée maintenant Essential)
CREATE OR REPLACE FUNCTION create_essential_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    company_id,
    plan,
    status,
    vehicle_limit,
    user_limit,
    features,
    current_period_end
  ) VALUES (
    NEW.id,
    'ESSENTIAL',
    'ACTIVE',
    5,  -- 5 véhicules
    10, -- 10 utilisateurs
    '["vehicles", "inspections_qr", "basic_profile", "maintenance_workflow", "fuel_tracking", "alerts_email", "compliance_basic"]'::jsonb,
    (NOW() + INTERVAL '14 days') -- Essai de 14 jours
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Renommer le trigger
DROP TRIGGER IF EXISTS tr_create_starter_subscription ON companies;
DROP TRIGGER IF EXISTS tr_create_essential_subscription ON companies;
CREATE TRIGGER tr_create_essential_subscription
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_essential_subscription();

-- 8. Mettre à jour les fonctions can_add_vehicle et can_add_user
CREATE OR REPLACE FUNCTION can_add_vehicle(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_plan plan_type;
BEGIN
  -- Compter les véhicules actuels
  SELECT COUNT(*) INTO v_current_count
  FROM vehicles
  WHERE company_id = p_company_id;
  
  -- Récupérer la limite du plan
  SELECT s.vehicle_limit, s.plan INTO v_limit, v_plan
  FROM subscriptions s
  WHERE s.company_id = p_company_id;
  
  -- Unlimited/Enterprise = toujours OK
  IF v_plan IN ('UNLIMITED', 'ENTERPRISE') THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_add_user(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_plan plan_type;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM profiles
  WHERE company_id = p_company_id;
  
  SELECT s.user_limit, s.plan INTO v_limit, v_plan
  FROM subscriptions s
  WHERE s.company_id = p_company_id;
  
  IF v_plan IN ('UNLIMITED', 'ENTERPRISE') THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Commentaires mis à jour
COMMENT ON COLUMN subscriptions.plan IS 'ESSENTIAL(29€/5v/10u), PRO(49€/20v/50u), UNLIMITED(129€/illimité). Anciens: STARTER, BASIC, ENTERPRISE (dépréciés)';

SELECT 'Migration plans ESSENTIAL/PRO/UNLIMITED appliquée avec succès' AS result;
