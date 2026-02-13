-- Migration: Workflow de maintenance complet avec agenda

-- ============================================
-- TABLE: maintenance_records (Workflow complet)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Références
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  
  -- Description intervention
  type TEXT CHECK (type IN ('PREVENTIVE', 'CORRECTIVE', 'PNEUMATIQUE', 'CARROSSERIE')),
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')) DEFAULT 'NORMAL',
  
  -- Workflow statuts
  status TEXT CHECK (status IN (
    'DEMANDE_CREEE',        -- Créé par agent, en attente validation directeur
    'VALIDEE_DIRECTEUR',    -- Validé par directeur, en attente RDV
    'RDV_PRIS',            -- RDV pris par agent, confirmé
    'EN_COURS',            -- Véhicule chez le garagiste
    'TERMINEE',            -- Intervention finie
    'REFUSEE'              -- Refusée par directeur
  )) DEFAULT 'DEMANDE_CREEE',
  
  -- Dates workflow
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  rdv_scheduled_at TIMESTAMP WITH TIME ZONE,
  rdv_confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Infos RDV
  garage_name TEXT,
  garage_address TEXT,
  garage_phone TEXT,
  rdv_date DATE,
  rdv_time TIME,
  
  -- Coûts
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  
  -- Documents
  quote_document_url TEXT,
  invoice_document_url TEXT,
  photos_before TEXT[],
  photos_after TEXT[],
  
  -- Notes
  notes_request TEXT,
  notes_validation TEXT,
  notes_completion TEXT,
  
  -- Tokens sécurisés pour emails
  validation_token UUID DEFAULT gen_random_uuid(),
  rdv_token UUID DEFAULT gen_random_uuid(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requested_by ON maintenance_records(requested_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_rdv_date ON maintenance_records(rdv_date);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_maintenance_records_updated_at ON maintenance_records;
CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: maintenance_agenda (Agenda partagé)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Date/heure
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  
  -- Titre et description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Type événement
  event_type TEXT CHECK (event_type IN ('RDV_GARAGE', 'RETOUR_PREVU', 'RAPPEL')),
  
  -- Participants (pour notifications)
  attendees UUID[],
  
  -- Statut
  status TEXT CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')) DEFAULT 'SCHEDULED',
  
  -- Rappels
  reminder_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_maintenance_id ON maintenance_agenda(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_agenda_company_id ON maintenance_agenda(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_date ON maintenance_agenda(event_date);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON maintenance_agenda(status);

DROP TRIGGER IF EXISTS update_maintenance_agenda_updated_at ON maintenance_agenda;
CREATE TRIGGER update_maintenance_agenda_updated_at
  BEFORE UPDATE ON maintenance_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: maintenance_status_history (Audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_maintenance_id ON maintenance_status_history(maintenance_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's maintenance records
DROP POLICY IF EXISTS maintenance_company_isolation ON maintenance_records;
CREATE POLICY maintenance_company_isolation ON maintenance_records
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can only see their company's agenda events
DROP POLICY IF EXISTS agenda_company_isolation ON maintenance_agenda;
CREATE POLICY agenda_company_isolation ON maintenance_agenda
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can only see their company's status history
DROP POLICY IF EXISTS status_history_company_isolation ON maintenance_status_history;
CREATE POLICY status_history_company_isolation ON maintenance_status_history
  FOR ALL
  USING (maintenance_id IN (
    SELECT id FROM maintenance_records WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

-- ============================================
-- VIEWS UTILES
-- ============================================

-- Vue: Maintenance avec infos véhicule et demandeur
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

-- Vue: Agenda avec infos maintenance
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
