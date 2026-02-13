-- =====================================================
-- EMERGENCY FIX: Desactiver RLS sur vehicle_inspections
-- =====================================================

-- Si les inspections ne s'enregistrent pas, desactiver RLS temporairement
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicle_inspections'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON vehicle_inspections', r.policyname);
  END LOOP;
END
$$;

-- Reactiver RLS avec des politiques tres permissives
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: tout le monde voit tout
CREATE POLICY vehicle_inspections_select ON vehicle_inspections
  FOR SELECT USING (true);

-- Politique INSERT: tout utilisateur authentifie peut inserer
CREATE POLICY vehicle_inspections_insert ON vehicle_inspections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Politique UPDATE: tout utilisateur authentifie peut modifier
CREATE POLICY vehicle_inspections_update ON vehicle_inspections
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Politique DELETE: tout utilisateur authentifie peut supprimer
CREATE POLICY vehicle_inspections_delete ON vehicle_inspections
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verification
SELECT 'Politiques vehicle_inspections:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vehicle_inspections';

-- Verifier que la table est accessible
SELECT 'Nombre d inspections:' as info;
SELECT COUNT(*) FROM vehicle_inspections;
