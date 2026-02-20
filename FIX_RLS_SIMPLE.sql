-- ============================================
-- FIX RLS RECURSION - Version Simple (Copy-Paste)
-- ============================================

-- Étape 1: Supprimer les anciennes politiques (ignore les erreurs si n'existent pas)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
DROP POLICY IF EXISTS "drivers_update" ON drivers;
DROP POLICY IF EXISTS "drivers_delete" ON drivers;

DROP POLICY IF EXISTS "routes_select" ON routes;
DROP POLICY IF EXISTS "routes_insert" ON routes;
DROP POLICY IF EXISTS "routes_update" ON routes;
DROP POLICY IF EXISTS "routes_delete" ON routes;

DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_records;

-- Étape 2: Supprimer et recréer la fonction
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

-- Étape 3: Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Étape 4: Créer les nouvelles politiques (noms uniques avec suffixe _v2)
CREATE POLICY "profiles_select_v2" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_current_user_company_id());

CREATE POLICY "profiles_insert_v2" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_v2" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "vehicles_select_v2" ON vehicles FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_insert_v2" ON vehicles FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_select_v2" ON drivers FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_insert_v2" ON drivers FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "routes_select_v2" ON routes FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_insert_v2" ON routes FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_select_v2" ON maintenance_records FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_insert_v2" ON maintenance_records FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

-- Vérification
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename, policyname;
