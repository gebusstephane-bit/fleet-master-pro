-- =====================================================
-- SOLUTION NUCLEAIRE: Supprimer TOUTES les politiques RLS
-- =====================================================

-- ETAPE 1: Desactiver RLS completement sur toutes les tables problematiques
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ETAPE 2: Supprimer TOUTES les politiques (boucle sur toutes les tables)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- ETAPE 3: Supprimer les fonctions qui peuvent causer des problemes
DROP FUNCTION IF EXISTS get_user_company_id();

-- ETAPE 4: Verifier qu'il n'y a plus de politiques
SELECT 'Politiques restantes:' as info;
SELECT tablename, policyname FROM pg_policies ORDER BY tablename, policyname;

-- =====================================================
-- ETAPE 5: Reactiver RLS avec des politiques ULTRA-SIMPLES
-- =====================================================

-- Politique vehicles: Tout le monde voit tout (temporaire pour debug)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select ON vehicles FOR SELECT USING (true);
CREATE POLICY vehicles_insert ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY vehicles_update ON vehicles FOR UPDATE USING (true);
CREATE POLICY vehicles_delete ON vehicles FOR DELETE USING (true);

-- Politique profiles: Chacun voit son propre profil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- ETAPE 6: Verification
-- =====================================================

SELECT 'Politiques activees:' as info;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('vehicles', 'profiles')
ORDER BY tablename, policyname;

-- Test
SELECT 'Test: Nombre de vehicules:' as info;
SELECT COUNT(*) FROM vehicles;
