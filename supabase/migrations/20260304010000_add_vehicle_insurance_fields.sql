-- ============================================================
-- Ajout champs assurance sur la table vehicles
-- Migration : 20260304010000_add_vehicle_insurance_fields.sql
-- ============================================================
-- insurance_expiry existe déjà — on ajoute uniquement les deux
-- champs manquants : compagnie et numéro de police.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;

COMMENT ON COLUMN vehicles.insurance_company       IS 'Nom de la compagnie d''assurance (Axa, Allianz, Groupama…)';
COMMENT ON COLUMN vehicles.insurance_policy_number IS 'Numéro de police d''assurance';
COMMENT ON COLUMN vehicles.insurance_expiry        IS 'Date d''expiration du contrat d''assurance';
