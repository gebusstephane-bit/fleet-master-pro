-- ============================================================================
-- FIX : Corriger les policies RLS cassées sur fuel_records
-- Problème : "column v.driver_id does not exist" dans une policy
-- ATTENTION : On garde la table et les données intactes !
-- ============================================================================

-- Étape 1 : Supprimer TOUTES les policies existantes sur fuel_records (y compris la cassée)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'fuel_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON fuel_records', policy_record.policyname);
        RAISE NOTICE 'Policy supprimée: %', policy_record.policyname;
    END LOOP;
END $$;

-- Étape 2 : S'assurer que RLS est activé
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Étape 3 : Créer une policy SELECT propre (basée sur company_id uniquement)
CREATE POLICY fuel_records_select ON fuel_records
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Étape 4 : Créer une policy INSERT propre
CREATE POLICY fuel_records_insert ON fuel_records
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Étape 5 : Créer une policy UPDATE propre
CREATE POLICY fuel_records_update ON fuel_records
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Étape 6 : Créer une policy DELETE propre (admin uniquement)
CREATE POLICY fuel_records_delete ON fuel_records
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'DIRECTEUR')
    )
  );

-- Étape 7 : Vérification - Afficher les policies actives
SELECT 'Policies actives sur fuel_records:' as info;
SELECT policyname, permissive, roles, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'fuel_records'
ORDER BY policyname;
