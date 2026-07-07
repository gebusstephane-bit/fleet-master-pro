-- ============================================
-- M4/M11 : casse subscription_plan + CHECK constraints (audit — item 12)
-- ============================================
-- companies.subscription_plan était en casse MIXTE ('essential' vs 'ESSENTIAL')
-- selon le chemin d'écriture -> feature-gating aléatoire. On normalise en
-- MAJUSCULES et on ajoute des CHECK pour empêcher toute future dérive.
-- Writers minuscules corrigés côté code (checkout-session, register-with-trial).
-- Appliqué en prod le 2026-07-05 (vérifié). Idempotent.
-- ============================================

-- 1. Normaliser les données existantes
UPDATE companies
SET subscription_plan = UPPER(subscription_plan)
WHERE subscription_plan IS NOT NULL
  AND subscription_plan <> UPPER(subscription_plan);

-- 2. CHECK plan (convention MAJUSCULES ; NULL toléré)
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_plan_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('ESSENTIAL','PRO','UNLIMITED'));

-- 3. CHECK status (convention lowercase ; NULL toléré)
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN
    ('active','trialing','canceled','past_due','unpaid','pending_payment'));
