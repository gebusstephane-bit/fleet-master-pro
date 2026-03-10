-- Migration: driver_checklists
-- Checklists de départ pour les chauffeurs

CREATE TABLE IF NOT EXISTS driver_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL DEFAULT 'DEPART',
  status TEXT NOT NULL DEFAULT 'EN_COURS',
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_checklists ENABLE ROW LEVEL SECURITY;

-- Chauffeur voit et gère ses propres checklists
CREATE POLICY "drivers_own_checklists" ON driver_checklists
  FOR ALL USING (driver_id = auth.uid());

-- Admins voient toutes les checklists de leur entreprise
CREATE POLICY "admins_view_company_checklists" ON driver_checklists
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'DIRECTEUR', 'GESTIONNAIRE')
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_driver_checklists_driver ON driver_checklists(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_checklists_vehicle ON driver_checklists(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_checklists_status ON driver_checklists(status);
CREATE INDEX IF NOT EXISTS idx_driver_checklists_company ON driver_checklists(company_id);
