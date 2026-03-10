-- ============================================
-- FIX: Ajout des colonnes manquantes à profiles
-- ============================================

-- Ajouter company_id à profiles si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter role à profiles si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'EXPLOITANT';
  END IF;
END $$;

-- Recréer les policies fuel_records maintenant que company_id existe dans profiles
DO $$
BEGIN
  -- Supprimer les anciennes policies si elles existent
  DROP POLICY IF EXISTS fuel_records_select ON fuel_records;
  DROP POLICY IF EXISTS fuel_records_insert ON fuel_records;
  
  -- Créer les nouvelles policies
  CREATE POLICY fuel_records_select ON fuel_records
    FOR SELECT USING (
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );
  
  CREATE POLICY fuel_records_insert ON fuel_records
    FOR INSERT WITH CHECK (
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );
END $$;

-- Recréer les policies vehicle_inspections
DO $$
BEGIN
  DROP POLICY IF EXISTS vehicle_inspections_select ON vehicle_inspections;
  
  CREATE POLICY vehicle_inspections_select ON vehicle_inspections
    FOR SELECT USING (
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );
END $$;

SELECT 'Profiles columns fixed' as status;
