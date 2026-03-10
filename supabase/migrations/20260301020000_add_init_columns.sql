-- Migration #13-C : Colonnes pour l'initialisation manuelle de l'historique maintenance
-- Permet de distinguer les vraies interventions des initialisations à la reprise du véhicule

ALTER TABLE maintenance_predictions
  ADD COLUMN IF NOT EXISTS is_initialized   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS initialization_note TEXT;

-- Index pour retrouver rapidement les prédictions initialisées manuellement
CREATE INDEX IF NOT EXISTS idx_mp_initialized
  ON maintenance_predictions (vehicle_id, is_initialized)
  WHERE is_initialized = true;

COMMENT ON COLUMN maintenance_predictions.is_initialized IS
  'true = données issues d''une initialisation manuelle (reprise véhicule), false = calculé depuis maintenance_records';
COMMENT ON COLUMN maintenance_predictions.initialization_note IS
  'Note saisie lors de l''initialisation manuelle';
