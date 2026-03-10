-- ============================================================================
-- FIX: RLS Policies pour fuel_records
-- ============================================================================

-- 1. Vérifier si RLS est activé
SELECT 
  relname as table_name, 
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname = 'fuel_records';

-- 2. Activer RLS si pas déjà fait
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies conflictuelles
DROP POLICY IF EXISTS fuel_records_company_policy ON fuel_records;
DROP POLICY IF EXISTS fuel_records_select_policy ON fuel_records;
DROP POLICY IF EXISTS fuel_records_insert_policy ON fuel_records;
DROP POLICY IF EXISTS fuel_records_company_isolation ON fuel_records;

-- 4. Créer une policy SELECT pour les utilisateurs authentifiés
-- Ils ne voient que les records de leur entreprise
CREATE POLICY fuel_records_select_company ON fuel_records
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Créer une policy INSERT (via RPC la fonction bypass RLS avec SECURITY DEFINER)
-- Mais on laisse quand même la policy pour les insertions directes
CREATE POLICY fuel_records_insert_company ON fuel_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 6. Policy pour les utilisateurs anonymes (via QR code) - pas de SELECT autorisé
-- Seulement INSERT via la fonction RPC

-- 7. Vérifier les policies créées
SELECT 
  policyname,
  permissive,
  roles::text,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'fuel_records';
