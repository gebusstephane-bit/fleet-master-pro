-- ================================================================
-- MIGRATION : SUIVI PNEUMATIQUES PROFESSIONNEL
-- Date : 2026-03-01
-- Tables : vehicle_axle_configs, tires, tire_mountings, tire_depth_checks
-- RLS : pattern profiles WHERE id = auth.uid()
-- ================================================================

-- ================================================================
-- TABLE 1 : CONFIGURATION D'ESSIEUX DU VÉHICULE
-- ================================================================
CREATE TABLE IF NOT EXISTS vehicle_axle_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Formule essieux (notation internationale)
  -- '4x2_simple', '4x2_jumele_ar', '4x2_porteur',
  -- '6x2_simple_ar', '6x4_jumele', '8x4_jumele',
  -- 'tracteur_4x2', 'tracteur_6x4', 'tracteur_6x2',
  -- 'semi-2_jumele', 'semi-3_jumele', 'semi-3_simple'
  axle_formula     TEXT        NOT NULL,

  -- Monte pneumatique par essieu (tableau ordonné du 1er au dernier essieu)
  -- Chaque essieu : { position, mount_type, tire_count, is_steering, is_drive, is_liftable }
  axle_details     JSONB       NOT NULL DEFAULT '[]',

  -- Dimensions de référence par essieu
  -- { 'AV': '315/70 R22.5', 'AR1': '315/70 R22.5', ... }
  reference_dimensions JSONB   DEFAULT '{}',

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vac_vehicle_id  ON vehicle_axle_configs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vac_company_id  ON vehicle_axle_configs(company_id);

ALTER TABLE vehicle_axle_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vac_select" ON vehicle_axle_configs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vac_insert" ON vehicle_axle_configs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vac_update" ON vehicle_axle_configs FOR UPDATE
  USING  (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "vac_delete" ON vehicle_axle_configs FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- ================================================================
-- TABLE 2 : PNEUS (chaque pneu physique individuel)
-- ================================================================
CREATE TABLE IF NOT EXISTS tires (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  serial_number              TEXT,
  dot_code                   TEXT,
  manufacture_week           INTEGER,
  manufacture_year           INTEGER,

  -- Caractéristiques
  brand                      TEXT        NOT NULL,
  model                      TEXT,
  dimensions                 TEXT        NOT NULL,
  load_index                 TEXT,
  speed_index                TEXT,
  tire_type                  TEXT        CHECK (tire_type IN (
    'regional', 'longue_distance', 'urbain', 'tout_terrain',
    'hiver', 'remorque', 'basse_hauteur'
  )),

  -- Statut
  status                     TEXT        NOT NULL DEFAULT 'in_stock' CHECK (status IN (
    'in_stock', 'in_use', 'retreaded', 'scrapped'
  )),

  -- Profondeur de gomme
  tread_depth_new            DECIMAL(4,1),
  tread_depth_current        DECIMAL(4,1),
  tread_depth_measured_at    DATE,
  tread_depth_measured_km    INTEGER,

  -- Coût et traçabilité
  purchase_price             DECIMAL(10,2),
  purchase_date              DATE,
  supplier                   TEXT,
  invoice_reference          TEXT,

  -- Rechapage
  is_retreaded               BOOLEAN     DEFAULT false,
  retreaded_count            INTEGER     DEFAULT 0,
  retreaded_date             DATE,

  notes                      TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tires_status     ON tires(status, company_id);
CREATE INDEX IF NOT EXISTS idx_tires_company_id ON tires(company_id);

ALTER TABLE tires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tires_select" ON tires FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tires_insert" ON tires FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tires_update" ON tires FOR UPDATE
  USING  (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tires_delete" ON tires FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- ================================================================
-- TABLE 3 : MONTAGES (historique position d'un pneu sur un véhicule)
-- ================================================================
CREATE TABLE IF NOT EXISTS tire_mountings (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tire_id                 UUID        NOT NULL REFERENCES tires(id) ON DELETE CASCADE,
  vehicle_id              UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id              UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Position sur le véhicule (convention : AV-G, AR1-EXT-G, R1-INT-D, SECOURS, etc.)
  axle_position           TEXT        NOT NULL,

  -- Type de monte
  mount_type              TEXT        NOT NULL CHECK (mount_type IN ('simple', 'jumele_ext', 'jumele_int')),

  -- Kilométrage et dates
  mounted_date            DATE        NOT NULL,
  mounted_km              INTEGER     NOT NULL,
  unmounted_date          DATE,
  unmounted_km            INTEGER,

  -- Profondeur à la dépose
  tread_depth_at_unmount  DECIMAL(4,1),

  -- Raison du démontage
  reason_unmounted        TEXT        CHECK (reason_unmounted IN (
    'worn', 'puncture', 'rotation', 'seasonal',
    'vehicle_sold', 'inspection', 'retreading', 'other'
  )),

  -- Destination après dépose
  destination             TEXT        CHECK (destination IN (
    'stock', 'retreading', 'scrap', 'sold'
  )),

  performed_by            TEXT,
  garage_name             TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index stratégiques
CREATE INDEX IF NOT EXISTS idx_tire_mountings_vehicle
  ON tire_mountings(vehicle_id, unmounted_date);

CREATE INDEX IF NOT EXISTS idx_tire_mountings_active
  ON tire_mountings(vehicle_id) WHERE unmounted_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_tire_mountings_tire
  ON tire_mountings(tire_id);

CREATE INDEX IF NOT EXISTS idx_tire_mountings_company
  ON tire_mountings(company_id);

ALTER TABLE tire_mountings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tm_select" ON tire_mountings FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tm_insert" ON tire_mountings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tm_update" ON tire_mountings FOR UPDATE
  USING  (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tm_delete" ON tire_mountings FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- ================================================================
-- TABLE 4 : MESURES DE PROFONDEUR (suivi régulier sans montage/démontage)
-- ================================================================
CREATE TABLE IF NOT EXISTS tire_depth_checks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mounting_id     UUID        NOT NULL REFERENCES tire_mountings(id) ON DELETE CASCADE,
  tire_id         UUID        NOT NULL REFERENCES tires(id),
  vehicle_id      UUID        NOT NULL REFERENCES vehicles(id),
  company_id      UUID        NOT NULL REFERENCES companies(id),

  check_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  check_km        INTEGER     NOT NULL,
  tread_depth     DECIMAL(4,1) NOT NULL,

  -- Mesure par zone (détecter usure irrégulière)
  depth_inner     DECIMAL(4,1),
  depth_center    DECIMAL(4,1),
  depth_outer     DECIMAL(4,1),

  -- Pression (optionnel)
  pressure_bar    DECIMAL(3,1),

  checked_by      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tire_depth_checks_tire
  ON tire_depth_checks(tire_id, check_date DESC);

CREATE INDEX IF NOT EXISTS idx_tire_depth_checks_company
  ON tire_depth_checks(company_id);

ALTER TABLE tire_depth_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tdc_select" ON tire_depth_checks FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tdc_insert" ON tire_depth_checks FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tdc_update" ON tire_depth_checks FOR UPDATE
  USING  (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tdc_delete" ON tire_depth_checks FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
