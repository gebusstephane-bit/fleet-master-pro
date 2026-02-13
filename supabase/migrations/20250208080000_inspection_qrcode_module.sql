-- ============================================
-- MIGRATION: Module Contrôle QR Code Véhicules
-- ============================================

-- Table: Types de défauts d'inspection (référence)
CREATE TABLE IF NOT EXISTS inspection_defect_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT CHECK (category IN (
    'FREINS', 'MOTEUR', 'TRANSMISSION', 'ELECTRIQUE', 
    'CARROSSERIE', 'PNEUMATIQUES', 'ECLAIRAGE', 'CLIMATISATION',
    'FRIGO_C1', 'FRIGO_C2', 'HYDRAULIQUE', 'AUTRE'
  )),
  label TEXT NOT NULL,
  severity_default TEXT CHECK (severity_default IN ('MINEUR', 'MAJEUR', 'CRITIQUE')),
  requires_intervention BOOLEAN DEFAULT false,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Inspections de véhicules
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Références
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  conducted_by UUID REFERENCES users(id),
  
  -- Date et lieu
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location TEXT DEFAULT 'Dépôt',
  
  -- Données véhicule au moment du contrôle
  mileage INTEGER NOT NULL,
  fuel_level INTEGER CHECK (fuel_level BETWEEN 0 AND 100),
  
  -- Niveaux spécifiques (selon type véhicule)
  adblue_level INTEGER CHECK (adblue_level BETWEEN 0 AND 100),
  gnr_level INTEGER CHECK (gnr_level BETWEEN 0 AND 100),
  
  -- État général (notation 1-5)
  cleanliness_exterior INTEGER CHECK (cleanliness_exterior BETWEEN 1 AND 5),
  cleanliness_interior INTEGER CHECK (cleanliness_interior BETWEEN 1 AND 5),
  cleanliness_cargo_area INTEGER CHECK (cleanliness_cargo_area BETWEEN 1 AND 5),
  
  -- Températures (PL Frigo)
  compartment_c1_temp DECIMAL(4,1),
  compartment_c2_temp DECIMAL(4,1),
  
  -- État des pneumatiques (JSON)
  tires_condition JSONB DEFAULT '{
    "front_left": {"pressure": null, "wear": "OK", "damage": null},
    "front_right": {"pressure": null, "wear": "OK", "damage": null},
    "rear_left": {"pressure": null, "wear": "OK", "damage": null},
    "rear_right": {"pressure": null, "wear": "OK", "damage": null},
    "spare": {"pressure": null, "wear": "OK", "damage": null}
  }',
  
  -- Défauts signalés
  reported_defects JSONB[] DEFAULT '{}',
  
  -- Défauts critiques
  critical_defects BOOLEAN DEFAULT false,
  critical_defects_details TEXT,
  
  -- Signature et validation
  driver_name TEXT,
  driver_signature TEXT,
  inspector_notes TEXT,
  
  -- Workflow
  status TEXT CHECK (status IN (
    'SOUMIS',
    'VALIDE',
    'REFUSE',
    'INTERVENTION_CREEE'
  )) DEFAULT 'SOUMIS',
  
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  validation_notes TEXT,
  
  -- Lien vers maintenance
  linked_maintenance_id UUID REFERENCES maintenance_records(id),
  
  -- Photos
  photos_exterior TEXT[] DEFAULT '{}',
  photos_interior TEXT[] DEFAULT '{}',
  photos_cargo_area TEXT[] DEFAULT '{}',
  photos_defects TEXT[] DEFAULT '{}',
  
  -- QR Code et accès
  qr_code_url TEXT,
  access_token UUID DEFAULT gen_random_uuid(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company ON vehicle_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON vehicle_inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON vehicle_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_token ON vehicle_inspections(access_token);

-- Vue: Inspections avec détails véhicule
DROP VIEW IF EXISTS inspections_with_details;
CREATE VIEW inspections_with_details AS
SELECT 
  i.*,
  v.registration_number as vehicle_registration,
  v.brand as vehicle_brand,
  v.model as vehicle_model,
  v.type as vehicle_type,
  v.mileage as vehicle_current_mileage,
  u.first_name as conductor_first_name,
  u.last_name as conductor_last_name,
  val.first_name as validator_first_name,
  val.last_name as validator_last_name
FROM vehicle_inspections i
LEFT JOIN vehicles v ON i.vehicle_id = v.id
LEFT JOIN users u ON i.conducted_by = u.id
LEFT JOIN users val ON i.validated_by = val.id;

-- RLS Policies
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_defect_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspections_company_isolation ON vehicle_inspections;
CREATE POLICY inspections_company_isolation ON vehicle_inspections
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS defect_types_company_isolation ON inspection_defect_types;
CREATE POLICY defect_types_company_isolation ON inspection_defect_types
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vehicle_inspections_updated_at ON vehicle_inspections;
CREATE TRIGGER update_vehicle_inspections_updated_at
  BEFORE UPDATE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion défauts types par défaut
INSERT INTO inspection_defect_types (category, label, severity_default, requires_intervention) VALUES
  ('FREINS', 'Problème de freins', 'CRITIQUE', true),
  ('MOTEUR', 'Problème moteur', 'CRITIQUE', true),
  ('TRANSMISSION', 'Problème transmission', 'MAJEUR', true),
  ('ELECTRIQUE', 'Problème électrique', 'MAJEUR', true),
  ('CARROSSERIE', 'Dégât carrosserie', 'MINEUR', false),
  ('PNEUMATIQUES', 'Pneu endommagé', 'CRITIQUE', true),
  ('ECLAIRAGE', 'Feu défectueux', 'MAJEUR', true),
  ('CLIMATISATION', 'Climatisation HS', 'MINEUR', false),
  ('FRIGO_C1', 'Température C1 anormale', 'CRITIQUE', true),
  ('FRIGO_C2', 'Température C2 anormale', 'MAJEUR', true),
  ('HYDRAULIQUE', 'Problème hydraulique', 'MAJEUR', true),
  ('AUTRE', 'Autre problème', 'MINEUR', false)
ON CONFLICT DO NOTHING;
