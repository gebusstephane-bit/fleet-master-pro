-- Migration : Suppression du trigger auto-prediction véhicules
-- Date : 2026-02-25
-- Raison : Le trigger tr_create_prediction_on_vehicle bloque la création de véhicules
--          car la fonction create_initial_prediction() s'exécute sans SECURITY DEFINER
--          et viole les policies RLS de la table ai_predictions.
--          La feature ai_predictions n'est plus utilisée.

-- Supprimer le trigger
DROP TRIGGER IF EXISTS tr_create_prediction_on_vehicle ON vehicles;

-- Supprimer la fonction associée
DROP FUNCTION IF EXISTS create_initial_prediction();

-- Vérification
SELECT 'Trigger tr_create_prediction_on_vehicle supprimé avec succès' AS status;
