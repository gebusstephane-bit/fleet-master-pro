-- =====================================================
-- FIX: Permissions pour les inspections
-- =====================================================

-- 1. Verifier les profils existants
SELECT 'Profils existants:' as info;
SELECT id, email, company_id, role FROM profiles LIMIT 10;

-- 2. Verifier les utilisateurs auth sans profil
SELECT 'Utilisateurs auth SANS profil:' as info;
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3. Creer les profils manquants (avec company_id NULL pour l'instant)
INSERT INTO profiles (id, email, full_name, role, company_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user',
  NULL
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 4. Mettre a jour les profils sans company_id (a adapter selon ton cas)
-- UPDATE profiles SET company_id = 'TON_COMPANY_ID' WHERE company_id IS NULL;

-- 5. Politique RLS pour vehicle_inspections - permettre l'insertion
DROP POLICY IF EXISTS vehicle_inspections_insert_policy ON vehicle_inspections;

CREATE POLICY vehicle_inspections_insert_policy ON vehicle_inspections
  FOR INSERT WITH CHECK (
    -- Autoriser si l'utilisateur est authentifie
    auth.role() = 'authenticated'
  );

-- 6. Politique RLS pour vehicle_inspections - permettre la lecture
DROP POLICY IF EXISTS vehicle_inspections_select_policy ON vehicle_inspections;

CREATE POLICY vehicle_inspections_select_policy ON vehicle_inspections
  FOR SELECT USING (
    -- Voir toutes les inspections de la meme company
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    -- OU si pas de company_id defini sur le profil, voir tout
    OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

-- 7. Desactiver temporairement RLS sur vehicle_inspections pour test
-- ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;

-- 8. Verification des politiques
SELECT 'Politiques sur vehicle_inspections:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vehicle_inspections';
