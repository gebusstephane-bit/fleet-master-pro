-- ============================================
-- FIX RLS RECURSION v2 - Drop & Recreate
-- ============================================

-- 1. Supprimer TOUTES les politiques existantes (avec IF EXISTS)
DO $$
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "profiles_select" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert" ON profiles;
    DROP POLICY IF EXISTS "profiles_update" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete" ON profiles;
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
    DROP POLICY IF EXISTS "Users can view profiles in same company" ON profiles;
    DROP POLICY IF EXISTS "Users can view company profiles" ON profiles;
    
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
    
    -- Maintenance
    DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_update" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_records;
    DROP POLICY IF EXISTS "Enable read access for company users" ON maintenance_records;
    DROP POLICY IF EXISTS "Enable insert for company users" ON maintenance_records;
    DROP POLICY IF EXISTS "Enable update for company users" ON maintenance_records;
    DROP POLICY IF EXISTS "Enable delete for company users" ON maintenance_records;
END
$$;

-- 2. Créer la fonction SECURITY DEFINER (recréer si existe)
DROP FUNCTION IF EXISTS get_current_user_company_id();

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 3. Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- 4. Créer les nouvelles politiques

-- PROFILES
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_current_user_company_id());

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- VEHICLES
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_insert_policy" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_update_policy" ON vehicles
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_delete_policy" ON vehicles
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- DRIVERS
CREATE POLICY "drivers_select_policy" ON drivers
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_insert_policy" ON drivers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_update_policy" ON drivers
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_delete_policy" ON drivers
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ROUTES
CREATE POLICY "routes_select_policy" ON routes
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_insert_policy" ON routes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "routes_update_policy" ON routes
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_delete_policy" ON routes
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- MAINTENANCE
CREATE POLICY "maintenance_select_policy" ON maintenance_records
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_insert_policy" ON maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_update_policy" ON maintenance_records
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_delete_policy" ON maintenance_records
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- 5. Vérification
SELECT 
  tablename, 
  policyname
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename, policyname;
