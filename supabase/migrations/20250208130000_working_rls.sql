-- =====================================================
-- VERSION QUI MARCHE: RLS avec bypass sur profiles
-- =====================================================

-- ETAPE 1: NETTOYAGE TOTAL
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('vehicles', 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- ETAPE 2: Fonction qui recupere company_id en BYPASSANT RLS sur profiles
-- SECURITY DEFINER permet de contourner les politiques RLS
DROP FUNCTION IF EXISTS get_current_user_company();

CREATE OR REPLACE FUNCTION get_current_user_company()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute comme le proprietaire de la fonction
AS $$
DECLARE
  result UUID;
BEGIN
  -- Cette requete bypass les politiques RLS de profiles
  SELECT company_id INTO result
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

-- Donner les droits
GRANT EXECUTE ON FUNCTION get_current_user_company() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_company() TO anon;

-- ETAPE 3: Activer RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ETAPE 4: Politique profiles - simple, pas de recursion
CREATE POLICY profiles_own ON profiles 
  FOR ALL 
  USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

-- ETAPE 5: Politique vehicles - utilise la fonction
CREATE POLICY vehicles_company_isolation ON vehicles
  FOR SELECT
  USING (company_id = get_current_user_company());

CREATE POLICY vehicles_insert_own_company ON vehicles
  FOR INSERT
  WITH CHECK (company_id = get_current_user_company());

CREATE POLICY vehicles_update_own_company ON vehicles
  FOR UPDATE
  USING (company_id = get_current_user_company());

CREATE POLICY vehicles_delete_own_company ON vehicles
  FOR DELETE
  USING (company_id = get_current_user_company());

-- ETAPE 6: Verification
SELECT 'Politiques vehicles:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vehicles';

SELECT 'Politiques profiles:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- ETAPE 7: Test
SELECT 'Company de l utilisateur:' as info;
SELECT get_current_user_company();

SELECT 'Vehicules visibles:' as info;
SELECT COUNT(*) FROM vehicles WHERE company_id = get_current_user_company();
