-- =====================================================
-- EMERGENCY FIX: Recursion infinie RLS
-- =====================================================

-- ETAPE 1: Desactiver RLS sur vehicles TEMPORAIREMENT pour tester
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Verifier que les donnees sont accessibles
SELECT 'Vehicules accessibles: ' || COUNT(*)::text as result FROM vehicles;

-- ETAPE 2: Reactiver RLS avec des politiques CORRECTES
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes politiques
DROP POLICY IF EXISTS vehicles_select_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_update_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_delete_policy ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;
DROP POLICY IF EXISTS "Enable read access for users in same company" ON vehicles;
DROP POLICY IF EXISTS "Enable insert for users in same company" ON vehicles;
DROP POLICY IF EXISTS "Enable update for users in same company" ON vehicles;
DROP POLICY IF EXISTS "Enable delete for admin users" ON vehicles;

-- ETAPE 3: Creer une fonction securisee qui recupere le company_id
-- Cette fonction evite la recursion car elle utilise SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ETAPE 4: Creer des politiques utilisant cette fonction

-- Politique SELECT
CREATE POLICY vehicles_select ON vehicles
  FOR SELECT
  USING (company_id = get_user_company_id());

-- Politique INSERT
CREATE POLICY vehicles_insert ON vehicles
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- Politique UPDATE
CREATE POLICY vehicles_update ON vehicles
  FOR UPDATE
  USING (company_id = get_user_company_id());

-- Politique DELETE
CREATE POLICY vehicles_delete ON vehicles
  FOR DELETE
  USING (company_id = get_user_company_id());

-- ETAPE 5: Corriger aussi les politiques sur profiles si necessaire
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;

-- Politique simple: chacun voit/modifie son propre profil
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ETAPE 6: Verification
SELECT 'Politiques activees:' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('vehicles', 'profiles')
ORDER BY tablename, policyname;
