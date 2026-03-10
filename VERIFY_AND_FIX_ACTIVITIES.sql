-- =============================================================================
-- SCRIPT COMPLET: Vérification et correction complète du système d'activités
-- EXECUTER DANS SUPABASE SQL EDITOR SI LE PROBLÈME PERSISTE
-- =============================================================================

-- 1. Vérifier si l'enum existe, sinon le créer
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

-- 2. Vérifier si la table existe, sinon la créer
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

-- 3. Enable RLS
ALTER TABLE company_activities ENABLE ROW LEVEL SECURITY;

-- 4. Recréer les policies avec les bons rôles
DROP POLICY IF EXISTS company_activities_select ON company_activities;
DROP POLICY IF EXISTS company_activities_write ON company_activities;

-- Policy lecture: tous les membres de l'entreprise
CREATE POLICY company_activities_select ON company_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = company_activities.company_id
    )
  );

-- Policy écriture: ADMIN, DIRECTEUR, AGENT_DE_PARC
CREATE POLICY company_activities_write ON company_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = company_activities.company_id
    )
  );

-- 5. Vérification finale
SELECT 
  'Table company_activities' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_activities') as exists
UNION ALL
SELECT 
  'Enum transport_activity',
  EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_activity')
UNION ALL
SELECT 
  'RLS activé',
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'company_activities')
UNION ALL
SELECT 
  'Policy SELECT',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_activities_select')
UNION ALL
SELECT 
  'Policy WRITE',
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_activities_write');
