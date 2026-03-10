-- ============================================================
-- Module Gestion des Sinistres — FleetMaster Pro
-- Migration : 20260304000000_incidents_sinistres.sql
-- ============================================================

-- Table principale des sinistres
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),

  -- Numérotation automatique : INC-2026-001
  incident_number TEXT UNIQUE,
  incident_date TIMESTAMPTZ NOT NULL,
  location_description TEXT,

  -- Type et gravité
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'accident_matériel', 'accident_corporel', 'vol',
    'vandalisme', 'incendie', 'panne_grave', 'autre'
  )),
  severity TEXT CHECK (severity IN ('mineur', 'moyen', 'grave', 'très_grave')),

  -- Description
  circumstances TEXT,
  third_party_involved BOOLEAN DEFAULT false,
  third_party_info JSONB,
  injuries_description TEXT,
  witnesses JSONB,

  -- Assurance
  insurance_company TEXT,
  insurance_policy_number TEXT,
  claim_number TEXT,
  claim_date DATE,
  claim_status TEXT CHECK (claim_status IN (
    'non_declaré', 'déclaré', 'en_instruction', 'accepté', 'refusé', 'réglé'
  )) DEFAULT 'non_declaré',
  estimated_damage DECIMAL(10,2),
  final_settlement DECIMAL(10,2),

  -- Statut dossier
  status TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'en_cours', 'clôturé')),

  -- Notes de suivi (journal de bord)
  notes TEXT,

  -- Champs admin
  reported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table documents associés
CREATE TABLE IF NOT EXISTS incident_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN (
    'constat', 'photo', 'rapport_police', 'devis', 'facture', 'autre'
  )),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Index
-- ============================================================
CREATE INDEX IF NOT EXISTS incidents_company_id_idx ON incidents(company_id);
CREATE INDEX IF NOT EXISTS incidents_vehicle_id_idx ON incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS incidents_driver_id_idx ON incidents(driver_id);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incident_documents_incident_id_idx ON incident_documents(incident_id);

-- ============================================================
-- Auto-numérotation : INC-YYYY-NNN
-- ============================================================
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM incidents
  WHERE DATE_PART('year', created_at) = DATE_PART('year', NOW());
  NEW.incident_number := 'INC-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL)
  EXECUTE FUNCTION generate_incident_number();

-- ============================================================
-- updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_documents ENABLE ROW LEVEL SECURITY;

-- incidents : isolé par company_id
CREATE POLICY "incidents_select_own_company" ON incidents FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "incidents_insert_own_company" ON incidents FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "incidents_update_own_company" ON incidents FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "incidents_delete_own_company" ON incidents FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- incident_documents : accès via incidents de la même company
CREATE POLICY "incident_documents_select" ON incident_documents FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "incident_documents_insert" ON incident_documents FOR INSERT
  WITH CHECK (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "incident_documents_delete" ON incident_documents FOR DELETE
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================================
-- Storage bucket privé pour les documents sinistres
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-documents',
  'incident-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS : chemin = {company_id}/{incident_id}/{filename}
CREATE POLICY "incident_docs_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'incident-documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::TEXT FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "incident_docs_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'incident-documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::TEXT FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "incident_docs_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'incident-documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::TEXT FROM profiles WHERE id = auth.uid()
    )
  );
