-- ============================================================
-- Migration : Système de documents officiels pour les conducteurs
-- Bucket Supabase Storage privé + table de métadonnées + RLS
-- ============================================================

-- ── 1. BUCKET STORAGE ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  false,        -- PRIVÉ : jamais d'URL publique
  10485760,     -- 10 MB max par fichier
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. POLICIES RLS STORAGE ────────────────────────────────────────────────────
-- Schéma réel : isolation via profiles.company_id (pas de company_users)

DROP POLICY IF EXISTS "Driver docs upload by company" ON storage.objects;
DROP POLICY IF EXISTS "Driver docs read by company"   ON storage.objects;
DROP POLICY IF EXISTS "Driver docs delete by company" ON storage.objects;

-- INSERT : l'utilisateur peut uploader vers son bucket si le conducteur appartient à sa company
CREATE POLICY "Driver docs upload by company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents'
  AND auth.uid() IN (
    SELECT p.id
    FROM profiles p
    INNER JOIN drivers d ON d.company_id = p.company_id
    WHERE d.id = (storage.foldername(name))[2]::uuid
      AND p.id = auth.uid()
  )
);

-- SELECT : lecture des documents de sa company uniquement
CREATE POLICY "Driver docs read by company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents'
  AND auth.uid() IN (
    SELECT p.id
    FROM profiles p
    INNER JOIN drivers d ON d.company_id = p.company_id
    WHERE d.id = (storage.foldername(name))[2]::uuid
      AND p.id = auth.uid()
  )
);

-- DELETE : suppression des documents de sa company uniquement
CREATE POLICY "Driver docs delete by company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-documents'
  AND auth.uid() IN (
    SELECT p.id
    FROM profiles p
    INNER JOIN drivers d ON d.company_id = p.company_id
    WHERE d.id = (storage.foldername(name))[2]::uuid
      AND p.id = auth.uid()
  )
);

-- ── 3. TABLE DE MÉTADONNÉES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID        NOT NULL REFERENCES drivers(id)   ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT        NOT NULL CHECK (document_type IN (
                              'permis', 'carte_conducteur', 'fco', 'fimo',
                              'visite_medicale', 'adr', 'qi', 'autre'
                            )),
  document_name TEXT        NOT NULL,   -- nom original du fichier
  storage_path  TEXT        NOT NULL,   -- chemin dans Supabase Storage
  file_size     INTEGER,
  mime_type     TEXT,
  expiry_date   DATE,                   -- date d'expiration du document (nullable)
  side          TEXT        CHECK (side IN ('recto', 'verso', 'complet')),
  notes         TEXT,
  uploaded_by   UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_driver_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_driver_documents_updated_at ON driver_documents;
CREATE TRIGGER set_driver_documents_updated_at
  BEFORE UPDATE ON driver_documents
  FOR EACH ROW EXECUTE FUNCTION update_driver_documents_updated_at();

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id   ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_company_id  ON driver_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry_date ON driver_documents(expiry_date);

-- ── 4. RLS TABLE ───────────────────────────────────────────────────────────────

ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Driver documents isolation by company" ON driver_documents;

CREATE POLICY "Driver documents isolation by company"
ON driver_documents FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);
