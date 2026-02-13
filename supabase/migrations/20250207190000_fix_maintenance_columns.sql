-- Migration: Ajout des colonnes manquantes pour le workflow maintenance

-- Vérifier et ajouter les colonnes manquantes à maintenance_records
DO $$
BEGIN
    -- Colonne requested_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'requested_by') THEN
        ALTER TABLE maintenance_records ADD COLUMN requested_by UUID REFERENCES users(id);
    END IF;

    -- Colonne status avec les nouveaux statuts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'status') THEN
        ALTER TABLE maintenance_records ADD COLUMN status TEXT DEFAULT 'DEMANDE_CREEE';
    END IF;

    -- Colonne priority
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'priority') THEN
        ALTER TABLE maintenance_records ADD COLUMN priority TEXT DEFAULT 'NORMAL';
    END IF;

    -- Colonne requested_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'requested_at') THEN
        ALTER TABLE maintenance_records ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Colonne validated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'validated_at') THEN
        ALTER TABLE maintenance_records ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Colonne rdv_scheduled_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'rdv_scheduled_at') THEN
        ALTER TABLE maintenance_records ADD COLUMN rdv_scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Colonne rdv_confirmed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'rdv_confirmed_at') THEN
        ALTER TABLE maintenance_records ADD COLUMN rdv_confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Colonne completed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'completed_at') THEN
        ALTER TABLE maintenance_records ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Colonne garage_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'garage_name') THEN
        ALTER TABLE maintenance_records ADD COLUMN garage_name TEXT;
    END IF;

    -- Colonne garage_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'garage_address') THEN
        ALTER TABLE maintenance_records ADD COLUMN garage_address TEXT;
    END IF;

    -- Colonne garage_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'garage_phone') THEN
        ALTER TABLE maintenance_records ADD COLUMN garage_phone TEXT;
    END IF;

    -- Colonne rdv_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'rdv_date') THEN
        ALTER TABLE maintenance_records ADD COLUMN rdv_date DATE;
    END IF;

    -- Colonne rdv_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'rdv_time') THEN
        ALTER TABLE maintenance_records ADD COLUMN rdv_time TIME;
    END IF;

    -- Colonne estimated_cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'estimated_cost') THEN
        ALTER TABLE maintenance_records ADD COLUMN estimated_cost DECIMAL(10,2);
    END IF;

    -- Colonne final_cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'final_cost') THEN
        ALTER TABLE maintenance_records ADD COLUMN final_cost DECIMAL(10,2);
    END IF;

    -- Colonne notes_request
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'notes_request') THEN
        ALTER TABLE maintenance_records ADD COLUMN notes_request TEXT;
    END IF;

    -- Colonne notes_validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'notes_validation') THEN
        ALTER TABLE maintenance_records ADD COLUMN notes_validation TEXT;
    END IF;

    -- Colonne notes_completion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'notes_completion') THEN
        ALTER TABLE maintenance_records ADD COLUMN notes_completion TEXT;
    END IF;

    -- Colonne quote_document_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'quote_document_url') THEN
        ALTER TABLE maintenance_records ADD COLUMN quote_document_url TEXT;
    END IF;

    -- Colonne invoice_document_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'invoice_document_url') THEN
        ALTER TABLE maintenance_records ADD COLUMN invoice_document_url TEXT;
    END IF;

    -- Colonne validation_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'validation_token') THEN
        ALTER TABLE maintenance_records ADD COLUMN validation_token UUID DEFAULT gen_random_uuid();
    END IF;

    -- Colonne rdv_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'rdv_token') THEN
        ALTER TABLE maintenance_records ADD COLUMN rdv_token UUID DEFAULT gen_random_uuid();
    END IF;

    -- Colonne company_id si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maintenance_records' AND column_name = 'company_id') THEN
        ALTER TABLE maintenance_records ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
END $$;

-- Mettre à jour les contraintes de type
ALTER TABLE maintenance_records 
    DROP CONSTRAINT IF EXISTS maintenance_records_type_check;

ALTER TABLE maintenance_records 
    ADD CONSTRAINT maintenance_records_type_check 
    CHECK (type IN ('PREVENTIVE', 'CORRECTIVE', 'PNEUMATIQUE', 'CARROSSERIE', 'routine', 'repair', 'inspection', 'tire_change', 'oil_change'));

-- Mettre à jour les contraintes de status
ALTER TABLE maintenance_records 
    DROP CONSTRAINT IF EXISTS maintenance_records_status_check;

ALTER TABLE maintenance_records 
    ADD CONSTRAINT maintenance_records_status_check 
    CHECK (status IN ('DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'completed', 'pending'));

-- Mettre à jour les contraintes de priorité
ALTER TABLE maintenance_records 
    DROP CONSTRAINT IF EXISTS maintenance_records_priority_check;

ALTER TABLE maintenance_records 
    ADD CONSTRAINT maintenance_records_priority_check 
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'));

-- Créer la table maintenance_agenda si elle n'existe pas
CREATE TABLE IF NOT EXISTS maintenance_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('RDV_GARAGE', 'RETOUR_PREVU', 'RAPPEL')),
  attendees UUID[],
  status TEXT CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')) DEFAULT 'SCHEDULED',
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table maintenance_status_history si elle n'existe pas
CREATE TABLE IF NOT EXISTS maintenance_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Recréer la vue maintenance_with_details
DROP VIEW IF EXISTS maintenance_with_details;
CREATE VIEW maintenance_with_details AS
SELECT 
  m.*,
  v.registration_number as vehicle_registration,
  v.brand as vehicle_brand,
  v.model as vehicle_model,
  v.mileage as vehicle_mileage,
  u.first_name as requester_first_name,
  u.last_name as requester_last_name,
  u.email as requester_email
FROM maintenance_records m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
LEFT JOIN users u ON m.requested_by = u.id;

-- Recréer la vue agenda_with_details
DROP VIEW IF EXISTS agenda_with_details;
CREATE VIEW agenda_with_details AS
SELECT 
  a.*,
  m.vehicle_id,
  m.garage_name,
  m.garage_address,
  m.garage_phone,
  m.type as maintenance_type,
  m.priority,
  m.status as maintenance_status,
  v.registration_number as vehicle_registration
FROM maintenance_agenda a
LEFT JOIN maintenance_records m ON a.maintenance_id = m.id
LEFT JOIN vehicles v ON m.vehicle_id = v.id;

-- Activer RLS
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_status_history ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
DROP POLICY IF EXISTS maintenance_company_isolation ON maintenance_records;
CREATE POLICY maintenance_company_isolation ON maintenance_records
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS agenda_company_isolation ON maintenance_agenda;
CREATE POLICY agenda_company_isolation ON maintenance_agenda
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS status_history_company_isolation ON maintenance_status_history;
CREATE POLICY status_history_company_isolation ON maintenance_status_history
  FOR ALL
  USING (maintenance_id IN (
    SELECT id FROM maintenance_records WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

-- Index
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requested_by ON maintenance_records(requested_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_rdv_date ON maintenance_records(rdv_date);
CREATE INDEX IF NOT EXISTS idx_agenda_maintenance_id ON maintenance_agenda(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_agenda_company_id ON maintenance_agenda(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_date ON maintenance_agenda(event_date);
CREATE INDEX IF NOT EXISTS idx_status_history_maintenance_id ON maintenance_status_history(maintenance_id);
