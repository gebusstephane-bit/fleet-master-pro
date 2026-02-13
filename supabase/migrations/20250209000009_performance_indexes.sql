-- ============================================
-- INDEXES DE PERFORMANCE POUR SCALABILITÉ
-- Supporte 1000+ véhicules avec temps de réponse <200ms
-- ============================================

-- ============================================
-- 1. INDEXES VEHICLES (optimisation liste)
-- ============================================

-- Index composite pour filtrage par company + tri par date
-- Utilisé par: useVehiclesInfinite, getVehiclesWithDrivers
CREATE INDEX IF NOT EXISTS idx_vehicles_company_created 
ON vehicles(company_id, created_at DESC);

-- Index pour filtrage par status
-- Utilisé par: filtres de statut (active, maintenance, etc.)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status 
ON vehicles(company_id, status) 
WHERE status IS NOT NULL;

-- Index pour recherche par immatriculation
-- Utilisé par: recherche rapide
CREATE INDEX IF NOT EXISTS idx_vehicles_registration 
ON vehicles(registration_number);

-- Index pour la relation driver (évite seq scan)
CREATE INDEX IF NOT EXISTS idx_vehicles_driver 
ON vehicles(assigned_driver_id) 
WHERE assigned_driver_id IS NOT NULL;

-- ============================================
-- 2. INDEXES MAINTENANCE_RECORDS
-- ============================================

-- Index composite pour liste des maintenances par company + date
-- Utilisé par: getMaintenancesWithVehicles
CREATE INDEX IF NOT EXISTS idx_maintenance_company_date 
ON maintenance_records(company_id, service_date DESC);

-- Index pour filtrage par véhicule + date
-- Utilisé par: timeline des maintenances d'un véhicule
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date 
ON maintenance_records(vehicle_id, service_date DESC);

-- Index pour filtrage par status
-- Utilisé par: dashboard, alertes
CREATE INDEX IF NOT EXISTS idx_maintenance_status_date 
ON maintenance_records(status, service_date) 
WHERE status IN ('scheduled', 'in_progress');

-- ============================================
-- 3. INDEXES INSPECTIONS
-- ============================================

-- Index composite pour liste par company + statut
-- Utilisé par: useInspections, dashboard
CREATE INDEX IF NOT EXISTS idx_inspections_company_status 
ON inspections(company_id, status, created_at DESC);

-- Index pour filtrage par véhicule
-- Utilisé par: fiche véhicule
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle 
ON inspections(vehicle_id, created_at DESC);

-- Index pour filtrage par date
-- Utilisé par: rapports, analytics
CREATE INDEX IF NOT EXISTS idx_inspections_date 
ON inspections(created_at DESC);

-- ============================================
-- 4. INDEXES DRIVERS
-- ============================================

-- Index composite pour liste par company + nom
CREATE INDEX IF NOT EXISTS idx_drivers_company_name 
ON drivers(company_id, last_name, first_name);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_drivers_email 
ON drivers(email);

-- ============================================
-- 5. INDEXES PROFILES
-- ============================================

-- Index pour jointure auth.users
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON profiles(id);

-- Index pour recherche par company
CREATE INDEX IF NOT EXISTS idx_profiles_company 
ON profiles(company_id);

-- ============================================
-- 6. INDEXES POUR FOREIGN KEYS (optimisation joins)
-- ============================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_id ON companies(id);

-- ============================================
-- 7. ANALYZE pour mettre à jour les statistiques
-- ============================================

ANALYZE vehicles;
ANALYZE maintenance_records;
ANALYZE inspections;
ANALYZE drivers;
ANALYZE profiles;

-- ============================================
-- VÉRIFICATION DES INDEXES CRÉÉS
-- ============================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('vehicles', 'maintenance_records', 'inspections', 'drivers', 'profiles')
ORDER BY tablename, indexname;
