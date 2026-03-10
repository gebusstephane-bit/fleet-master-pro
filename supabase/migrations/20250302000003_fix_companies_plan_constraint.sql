-- =====================================================
-- MIGRATION: Correction de la contrainte CHECK sur companies.subscription_plan
-- La contrainte actuelle bloque les nouveaux plans (ESSENTIAL, PRO, UNLIMITED)
-- =====================================================

-- 1. D'abord, supprimer la contrainte existante
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_plan_check;

-- 2. Option A: Créer une nouvelle contrainte avec les plans valides
-- ESSENTIAL, PRO, UNLIMITED + anciens plans pour compatibilité
ALTER TABLE companies ADD CONSTRAINT companies_subscription_plan_check 
  CHECK (subscription_plan IN (
    'ESSENTIAL', 'PRO', 'UNLIMITED',  -- Nouveaux plans
    'STARTER', 'BASIC', 'ENTERPRISE', -- Anciens plans (compatibilité)
    'essential', 'pro', 'unlimited',  -- Versions minuscules (compatibilité)
    'starter', 'basic', 'enterprise'  -- Anciens minuscules (compatibilité)
  ));

-- Option B (alternative si vous voulez être plus permissif):
-- ALTER TABLE companies ADD CONSTRAINT companies_subscription_plan_check 
--   CHECK (LENGTH(subscription_plan) > 0);

-- 3. Normaliser les données existantes (mettre en majuscules)
UPDATE companies 
SET subscription_plan = UPPER(subscription_plan)
WHERE subscription_plan != UPPER(subscription_plan);

-- 4. Mettre à jour subscription_status pour cohérence
UPDATE companies
SET subscription_status = LOWER(subscription_status)
WHERE subscription_status != LOWER(subscription_status);

-- 5. Synchroniser à nouveau avec subscriptions
UPDATE companies c
SET 
  subscription_plan = UPPER(s.plan::text),
  subscription_status = LOWER(s.status::text),
  max_vehicles = s.vehicle_limit,
  max_drivers = s.user_limit,
  updated_at = NOW()
FROM subscriptions s
WHERE s.company_id = c.id;

SELECT 'Contrainte CHECK corrigée et données synchronisées' AS result;
