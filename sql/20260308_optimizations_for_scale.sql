-- ============================================================
-- OPTIMISATIONS pour traitement massif (1M+ véhicules)
-- ============================================================

-- 1. Index composites pour accélérer les upserts massifs
CREATE INDEX IF NOT EXISTS idx_predictions_upsert 
ON maintenance_predictions(vehicle_id, rule_id) 
INCLUDE (status, priority, calculated_at);

-- 2. Index pour le filtrage rapide des véhicules actifs
CREATE INDEX IF NOT EXISTS idx_vehicles_active_id 
ON vehicles(id) 
WHERE status = 'ACTIF';

-- 3. Partitionnement des prédictions par company_id (optionnel pour très grande échelle)
-- À activer si > 100k véhicules par entreprise
/*
CREATE TABLE maintenance_predictions_partitioned (
  LIKE maintenance_predictions INCLUDING ALL
) PARTITION BY HASH (company_id);

-- Créer 16 partitions
CREATE TABLE maintenance_predictions_p0 PARTITION OF maintenance_predictions_partitioned FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE maintenance_predictions_p1 PARTITION OF maintenance_predictions_partitioned FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... etc jusqu'à p15
*/

-- 4. Optimisation des vacuum pour tables à fort turnover
ALTER TABLE maintenance_predictions SET (autovacuum_vacuum_scale_factor = 0.1);

-- 5. Statistiques à jour pour le query planner
ANALYZE maintenance_predictions;
ANALYZE vehicles;
ANALYZE maintenance_rules;

SELECT 'Optimisations de performance appliquees' as status;
