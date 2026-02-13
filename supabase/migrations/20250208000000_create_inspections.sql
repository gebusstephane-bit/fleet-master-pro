-- =====================================================
-- Creation de la table profiles si elle n existe pas
-- =====================================================

-- Table profiles (creee si elle n existe pas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      company_id UUID,
      phone TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END
$$;

-- =====================================================
-- Creation de la table vehicle_inspections
-- =====================================================

-- Type enum pour le statut des inspections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE inspection_status AS ENUM (
      'PENDING', 'COMPLETED', 'ISSUES_FOUND', 'CRITICAL_ISSUES'
    );
  END IF;
END
$$;

-- Type enum pour la severite des defauts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_severity') THEN
    CREATE TYPE defect_severity AS ENUM ('MINEUR', 'MAJEUR', 'CRITIQUE');
  END IF;
END
$$;

-- Type enum pour les categories de defauts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_category') THEN
    CREATE TYPE defect_category AS ENUM ('MECANIQUE', 'ELECTRIQUE', 'CARROSSERIE', 'PNEUMATIQUE', 'PROPRETE', 'AUTRE');
  END IF;
END
$$;

-- Table principale des inspections
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  vehicle_id UUID NOT NULL,
  company_id UUID NOT NULL,
  created_by UUID,
  
  -- Informations generales
  mileage INTEGER NOT NULL,
  fuel_level INTEGER NOT NULL CHECK (fuel_level >= 0 AND fuel_level <= 100),
  adblue_level INTEGER CHECK (adblue_level >= 0 AND adblue_level <= 100),
  gnr_level INTEGER CHECK (gnr_level >= 0 AND gnr_level <= 100),
  
  -- Proprete (note de 1 a 5)
  cleanliness_exterior INTEGER NOT NULL CHECK (cleanliness_exterior >= 1 AND cleanliness_exterior <= 5),
  cleanliness_interior INTEGER NOT NULL CHECK (cleanliness_interior >= 1 AND cleanliness_interior <= 5),
  cleanliness_cargo_area INTEGER CHECK (cleanliness_cargo_area >= 1 AND cleanliness_cargo_area <= 5),
  
  -- Temperatures frigorifique (optionnel)
  compartment_c1_temp DECIMAL(5,2),
  compartment_c2_temp DECIMAL(5,2),
  
  -- Etat des pneus (JSONB pour flexibilite)
  tires_condition JSONB NOT NULL DEFAULT '{
    "front_left": {"pressure": null, "wear": "OK", "damage": null},
    "front_right": {"pressure": null, "wear": "OK", "damage": null},
    "rear_left": {"pressure": null, "wear": "OK", "damage": null},
    "rear_right": {"pressure": null, "wear": "OK", "damage": null},
    "spare": {"pressure": null, "wear": "OK", "damage": null}
  }'::jsonb,
  
  -- Defauts signales
  reported_defects JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{"category": "MECANIQUE", "description": "...", "severity": "MAJEUR", "requires_immediate_maintenance": true}]
  
  -- Photos
  photos TEXT[] DEFAULT '{}',
  
  -- Signature et validation
  driver_name TEXT NOT NULL,
  driver_signature TEXT,  -- Base64 de la signature
  inspector_notes TEXT,
  location TEXT DEFAULT 'Depot',
  
  -- Statut
  status inspection_status NOT NULL DEFAULT 'COMPLETED',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT valid_mileage CHECK (mileage >= 0)
);

-- Index pour les performances
CREATE INDEX idx_vehicle_inspections_vehicle_id ON vehicle_inspections(vehicle_id);
CREATE INDEX idx_vehicle_inspections_company_id ON vehicle_inspections(company_id);
CREATE INDEX idx_vehicle_inspections_created_at ON vehicle_inspections(created_at DESC);
CREATE INDEX idx_vehicle_inspections_status ON vehicle_inspections(status);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_inspections_updated_at
    BEFORE UPDATE ON vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Politiques RLS pour vehicle_inspections
-- =====================================================

ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs ne voient que les inspections de leur entreprise
CREATE POLICY vehicle_inspections_select_policy ON vehicle_inspections
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent creer des inspections pour leur entreprise
CREATE POLICY vehicle_inspections_insert_policy ON vehicle_inspections
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique: Seuls les admins et managers peuvent modifier/supprimer
CREATE POLICY vehicle_inspections_update_policy ON vehicle_inspections
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ADMIN', 'MANAGER')
    )
  );

CREATE POLICY vehicle_inspections_delete_policy ON vehicle_inspections
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')
    )
  );

-- =====================================================
-- Commentaires
-- =====================================================

COMMENT ON TABLE vehicle_inspections IS 'Table des controles d etat des vehicules (QR Code inspections)';
COMMENT ON COLUMN vehicle_inspections.reported_defects IS 'JSON array of defects: [{category, description, severity, requires_immediate_maintenance}]';
COMMENT ON COLUMN vehicle_inspections.tires_condition IS 'JSON object with tire conditions for each position';
COMMENT ON COLUMN vehicle_inspections.status IS 'PENDING=En cours, COMPLETED=OK, ISSUES_FOUND=Anomalies, CRITICAL_ISSUES=Problemes critiques';
