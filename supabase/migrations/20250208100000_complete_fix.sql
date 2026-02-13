-- =====================================================
-- FIX COMPLET: Recursion RLS + Donnees utilisateur
-- =====================================================

-- ETAPE 1: Creer la fonction pour recuperer le company_id sans recursion
DROP FUNCTION IF EXISTS get_user_company_id();

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
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ETAPE 2: Desactiver RLS sur vehicles pour diagnostic
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- ETAPE 3: Supprimer TOUTES les anciennes politiques
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'vehicles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON vehicles';
  END LOOP;
END
$$;

-- ETAPE 4: Reactiver RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- ETAPE 5: Creer les politiques avec la fonction
CREATE POLICY vehicles_select ON vehicles FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY vehicles_insert ON vehicles FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY vehicles_update ON vehicles FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY vehicles_delete ON vehicles FOR DELETE
  USING (company_id = get_user_company_id());

-- ETAPE 6: Corriger profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON profiles';
  END LOOP;
END
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ETAPE 7: Verifier les politiques
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('vehicles', 'profiles')
ORDER BY tablename, policyname;

-- ETAPE 8: Test - Afficher les vehicules pour le user connecte
SELECT 'Test: Vehicules visibles par l utilisateur connecte:' as info;
SELECT v.id, v.registration_number, v.brand, v.model, v.company_id
FROM vehicles v
WHERE v.company_id = get_user_company_id()
LIMIT 5;
