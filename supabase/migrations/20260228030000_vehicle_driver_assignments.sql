-- Migration: vehicle_driver_assignments
-- Système d'affectation conducteur-véhicule avec historique

CREATE TABLE IF NOT EXISTS vehicle_driver_assignments (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID         NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id    UUID         NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_primary   BOOLEAN      NOT NULL DEFAULT true,
  start_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,
  notes        TEXT,
  assigned_by  UUID         REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Un seul conducteur principal actif par véhicule (index partiel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vda_primary_active
  ON vehicle_driver_assignments(vehicle_id)
  WHERE is_primary = true AND end_date IS NULL;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_vda_vehicle_id ON vehicle_driver_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vda_driver_id  ON vehicle_driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_vda_company_id ON vehicle_driver_assignments(company_id);

-- RLS
ALTER TABLE vehicle_driver_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vda_select" ON vehicle_driver_assignments FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vda_insert" ON vehicle_driver_assignments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vda_update" ON vehicle_driver_assignments FOR UPDATE
  USING  (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vda_delete" ON vehicle_driver_assignments FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
