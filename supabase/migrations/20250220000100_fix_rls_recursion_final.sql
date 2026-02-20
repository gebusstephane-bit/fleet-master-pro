-- ============================================
-- SOLUTION RADICALE : Contournement RLS Recursion
-- ============================================
-- Problème : Les politiques RLS sur profiles se référencent elles-mêmes
-- Solution : Fonction SECURITY DEFINER pour récupérer company_id sans RLS

-- 1. Créer une fonction qui récupère le company_id sans déclencher RLS
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Exécute avec les privilèges du créateur (postgres), pas l'utilisateur
SET search_path = public
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION get_current_user_company_id() IS 
'Récupère le company_id de l utilisateur connecté sans déclencher RLS (SECURITY DEFINER)';

-- 2. Supprimer TOUTES les politiques RLS existantes sur toutes les tables concernées

-- Profiles
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_simple" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Vehicles
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
DROP POLICY IF EXISTS "Enable read access for company users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert for company users" ON vehicles;
DROP POLICY IF EXISTS "Enable update for company users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete for company users" ON vehicles;

-- Drivers
DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
DROP POLICY IF EXISTS "drivers_update" ON drivers;
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
DROP POLICY IF EXISTS "Enable read access for company users" ON drivers;
DROP POLICY IF EXISTS "Enable insert for company users" ON drivers;
DROP POLICY IF EXISTS "Enable update for company users" ON drivers;
DROP POLICY IF EXISTS "Enable delete for company users" ON drivers;

-- Routes
DROP POLICY IF EXISTS "routes_select" ON routes;
DROP POLICY IF EXISTS "routes_insert" ON routes;
DROP POLICY IF EXISTS "routes_update" ON routes;
DROP POLICY IF EXISTS "routes_delete" ON routes;
DROP POLICY IF EXISTS "Enable read access for company users" ON routes;
DROP POLICY IF EXISTS "Enable insert for company users" ON routes;
DROP POLICY IF EXISTS "Enable update for company users" ON routes;
DROP POLICY IF EXISTS "Enable delete for company users" ON routes;

-- Maintenance Records
DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_records;
DROP POLICY IF EXISTS "Enable read access for company users" ON maintenance_records;
DROP POLICY IF EXISTS "Enable insert for company users" ON maintenance_records;
DROP POLICY IF EXISTS "Enable update for company users" ON maintenance_records;
DROP POLICY IF EXISTS "Enable delete for company users" ON maintenance_records;

-- 3. Recréer les politiques avec la fonction qui contourne RLS

-- ============================================
-- PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    company_id = get_current_user_company_id()
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- VEHICLES
-- ============================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- DRIVERS
-- ============================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select" ON drivers
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_delete" ON drivers
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- ROUTES
-- ============================================
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_select" ON routes
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_insert" ON routes
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "routes_update" ON routes
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_delete" ON routes
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- MAINTENANCE RECORDS
-- ============================================
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_select" ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_insert" ON maintenance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_update" ON maintenance_records
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_delete" ON maintenance_records
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- AUTRES TABLES (si elles existent)
-- ============================================

-- Activity Logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
    DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
    DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
    DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
    
    ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "activity_logs_select" ON activity_logs
      FOR SELECT
      TO authenticated
      USING (company_id = get_current_user_company_id());
    
    CREATE POLICY "activity_logs_insert" ON activity_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = get_current_user_company_id());
  END IF;
END
$$;

-- Inspections
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inspections') THEN
    DROP POLICY IF EXISTS "inspections_select" ON inspections;
    DROP POLICY IF EXISTS "inspections_insert" ON inspections;
    DROP POLICY IF EXISTS "inspections_update" ON inspections;
    DROP POLICY IF EXISTS "inspections_delete" ON inspections;
    
    ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "inspections_select" ON inspections
      FOR SELECT
      TO authenticated
      USING (company_id = get_current_user_company_id());
    
    CREATE POLICY "inspections_insert" ON inspections
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = get_current_user_company_id());
    
    CREATE POLICY "inspections_update" ON inspections
      FOR UPDATE
      TO authenticated
      USING (company_id = get_current_user_company_id());
    
    CREATE POLICY "inspections_delete" ON inspections
      FOR DELETE
      TO authenticated
      USING (company_id = get_current_user_company_id());
  END IF;
END
$$;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles::text, 
  cmd,
  qual::text as using_expression
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename, policyname;
