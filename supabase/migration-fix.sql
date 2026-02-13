-- ============================================
-- MIGRATION : Correction du schéma existant
-- À exécuter si les tables existent déjà
-- ============================================

-- ============================================
-- 1. AJOUTER LES COLONNES MANQUANTES
-- ============================================

-- Ajouter driver_id à vehicles (s'il n'existe pas)
ALTER TABLE vehicles 
DROP COLUMN IF EXISTS driver_id;

ALTER TABLE vehicles 
ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Ajouter vehicle_id à drivers (s'il n'existe pas)
ALTER TABLE drivers 
DROP COLUMN IF EXISTS vehicle_id;

ALTER TABLE drivers 
ADD COLUMN vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

-- Ajouter les colonnes manquantes à vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'Non spécifié',
ADD COLUMN IF NOT EXISTS technical_control_expiry DATE,
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ajouter les colonnes manquantes à drivers
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS total_distance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 2. CRÉER LES TABLES MANQUANTES
-- ============================================

-- Table maintenance_records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('routine', 'repair', 'inspection', 'tire_change', 'oil_change')),
    description TEXT NOT NULL,
    cost DECIMAL(10, 2),
    mileage_at_service INTEGER,
    performed_by VARCHAR(255),
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_service_date DATE,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table routes
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(10, 2),
    estimated_duration_minutes INTEGER,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('maintenance', 'insurance', 'license', 'vehicle_issue', 'safety')),
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);

-- ============================================
-- 4. TRIGGERS updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON maintenance_records;
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Vehicles
DROP POLICY IF EXISTS "Users can view company vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can modify company vehicles" ON vehicles;
CREATE POLICY "Users can view company vehicles" ON vehicles
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can modify company vehicles" ON vehicles
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Drivers
DROP POLICY IF EXISTS "Users can view company drivers" ON drivers;
DROP POLICY IF EXISTS "Users can modify company drivers" ON drivers;
CREATE POLICY "Users can view company drivers" ON drivers
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can modify company drivers" ON drivers
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Maintenance
DROP POLICY IF EXISTS "Users can view vehicle maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Users can modify vehicle maintenance" ON maintenance_records;
CREATE POLICY "Users can view vehicle maintenance" ON maintenance_records
    FOR SELECT USING (vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())));
CREATE POLICY "Users can modify vehicle maintenance" ON maintenance_records
    FOR ALL USING (vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())));

-- Routes
DROP POLICY IF EXISTS "Users can view company routes" ON routes;
DROP POLICY IF EXISTS "Users can modify company routes" ON routes;
CREATE POLICY "Users can view company routes" ON routes
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can modify company routes" ON routes
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Alerts
DROP POLICY IF EXISTS "Users can view company alerts" ON alerts;
DROP POLICY IF EXISTS "Users can modify company alerts" ON alerts;
CREATE POLICY "Users can view company alerts" ON alerts
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can modify company alerts" ON alerts
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- ============================================
-- 6. VÉRIFICATION
-- ============================================
SELECT 
  'vehicles' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vehicles') as column_count
FROM vehicles
UNION ALL
SELECT 
  'drivers' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'drivers') as column_count
FROM drivers
UNION ALL
SELECT 
  'maintenance_records' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'maintenance_records') as column_count
FROM maintenance_records
UNION ALL
SELECT 
  'routes' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'routes') as column_count
FROM routes
UNION ALL
SELECT 
  'alerts' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'alerts') as column_count
FROM alerts;
