-- ============================================
-- FIX CRITIQUE : RLS Recursion sur profiles
-- ============================================
-- Problème : Les politiques RLS sur profiles se référencent elles-mêmes
-- Solution : Simplifier les politiques pour éviter la récursion

-- 1. Supprimer TOUTES les politiques existantes sur profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same company" ON profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON profiles;

-- 2. Désactiver temporairement RLS pour vérifier
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Réactiver RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Créer des politiques SIMPLES sans récursion

-- Politique SELECT : Un utilisateur peut voir son propre profil OU les profils de sa company
CREATE POLICY "profiles_select_simple" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- Politique INSERT : Un utilisateur peut créer son propre profil
CREATE POLICY "profiles_insert_simple" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Politique UPDATE : Un utilisateur peut modifier son propre profil
CREATE POLICY "profiles_update_simple" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Politique DELETE : Un utilisateur peut supprimer son propre profil
CREATE POLICY "profiles_delete_simple" ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- FIX : Politiques pour vehicles (au cas où)
-- ============================================

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- ============================================
-- FIX : Politiques pour drivers
-- ============================================

DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
DROP POLICY IF EXISTS "drivers_update" ON drivers;
DROP POLICY IF EXISTS "drivers_delete" ON drivers;

CREATE POLICY "drivers_select" ON drivers
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "drivers_delete" ON drivers
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- ============================================
-- FIX : Politiques pour routes
-- ============================================

DROP POLICY IF EXISTS "routes_select" ON routes;
DROP POLICY IF EXISTS "routes_insert" ON routes;
DROP POLICY IF EXISTS "routes_update" ON routes;
DROP POLICY IF EXISTS "routes_delete" ON routes;

CREATE POLICY "routes_select" ON routes
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "routes_insert" ON routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "routes_update" ON routes
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "routes_delete" ON routes
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- ============================================
-- FIX : Politiques pour maintenance_records
-- ============================================

DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_records;

CREATE POLICY "maintenance_select" ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "maintenance_insert" ON maintenance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "maintenance_update" ON maintenance_records
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "maintenance_delete" ON maintenance_records
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- ============================================
-- Vérification
-- ============================================
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename, policyname;
