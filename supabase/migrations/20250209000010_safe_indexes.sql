-- ============================================
-- INDEXES DE PERFORMANCE (VERSION SÉCURISÉE)
-- Vérifie l'existence des colonnes avant création
-- ============================================

-- Fonction helper pour vérifier si une colonne existe
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
-- 1. INDEXES VEHICLES
-- ============================================

-- Index composite pour filtrage par company + tri par date
CREATE INDEX IF NOT EXISTS idx_vehicles_company_created 
ON vehicles(company_id, created_at DESC);

-- Index pour filtrage par status
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status 
ON vehicles(company_id, status) 
WHERE status IS NOT NULL;

-- Index pour recherche par immatriculation
CREATE INDEX IF NOT EXISTS idx_vehicles_registration 
ON vehicles(registration_number);

-- Index pour la relation driver
DO $$
BEGIN
    IF column_exists('vehicles', 'assigned_driver_id') THEN
        CREATE INDEX IF NOT EXISTS idx_vehicles_driver 
        ON vehicles(assigned_driver_id) 
        WHERE assigned_driver_id IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- 2. INDEXES MAINTENANCE_RECORDS
-- ============================================

DO $$
BEGIN
    -- Vérifier quelles colonnes existent
    IF column_exists('maintenance_records', 'company_id') AND column_exists('maintenance_records', 'service_date') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_company_date 
        ON maintenance_records(company_id, service_date DESC);
    END IF;
    
    IF column_exists('maintenance_records', 'vehicle_id') AND column_exists('maintenance_records', 'service_date') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date 
        ON maintenance_records(vehicle_id, service_date DESC);
    END IF;
    
    IF column_exists('maintenance_records', 'status') AND column_exists('maintenance_records', 'service_date') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_status_date 
        ON maintenance_records(status, service_date) 
        WHERE status IN ('scheduled', 'in_progress');
    END IF;
    
    -- Index simple si service_date n'existe pas
    IF NOT column_exists('maintenance_records', 'service_date') AND column_exists('maintenance_records', 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_created 
        ON maintenance_records(vehicle_id, created_at DESC);
    END IF;
END $$;

-- Index de base sur vehicle_id
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);

-- ============================================
-- 3. INDEXES INSPECTIONS
-- ============================================

DO $$
BEGIN
    IF column_exists('inspections', 'company_id') AND column_exists('inspections', 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_inspections_company_status 
        ON inspections(company_id, status, created_at DESC);
    END IF;
    
    IF column_exists('inspections', 'vehicle_id') THEN
        CREATE INDEX IF NOT EXISTS idx_inspections_vehicle 
        ON inspections(vehicle_id, created_at DESC);
    END IF;
END $$;

-- Index sur created_at
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(created_at DESC);

-- ============================================
-- 4. INDEXES DRIVERS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_drivers_company_name 
ON drivers(company_id, last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_drivers_email 
ON drivers(email);

-- ============================================
-- 5. INDEXES PROFILES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- ============================================
-- 6. ANALYZE
-- ============================================

ANALYZE vehicles;
ANALYZE maintenance_records;
ANALYZE inspections;
ANALYZE drivers;
ANALYZE profiles;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('vehicles', 'maintenance_records', 'inspections', 'drivers', 'profiles')
ORDER BY tablename, indexname;
