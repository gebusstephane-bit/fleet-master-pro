-- =============================================================================
-- MIGRATION: Gestion Multi-Activités de Transport
-- DATE: 2026-03-07
-- AUTEUR: Database Architect
-- OBJECTIF: Ajouter la gestion des activités (ADR, Frigo, etc.) sans breaking change
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Création de l'enum des activités de transport
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_activity') THEN
    CREATE TYPE transport_activity AS ENUM (
      'MARCHANDISES_GENERALES',  -- Bâché/Tautliner/Fourgon (défaut existant)
      'FRIGORIFIQUE',            -- Température dirigée
      'ADR_COLIS',              -- Matières dangereuses colis
      'ADR_CITERNE',            -- Citernes ADR (spécifique)
      'CONVOI_EXCEPTIONNEL',    -- Convoi exceptionnel
      'BENNE_TRAVAUX_PUBLICS',  -- TP/Benne
      'ANIMAUX_VIVANTS'         -- Bétaillère
    );
    RAISE NOTICE 'Enum transport_activity créé';
  ELSE
    RAISE NOTICE 'Enum transport_activity existe déjà';
  END IF;
END $$;

-- =============================================================================
-- ÉTAPE 2: Table company_activities (Multi-activités par entreprise)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity transport_activity NOT NULL DEFAULT 'MARCHANDISES_GENERALES',
  is_primary boolean DEFAULT false,
  settings jsonb DEFAULT '{}', -- Paramètres spécifiques (ex: {"adr_type": "colis", "adr_class": "3"})
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, activity)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_company_activities_company ON company_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activities_primary ON company_activities(company_id, is_primary);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_company_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_company_activities_updated_at ON company_activities;
CREATE TRIGGER trigger_company_activities_updated_at
  BEFORE UPDATE ON company_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_company_activities_updated_at();

-- =============================================================================
-- ÉTAPE 3: Table compliance_rules (Règles métier de conformité)
-- =============================================================================

CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity transport_activity NOT NULL,
  document_code varchar NOT NULL, -- 'CT', 'TACHY', 'ATP', 'ADR_CERT', 'VGP_LEVAGE'
  document_name varchar NOT NULL, -- 'Contrôle Technique', 'Chronotachygraphe'
  frequency_months int NOT NULL,
  is_mandatory boolean DEFAULT true,
  requires_equipment boolean DEFAULT false,
  equipment_list text[] DEFAULT NULL, -- Liste d'équipements si requires_equipment = true
  applicable_vehicle_types text[] DEFAULT NULL, -- ['POIDS_LOURD', 'TRACTEUR_ROUTIER'] ou NULL pour tous
  reminder_days int DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_compliance_rules_activity ON compliance_rules(activity);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_document ON compliance_rules(activity, document_code);

-- Contrainte d'unicité sur activity + document_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_compliance_rule'
  ) THEN
    ALTER TABLE compliance_rules ADD CONSTRAINT unique_compliance_rule UNIQUE (activity, document_code);
  END IF;
END $$;

-- =============================================================================
-- ÉTAPE 4: Table vehicle_activity_assignments (Historique des activités)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicle_activity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  activity transport_activity NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT current_date,
  end_date date, -- NULL = en cours
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_vehicle ON vehicle_activity_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_current ON vehicle_activity_assignments(vehicle_id, end_date) WHERE end_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_dates ON vehicle_activity_assignments(vehicle_id, start_date, end_date);

-- Contrainte: une seule activité en cours par véhicule (optionnel mais recommandé)
-- Note: Si vous voulez permettre plusieurs activités simultanées (ex: ADR + Frigo),
-- commentez cette contrainte partielle
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_single_current_activity 
ON vehicle_activity_assignments(vehicle_id) 
WHERE end_date IS NULL;

-- =============================================================================
-- ÉTAPE 5: Ajout colonne compatible_activities dans vehicles (NULLABLE - SAFE)
-- =============================================================================

-- Colonne optionnelle pour compatibilité activités
-- NULL = comportement legacy (basé uniquement sur le type de véhicule)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS compatible_activities transport_activity[] DEFAULT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN vehicles.compatible_activities IS 
'Activités compatibles avec le véhicule. NULL = comportement legacy basé sur type uniquement. Ex: {ADR_COLIS, FRIGORIFIQUE}';

-- Index GIN pour rechercher dans le array (perf)
CREATE INDEX IF NOT EXISTS idx_vehicles_compatible_activities ON vehicles USING GIN(compatible_activities) 
WHERE compatible_activities IS NOT NULL;

-- =============================================================================
-- ÉTAPE 6: Vue pour faciliter les requêtes (véhicules avec activités actives)
-- =============================================================================

CREATE OR REPLACE VIEW vehicle_current_activity AS
SELECT 
  v.id AS vehicle_id,
  v.registration_number,
  v.type AS vehicle_type,
  v.company_id,
  vaa.activity AS current_activity,
  vaa.start_date AS activity_start_date,
  vaa.notes AS activity_notes,
  CASE 
    WHEN v.compatible_activities IS NOT NULL THEN v.compatible_activities
    ELSE ARRAY[
      CASE v.type
        WHEN 'POIDS_LOURD_FRIGO' THEN 'FRIGORIFIQUE'::transport_activity
        WHEN 'REMORQUE_FRIGO' THEN 'FRIGORIFIQUE'::transport_activity
        ELSE 'MARCHANDISES_GENERALES'::transport_activity
      END
    ]
  END AS inferred_activities
FROM vehicles v
LEFT JOIN vehicle_activity_assignments vaa ON v.id = vaa.vehicle_id AND vaa.end_date IS NULL
WHERE v.status != 'deleted' OR v.status IS NULL;

-- =============================================================================
-- ÉTAPE 7: Fonction helper pour obtenir les règles applicables à un véhicule
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vehicle_compliance_rules(p_vehicle_id uuid)
RETURNS TABLE (
  rule_id uuid,
  activity transport_activity,
  document_code varchar,
  document_name varchar,
  frequency_months int,
  is_mandatory boolean,
  requires_equipment boolean,
  equipment_list text[],
  reminder_days int
) AS $$
DECLARE
  v_type text;
  v_activities transport_activity[];
BEGIN
  -- Récupère le type et les activités du véhicule
  SELECT v.type, v.compatible_activities 
  INTO v_type, v_activities
  FROM vehicles v
  WHERE v.id = p_vehicle_id;
  
  -- Si pas d'activités définies, déduit du type
  IF v_activities IS NULL THEN
    IF v_type IN ('POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO') THEN
      v_activities := ARRAY['FRIGORIFIQUE'::transport_activity];
    ELSE
      v_activities := ARRAY['MARCHANDISES_GENERALES'::transport_activity];
    END IF;
  END IF;
  
  -- Retourne les règles applicables
  RETURN QUERY
  SELECT 
    cr.id,
    cr.activity,
    cr.document_code,
    cr.document_name,
    cr.frequency_months,
    cr.is_mandatory,
    cr.requires_equipment,
    cr.equipment_list,
    cr.reminder_days
  FROM compliance_rules cr
  WHERE cr.activity = ANY(v_activities)
    AND (
      cr.applicable_vehicle_types IS NULL 
      OR v_type = ANY(cr.applicable_vehicle_types)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- ÉTAPE 8: RLS Policies pour les nouvelles tables (sécurité)
-- =============================================================================

-- Enable RLS
ALTER TABLE company_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_activity_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: company_activities - lecture pour membres de l'entreprise
DROP POLICY IF EXISTS company_activities_select ON company_activities;
CREATE POLICY company_activities_select ON company_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      JOIN profiles p ON p.company_id = c.id
      WHERE c.id = company_activities.company_id 
      AND p.id = auth.uid()
    )
  );

-- Policy: company_activities - écriture pour admins/agents de parc
DROP POLICY IF EXISTS company_activities_write ON company_activities;
CREATE POLICY company_activities_write ON company_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = company_activities.company_id
    )
  );

-- Policy: compliance_rules - lecture publique (référentiel)
DROP POLICY IF EXISTS compliance_rules_select ON compliance_rules;
CREATE POLICY compliance_rules_select ON compliance_rules
  FOR SELECT TO authenticated USING (true);

-- Policy: compliance_rules - écriture pour super admins uniquement
DROP POLICY IF EXISTS compliance_rules_write ON compliance_rules;
CREATE POLICY compliance_rules_write ON compliance_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Policy: vehicle_activity_assignments - lecture pour membres entreprise
DROP POLICY IF EXISTS vehicle_activity_select ON vehicle_activity_assignments;
CREATE POLICY vehicle_activity_select ON vehicle_activity_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN profiles p ON p.company_id = v.company_id
      WHERE v.id = vehicle_activity_assignments.vehicle_id 
      AND p.id = auth.uid()
    )
  );

-- Policy: vehicle_activity_assignments - écriture pour admins/agents de parc
DROP POLICY IF EXISTS vehicle_activity_write ON vehicle_activity_assignments;
CREATE POLICY vehicle_activity_write ON vehicle_activity_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN profiles p ON p.company_id = v.company_id
      WHERE v.id = vehicle_activity_assignments.vehicle_id 
      AND p.id = auth.uid()
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    )
  );

-- =============================================================================
-- ÉTAPE 9: Migration de données - Initialisation des entreprises existantes
-- =============================================================================

-- Insère l'activité MARCHANDISES_GENERALES comme primaire pour toutes les entreprises existantes
-- qui n'ont pas encore d'activités définies
INSERT INTO company_activities (company_id, activity, is_primary, settings)
SELECT 
  c.id,
  'MARCHANDISES_GENERALES'::transport_activity,
  true,
  '{}'::jsonb
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_activities ca WHERE ca.company_id = c.id
)
ON CONFLICT (company_id, activity) DO NOTHING;

-- Marque tous les véhicules PL Frigo comme compatibles FRIGORIFIQUE
UPDATE vehicles 
SET compatible_activities = ARRAY['FRIGORIFIQUE'::transport_activity]
WHERE type IN ('POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO')
  AND compatible_activities IS NULL;

-- Marque tous les autres véhicules comme MARCHANDISES_GENERALES
UPDATE vehicles 
SET compatible_activities = ARRAY['MARCHANDISES_GENERALES'::transport_activity]
WHERE type NOT IN ('POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO')
  AND compatible_activities IS NULL;

-- =============================================================================
-- VÉRIFICATION: Log de fin de migration
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION TERMINEE AVEC SUCCES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Objets créés:';
  RAISE NOTICE '  - Enum: transport_activity';
  RAISE NOTICE '  - Table: company_activities';
  RAISE NOTICE '  - Table: compliance_rules';
  RAISE NOTICE '  - Table: vehicle_activity_assignments';
  RAISE NOTICE '  - Vue: vehicle_current_activity';
  RAISE NOTICE '  - Fonction: get_vehicle_compliance_rules()';
  RAISE NOTICE '  - Colonne: vehicles.compatible_activities (nullable)';
  RAISE NOTICE '========================================';
END $$;
