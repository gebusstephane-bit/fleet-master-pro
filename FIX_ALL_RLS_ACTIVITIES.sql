-- =============================================================================
-- FIX COMPLET: Toutes les RLS policies pour les activités de transport
-- EXECUTER DANS SUPABASE SQL EDITOR
-- =============================================================================

-- 1. Vérifier/créer l'enum transport_activity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_activity') THEN
    CREATE TYPE transport_activity AS ENUM (
      'MARCHANDISES_GENERALES',
      'FRIGORIFIQUE',
      'ADR_COLIS',
      'ADR_CITERNE',
      'CONVOI_EXCEPTIONNEL',
      'BENNE_TRAVAUX_PUBLICS',
      'ANIMAUX_VIVANTS'
    );
    RAISE NOTICE 'Enum transport_activity créé';
  ELSE
    RAISE NOTICE 'Enum transport_activity existe déjà';
  END IF;
END $$;

-- 2. Vérifier/créer la table company_activities
CREATE TABLE IF NOT EXISTS company_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity transport_activity NOT NULL DEFAULT 'MARCHANDISES_GENERALES',
  is_primary boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, activity)
);

-- 3. Vérifier/créer la table vehicle_activity_assignments
CREATE TABLE IF NOT EXISTS vehicle_activity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  activity transport_activity NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS sur les deux tables
ALTER TABLE company_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_activity_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer et recréer toutes les policies avec les bons rôles

-- company_activities - SELECT (tous les membres de l'entreprise)
DROP POLICY IF EXISTS company_activities_select ON company_activities;
CREATE POLICY company_activities_select ON company_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = company_activities.company_id
    )
  );

-- company_activities - WRITE (ADMIN, DIRECTEUR, AGENT_DE_PARC)
DROP POLICY IF EXISTS company_activities_write ON company_activities;
DROP POLICY IF EXISTS company_activities_insert ON company_activities;
DROP POLICY IF EXISTS company_activities_update ON company_activities;
DROP POLICY IF EXISTS company_activities_delete ON company_activities;
CREATE POLICY company_activities_write ON company_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = company_activities.company_id
    )
  );

-- vehicle_activity_assignments - SELECT (tous les membres de l'entreprise)
DROP POLICY IF EXISTS vehicle_activity_select ON vehicle_activity_assignments;
DROP POLICY IF EXISTS vehicle_activity_assignments_select ON vehicle_activity_assignments;
CREATE POLICY vehicle_activity_assignments_select ON vehicle_activity_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN profiles p ON p.company_id = v.company_id
      WHERE v.id = vehicle_activity_assignments.vehicle_id 
      AND p.id = auth.uid()
    )
  );

-- vehicle_activity_assignments - WRITE (ADMIN, DIRECTEUR, AGENT_DE_PARC)
DROP POLICY IF EXISTS vehicle_activity_write ON vehicle_activity_assignments;
DROP POLICY IF EXISTS vehicle_activity_insert ON vehicle_activity_assignments;
DROP POLICY IF EXISTS vehicle_activity_update ON vehicle_activity_assignments;
DROP POLICY IF EXISTS vehicle_activity_delete ON vehicle_activity_assignments;
CREATE POLICY vehicle_activity_assignments_write ON vehicle_activity_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN profiles p ON p.company_id = v.company_id
      WHERE v.id = vehicle_activity_assignments.vehicle_id 
      AND p.id = auth.uid()
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    )
  );

-- 6. Ajouter les index pour la performance
CREATE INDEX IF NOT EXISTS idx_company_activities_company ON company_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activities_primary ON company_activities(company_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_vehicle ON vehicle_activity_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_current ON vehicle_activity_assignments(vehicle_id, end_date) WHERE end_date IS NULL;

-- 7. Vérification finale
SELECT 
  'Table company_activities' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_activities') as exists
UNION ALL
SELECT 
  'Table vehicle_activity_assignments',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_activity_assignments')
UNION ALL
SELECT 
  'RLS company_activities activé',
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'company_activities')
UNION ALL
SELECT 
  'RLS vehicle_activity_assignments activé',
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'vehicle_activity_assignments')
UNION ALL
SELECT 
  'Policy company_activities_select',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_activities_select')
UNION ALL
SELECT 
  'Policy company_activities_write',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_activities_write')
UNION ALL
SELECT 
  'Policy vehicle_activity_assignments_select',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vehicle_activity_assignments_select')
UNION ALL
SELECT 
  'Policy vehicle_activity_assignments_write',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vehicle_activity_assignments_write');
