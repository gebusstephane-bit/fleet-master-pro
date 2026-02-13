-- =====================================================
-- SOLUTION FINALE: Fix recursion RLS
-- =====================================================

-- ETAPE 1: Supprimer TOUTES les politiques existantes sur vehicles et profiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Supprimer politiques vehicles
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON vehicles', pol.policyname);
  END LOOP;
  
  -- Supprimer politiques profiles
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END
$$;

-- ETAPE 2: Desactiver RLS temporairement
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ETAPE 3: Creer une fonction securisee pour recuperer le company_id
-- Cette fonction s'execute avec les droits du proprietaire (postgres)
-- et contourne donc les politiques RLS de profiles
DROP FUNCTION IF EXISTS get_user_company_id();

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Important: execute avec les droits du createur
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
END;
$$;

-- Donner les droits d'execution
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id() TO anon;

-- ETAPE 4: Activer RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ETAPE 5: Creer les politiques vehicles utilisant la fonction
CREATE POLICY vehicles_select ON vehicles
  FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY vehicles_insert ON vehicles
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY vehicles_update ON vehicles
  FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY vehicles_delete ON vehicles
  FOR DELETE
  USING (company_id = get_user_company_id());

-- ETAPE 6: Creer les politiques profiles (simples, sans recursion)
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ETAPE 7: Verification
SELECT 'Politiques vehicles:' as info;
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'vehicles'
ORDER BY policyname;

SELECT 'Politiques profiles:' as info;
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ETAPE 8: Test
SELECT 'Test - Company ID de l utilisateur courant:' as info;
SELECT get_user_company_id();

SELECT 'Test - Nombre de vehicules visibles:' as info;
SELECT COUNT(*) FROM vehicles WHERE company_id = get_user_company_id();
