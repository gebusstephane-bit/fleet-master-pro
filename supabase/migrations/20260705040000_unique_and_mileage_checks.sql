-- ============================================
-- Item 17 : contraintes d'intégrité (UNIQUE plaque/QR + CHECK mileage)
-- ============================================
-- Données vérifiées SANS violation avant ajout (0 doublon plaque/QR, 0
-- kilométrage négatif). Appliqué en prod le 2026-07-05. Idempotent.
-- ============================================

-- Unicité de la plaque par company (insensible à la casse, hors soft-deleted :
-- une plaque peut être réutilisée après suppression logique)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vehicles_company_plate
  ON vehicles (company_id, UPPER(registration_number))
  WHERE deleted_at IS NULL;

-- Unicité du token QR (verify_qr_token / recherche par token déterministe)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vehicles_qr_code
  ON vehicles (qr_code_data)
  WHERE qr_code_data IS NOT NULL;

-- Kilométrage non négatif (NULL toléré)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_mileage_non_negative;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_mileage_non_negative
  CHECK (mileage IS NULL OR mileage >= 0);

ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_records_mileage_non_negative;
ALTER TABLE fuel_records ADD CONSTRAINT fuel_records_mileage_non_negative
  CHECK (mileage_at_fill IS NULL OR mileage_at_fill >= 0);
