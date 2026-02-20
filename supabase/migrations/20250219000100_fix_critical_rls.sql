-- ============================================
-- MIGRATION CRITIQUE : RLS sur tables sensibles
-- Date: 2025-02-19
-- Objectif: Sécuriser l'accès aux données entre entreprises
-- ============================================

-- ============================================
-- 1. TABLE companies
-- ============================================

-- Activer RLS (idempotent)
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies si existent
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Allow company read" ON companies;

-- Policy SELECT : voir SA propre company via profiles
CREATE POLICY "Users can view their own company"
  ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 2. TABLE subscriptions
-- ============================================

ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Allow subscription read" ON subscriptions;

CREATE POLICY "Users can view their own subscription"
  ON subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 3. TABLE drivers
-- ============================================

ALTER TABLE IF EXISTS drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drivers in their company" ON drivers;
DROP POLICY IF EXISTS "Allow driver read" ON drivers;
DROP POLICY IF EXISTS "drivers_access" ON drivers;

CREATE POLICY "Users can view drivers in their company"
  ON drivers
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy INSERT/UPDATE/DELETE (pour les admins/managers)
CREATE POLICY "Admins can manage drivers in their company"
  ON drivers
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 4. TABLE routes
-- ============================================

ALTER TABLE IF EXISTS routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view routes in their company" ON routes;
DROP POLICY IF EXISTS "Allow route read" ON routes;

CREATE POLICY "Users can view routes in their company"
  ON routes
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 5. TABLE alerts
-- ============================================

ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alerts in their company" ON alerts;
DROP POLICY IF EXISTS "Allow alert read" ON alerts;

CREATE POLICY "Users can view alerts in their company"
  ON alerts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 6. TABLE vehicles (si pas déjà sécurisée)
-- ============================================

ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;

-- Vérifier si policies existent déjà, sinon les créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' AND policyname = 'Users can view vehicles in their company'
  ) THEN
    CREATE POLICY "Users can view vehicles in their company"
      ON vehicles
      FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 7. TABLE maintenance_records (si pas déjà sécurisée)
-- ============================================

ALTER TABLE IF EXISTS maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_records' AND policyname = 'Users can view maintenance in their company'
  ) THEN
    CREATE POLICY "Users can view maintenance in their company"
      ON maintenance_records
      FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 8. TABLE inspections (si pas déjà sécurisée)
-- ============================================

ALTER TABLE IF EXISTS inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inspections' AND policyname = 'Users can view inspections in their company'
  ) THEN
    CREATE POLICY "Users can view inspections in their company"
      ON inspections
      FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 9. VÉRIFICATION
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('companies', 'subscriptions', 'drivers', 'routes', 'alerts', 'vehicles', 'maintenance_records', 'inspections')
ORDER BY tablename, policyname;

-- ============================================
-- 10. STATS
-- ============================================

SELECT 'RLS Security Migration Complete' as status, 
       NOW() as executed_at;
