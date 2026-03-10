-- Migration: Ajout colonne purchase_date à la table vehicles
-- La colonne était référencée dans le code (actions/vehicles.ts, maintenance-predictor.ts)
-- mais absente en base de données. Idempotente (IF NOT EXISTS).

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE;

COMMENT ON COLUMN vehicles.purchase_date IS 'Date d''achat du véhicule (optionnelle, utile pour la gestion financière et la maintenance prédictive)';
