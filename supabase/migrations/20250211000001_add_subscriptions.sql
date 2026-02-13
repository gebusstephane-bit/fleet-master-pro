-- =====================================================
-- MIGRATION: Système d'abonnement Stripe
-- Plan: Starter(0€/1véhicule) → Basic(29€/5véhicules) → Pro(49€/15véhicules) → Enterprise(sur devis)
-- =====================================================

-- 1. Créer l'énumération des plans
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE plan_type AS ENUM ('STARTER', 'BASIC', 'PRO', 'ENTERPRISE');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
  END IF;
END $$;

-- 2. Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Plan et statut
  plan plan_type DEFAULT 'STARTER',
  status subscription_status DEFAULT 'ACTIVE',
  
  -- Périodes
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '100 years'), -- Starter = illimité temporellement
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Métriques d'usage
  vehicle_limit INTEGER DEFAULT 1, -- Starter: 1 véhicule
  user_limit INTEGER DEFAULT 1,    -- Starter: 1 utilisateur
  
  -- Features activées (JSON pour flexibilité)
  features JSONB DEFAULT '["vehicles", "inspections_qr"]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

-- 4. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Fonction pour créer un abonnement Starter à la création d'entreprise
CREATE OR REPLACE FUNCTION create_starter_subscription()
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
    'STARTER',
    'ACTIVE',
    1,  -- 1 véhicule
    1,  -- 1 utilisateur
    '["vehicles", "inspections_qr", "basic_profile"]'::jsonb,
    (NOW() + INTERVAL '100 years') -- Illimité temporellement
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger sur companies pour créer l'abonnement automatiquement
DROP TRIGGER IF EXISTS tr_create_starter_subscription ON companies;
CREATE TRIGGER tr_create_starter_subscription
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_starter_subscription();

-- 7. Fonction pour récupérer les limites selon le plan
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
    ('STARTER'::plan_type, 1, 1, 0, '["vehicles", "inspections_qr", "basic_profile"]'::jsonb),
    ('BASIC'::plan_type, 5, 2, 2900, '["vehicles", "inspections_qr", "maintenance_workflow", "fuel_tracking", "alerts_email"]'::jsonb),
    ('PRO'::plan_type, 15, 5, 4900, '["vehicles", "inspections_qr", "maintenance_workflow", "fuel_tracking", "alerts_email", "route_optimization", "ai_predictions", "analytics", "api_access"]'::jsonb),
    ('ENTERPRISE'::plan_type, 999999, 999999, 0, '["all_features", "sso", "dedicated_manager", "sla_99_9", "on_premise"]'::jsonb)
  ) AS t(plan, vehicle_limit, user_limit, price_monthly, features)
  WHERE t.plan = p_plan;
END;
$$ LANGUAGE plpgsql;

-- 8. Fonction pour vérifier si une entreprise peut ajouter un véhicule
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
  
  -- Enterprise = toujours OK
  IF v_plan = 'ENTERPRISE' THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Fonction pour vérifier si une entreprise peut ajouter un utilisateur
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
  
  IF v_plan = 'ENTERPRISE' THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Vue pour faciliter les requêtes
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
    WHEN s.plan = 'ENTERPRISE' THEN TRUE
    ELSE (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id) < s.vehicle_limit
  END AS can_add_vehicle,
  CASE 
    WHEN s.plan = 'ENTERPRISE' THEN TRUE
    ELSE (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) < s.user_limit
  END AS can_add_user
FROM companies c
LEFT JOIN subscriptions s ON s.company_id = c.id;

-- 11. Créer les abonnements pour les entreprises existantes (Starter par défaut)
INSERT INTO subscriptions (
  company_id, 
  plan, 
  status, 
  vehicle_limit, 
  user_limit,
  features,
  current_period_end
)
SELECT 
  id, 
  'STARTER', 
  'ACTIVE',
  1,
  1,
  '["vehicles", "inspections_qr", "basic_profile"]'::jsonb,
  (NOW() + INTERVAL '100 years')
FROM companies
WHERE id NOT IN (SELECT company_id FROM subscriptions)
ON CONFLICT DO NOTHING;

-- 12. Commentaires
COMMENT ON TABLE subscriptions IS 'Abonnements Stripe des entreprises';
COMMENT ON COLUMN subscriptions.plan IS 'STARTER(0€/1v), BASIC(29€/5v), PRO(49€/15v), ENTERPRISE(sur devis)';
COMMENT ON COLUMN subscriptions.vehicle_limit IS 'Nombre maximum de véhicules selon le plan';
COMMENT ON COLUMN subscriptions.features IS 'Features activées pour ce plan (JSON array)';

SELECT 'Migration subscriptions créée avec succès' AS result;
