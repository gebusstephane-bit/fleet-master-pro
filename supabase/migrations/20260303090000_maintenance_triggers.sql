-- ============================================================================
-- Migration : Triggers de recalcul automatique des prédictions de maintenance
-- Date : 2026-03-03
-- ============================================================================
-- Objectif : Déclencher un recalcul des prédictions quand une maintenance
-- est marquée comme TERMINEE (INSERT ou UPDATE de status)
-- ============================================================================

-- 1. Ajout de la colonne needs_recalculation si elle n'existe pas
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_predictions' 
    AND column_name = 'needs_recalculation'
  ) THEN
    ALTER TABLE maintenance_predictions
    ADD COLUMN needs_recalculation BOOLEAN DEFAULT false;
    
    RAISE NOTICE 'Colonne needs_recalculation ajoutée à maintenance_predictions';
  ELSE
    RAISE NOTICE 'Colonne needs_recalculation existe déjà';
  END IF;
END $$;

-- 2. Création de l'index pour les requêtes rapides
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_needs_recalc
  ON maintenance_predictions(needs_recalculation)
  WHERE needs_recalculation = true;

COMMENT ON INDEX idx_maintenance_predictions_needs_recalc IS 
  'Index pour récupérer rapidement les véhicules nécessitant un recalcul urgent';

-- 3. Fonction de notification (pour applications temps réel)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_maintenance_recalcul()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier uniquement si le status passe à TERMINEE
  IF NEW.status = 'TERMINEE' AND (OLD.status IS NULL OR OLD.status != 'TERMINEE') THEN
    PERFORM pg_notify(
      'maintenance_completed',
      json_build_object(
        'vehicle_id', NEW.vehicle_id,
        'maintenance_record_id', NEW.id,
        'completed_at', NOW()
      )::text
    );
    
    RAISE DEBUG 'Notification envoyée pour vehicle_id: %', NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_maintenance_recalcul() IS 
  'Envoie une notification pg_notify quand une maintenance est terminée';

-- 4. Fonction de mise à jour synchrone des prédictions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_prediction_after_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'TERMINEE' AND (OLD.status IS NULL OR OLD.status != 'TERMINEE') THEN
    -- Marquer les prédictions de ce véhicule pour recalcul prioritaire
    -- Uniquement les alertes actives (overdue, due) - les 'ok' n'ont pas besoin d'être recalculées
    UPDATE maintenance_predictions
    SET 
      needs_recalculation = true,
      calculated_at = NOW()
    WHERE vehicle_id = NEW.vehicle_id
      AND status IN ('overdue', 'due', 'upcoming')
      AND (needs_recalculation IS NULL OR needs_recalculation = false);
    
    RAISE DEBUG 'Prédictions marquées pour recalcul: vehicle_id=%', NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_prediction_after_maintenance() IS 
  'Marque les prédictions d''un véhicule comme nécessitant un recalcul quand une maintenance est terminée';

-- 5. Création des triggers sur maintenance_records
-- ----------------------------------------------------------------------------

-- Trigger de notification (asynchrone)
DROP TRIGGER IF EXISTS trigger_maintenance_completed ON maintenance_records;

CREATE TRIGGER trigger_maintenance_completed
  AFTER INSERT OR UPDATE OF status
  ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION notify_maintenance_recalcul();

COMMENT ON TRIGGER trigger_maintenance_completed ON maintenance_records IS 
  'Déclenche une notification quand une maintenance passe à TERMINEE';

-- Trigger de mise à jour synchrone
DROP TRIGGER IF EXISTS trigger_update_predictions ON maintenance_records;

CREATE TRIGGER trigger_update_predictions
  AFTER INSERT OR UPDATE OF status
  ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_after_maintenance();

COMMENT ON TRIGGER trigger_update_predictions ON maintenance_records IS 
  'Met à jour les prédictions quand une maintenance passe à TERMINEE';

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Afficher les triggers créés
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_records'
ORDER BY trigger_name;

-- Afficher les fonctions créées
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('notify_maintenance_recalcul', 'update_prediction_after_maintenance');

-- Afficher la structure de la colonne ajoutée
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'maintenance_predictions'
AND column_name = 'needs_recalculation';
