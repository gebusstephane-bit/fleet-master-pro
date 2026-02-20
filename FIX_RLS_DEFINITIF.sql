-- ============================================
-- SOLUTION DÉFINITIVE RLS - Version Minimaliste
-- ============================================
-- Objectif : Éliminer TOUTES les sous-requêtes sur profiles dans les politiques

-- Étape 1 : Supprimer TOUTES les politiques existantes sur toutes les tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Supprimer toutes les politiques sur profiles
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
    
    -- Supprimer toutes les politiques sur vehicles
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'vehicles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vehicles', pol.policyname);
    END LOOP;
    
    -- Supprimer toutes les politiques sur drivers
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'drivers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON drivers', pol.policyname);
    END LOOP;
    
    -- Supprimer toutes les politiques sur routes
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'routes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON routes', pol.policyname);
    END LOOP;
    
    -- Supprimer toutes les politiques sur maintenance_records
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'maintenance_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON maintenance_records', pol.policyname);
    END LOOP;
    
    -- Supprimer toutes les politiques sur inspections
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'inspections'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON inspections', pol.policyname);
    END LOOP;
END
$$;

-- Étape 2 : Supprimer et recréer la fonction avec SECURITY DEFINER
DROP FUNCTION IF EXISTS get_current_user_company_id();

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Étape 3 : Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Étape 4 : Créer les politiques SIMPLIFIÉES sans sous-requête sur profiles

-- ============================================
-- PROFILES - L'utilisateur voit son propre profil
-- ============================================
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_current_user_company_id());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ============================================
-- VEHICLES - Basé sur company_id via la fonction
-- ============================================
CREATE POLICY "vehicles_read" ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- DRIVERS - Basé sur company_id via la fonction
-- ============================================
CREATE POLICY "drivers_read" ON drivers
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_delete" ON drivers
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- ROUTES - Basé sur company_id via la fonction
-- ============================================
CREATE POLICY "routes_read" ON routes
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_insert" ON routes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "routes_update" ON routes
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_delete" ON routes
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- MAINTENANCE_RECORDS - Basé sur company_id via la fonction (simplifié)
-- ============================================
CREATE POLICY "maintenance_read" ON maintenance_records
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_insert" ON maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_update" ON maintenance_records
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_delete" ON maintenance_records
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- INSPECTIONS - Basé sur company_id via la fonction (simplifié)
-- ============================================
CREATE POLICY "inspections_read" ON inspections
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "inspections_insert" ON inspections
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "inspections_update" ON inspections
  FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "inspections_delete" ON inspections
  FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT 
  tablename, 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records', 'inspections')
ORDER BY tablename, policyname;
