-- ============================================================
-- Migration : Index de performance — tables critiques
-- Objectif  : Éliminer les Seq Scan sur fuel_records, alerts,
--             maintenance_records et driver_documents
-- ============================================================
-- NOTE : CONCURRENTLY retiré — incompatible avec les transactions
-- Supabase (SQL Editor + supabase db push). Les index sont créés
-- avec un lock bref sur la table (acceptable en migration initiale).
-- ============================================================

-- ============================================================
-- 1. FUEL_RECORDS
-- ============================================================
-- Déjà existants (créés dans 20260226010000_qrcode_triple_access.sql) :
--   idx_fuel_records_vehicle  → fuel_records(vehicle_id)
--   idx_fuel_records_company  → fuel_records(company_id)
--   idx_fuel_records_date     → fuel_records(date)
--
-- NOUVEAU : index composite (vehicle_id, date DESC) pour les
-- requêtes "historique de ravitaillement d'un véhicule trié par date".
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_date
    ON fuel_records(vehicle_id, date DESC);

-- ============================================================
-- 2. ALERTS — aucun index n'existait sur cette table
-- ============================================================
-- Structure réelle : company_id (PAS organization_id),
--                   severity   (PAS priority)
--
-- 2a. Recherche par entité liée (véhicule, conducteur…)
CREATE INDEX IF NOT EXISTS idx_alerts_entity_id
    ON alerts(entity_id)
    WHERE entity_id IS NOT NULL;

-- 2b. Dashboard : alertes non résolues d'une company (critique)
--     Remplace la condition "status = 'active'" qui n'existe pas ;
--     le marqueur d'alerte ouverte est resolved_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_alerts_company_status
    ON alerts(company_id, created_at DESC)
    WHERE resolved_at IS NULL;

-- 2c. Tri par sévérité + date (liste d'alertes triées)
CREATE INDEX IF NOT EXISTS idx_alerts_severity_date
    ON alerts(severity, created_at DESC);

-- ============================================================
-- 3. MAINTENANCE_RECORDS
-- ============================================================
-- Déjà existants (créés dans 20250209000010_safe_indexes.sql) :
--   idx_maintenance_vehicle_id   → maintenance_records(vehicle_id)
--   idx_maintenance_vehicle_date → maintenance_records(vehicle_id, service_date DESC)
--   idx_maintenance_status_date  → maintenance_records(status, service_date)
--                                  WHERE status IN ('scheduled','in_progress')
--
-- NOUVEAU : index full sur status (sans filtre WHERE) pour les
-- requêtes qui filtrent sur TERMINEE, ANNULEE, etc.
CREATE INDEX IF NOT EXISTS idx_maint_status
    ON maintenance_records(status);

-- ============================================================
-- 4. DRIVER_DOCUMENTS — pour le cron d'expiration
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_docs_expiry
    ON driver_documents(expiry_date)
    WHERE expiry_date IS NOT NULL;

-- ============================================================
-- 5. TIRE_MOUNTINGS — déjà couverts, inclus pour idempotence
-- ============================================================
-- Créés dans 20260301000000_tire_tracking.sql :
--   idx_tire_mountings_tire    → tire_mountings(tire_id)
--   idx_tire_mountings_vehicle → tire_mountings(vehicle_id)
--   idx_tire_mountings_active  → filtre is_active
--   idx_tire_mountings_company → tire_mountings(company_id)
-- Aucune création supplémentaire nécessaire.

-- ============================================================
-- 6. VÉRIFICATION — à exécuter après pour confirmer Index Scan
-- ============================================================
-- EXPLAIN ANALYZE
--   SELECT * FROM alerts
--   WHERE company_id = '<uuid>' AND resolved_at IS NULL
--   ORDER BY created_at DESC LIMIT 20;
-- → doit afficher "Index Scan using idx_alerts_company_status"
--
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN (
--   'fuel_records','alerts','tire_mountings',
--   'maintenance_records','driver_documents'
-- )
-- ORDER BY tablename, indexname;
