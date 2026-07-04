-- ============================================
-- INDEX COMPOSITES DE PERFORMANCE (audit 2026-07-04)
-- Purement additif — aucune suppression, aucun changement de données.
-- Corrige le décalage entre les index historiques (construits sur
-- service_date, colonne non utilisée par les requêtes) et les colonnes
-- réellement filtrées/triées par l'application.
-- ============================================

-- Helper (idempotent, déjà présent via 20250209000010_safe_indexes.sql)
CREATE OR REPLACE FUNCTION column_exists(p_table text, p_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. MAINTENANCE_RECORDS
-- Requêtes réelles : filtre company_id + tri requested_at DESC
-- (use-maintenance.ts), tri rdv_date (alertes), filtre status (compteurs)
-- ============================================

DO $$
BEGIN
    IF column_exists('maintenance_records', 'company_id') AND column_exists('maintenance_records', 'requested_at') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_company_requested
        ON maintenance_records(company_id, requested_at DESC);
    END IF;

    IF column_exists('maintenance_records', 'company_id') AND column_exists('maintenance_records', 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_company_status
        ON maintenance_records(company_id, status);
    END IF;

    IF column_exists('maintenance_records', 'company_id') AND column_exists('maintenance_records', 'rdv_date') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_company_rdv
        ON maintenance_records(company_id, rdv_date)
        WHERE rdv_date IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- 2. FUEL_RECORDS
-- Requêtes réelles : filtre company_id + filtre/tri date
-- (getAllFuelRecords, getFuelStats — seuls des index mono-colonne existaient)
-- ============================================

DO $$
BEGIN
    IF column_exists('fuel_records', 'company_id') AND column_exists('fuel_records', 'date') THEN
        CREATE INDEX IF NOT EXISTS idx_fuel_company_date
        ON fuel_records(company_id, date DESC);
    END IF;
END $$;

-- ============================================
-- 3. DRIVERS
-- Requêtes réelles : filtre company_id + tri created_at DESC
-- (use-compliance.ts, dashboard)
-- ============================================

DO $$
BEGIN
    IF column_exists('drivers', 'company_id') AND column_exists('drivers', 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_drivers_company_created
        ON drivers(company_id, created_at DESC);
    END IF;
END $$;

-- ============================================
-- 4. ROUTES
-- Requête réelle : filtre route_date >= today, interrogée à chaque
-- chargement des stats dashboard (table absente des migrations →
-- garde d'existence complète)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routes')
       AND column_exists('routes', 'company_id')
       AND column_exists('routes', 'route_date') THEN
        CREATE INDEX IF NOT EXISTS idx_routes_company_date
        ON routes(company_id, route_date);
    END IF;
END $$;

-- NOTE : ai_predictions volontairement exclu — la table n'a pas de colonne
-- company_id (le scoping passe par jointure vehicles dans les policies RLS).
