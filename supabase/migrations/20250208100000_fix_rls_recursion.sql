-- =====================================================
-- FIX URGENT: Recursion infinie dans les politiques RLS
-- =====================================================

-- Le probleme: la politique vehicles fait une sous-requete sur profiles,
-- mais profiles a aussi une politique qui depend de users, creant une boucle.

-- SOLUTION 1: Supprimer TOUTES les politiques problematiques sur vehicles
DROP POLICY IF EXISTS vehicles_select_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_update_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_delete_policy ON vehicles;

-- SOLUTION 2: Desactiver temporairement RLS sur vehicles pour verifier que ca marche
-- (Decommenter si necessaire pour test)
-- ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- SOLUTION 3: Creer une politique simple qui utilise auth.uid() directement
-- sans sous-requete sur profiles/users

-- Politique SELECT: L'utilisateur voit les vehicules de sa companie
-- On utilise une jointure directe plutot qu'une sous-requete
CREATE POLICY vehicles_select_policy ON vehicles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = vehicles.company_id
    )
  );

-- Politique INSERT
CREATE POLICY vehicles_insert_policy ON vehicles
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = vehicles.company_id
    )
  );

-- Politique UPDATE
CREATE POLICY vehicles_update_policy ON vehicles
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = vehicles.company_id
    )
  );

-- Politique DELETE
CREATE POLICY vehicles_delete_policy ON vehicles
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = vehicles.company_id
    )
  );

-- =====================================================
-- Verifier que RLS est active sur vehicles
-- =====================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FIX pour la table profiles si elle a aussi des problemes
-- =====================================================

-- Supprimer les politiques existantes sur profiles
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON profiles;

-- Politique simple sur profiles: chacun voit son propre profil
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT 
  USING (id = auth.uid());

-- Politique INSERT sur profiles
CREATE POLICY profiles_insert_policy ON profiles
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- Politique UPDATE sur profiles
CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE 
  USING (id = auth.uid());

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Verification
-- =====================================================

-- Afficher les politiques actives
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('vehicles', 'profiles')
ORDER BY tablename, policyname;
