-- ============================================
-- CRÉATION MAINTENANCE & INSPECTIONS (CORRIGÉ)
-- ============================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
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

CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    inspection_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    defects JSONB DEFAULT '[]',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. RLS
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES (supprimer d'abord si existent)
DROP POLICY IF EXISTS "Maintenance viewable by company" ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance modifiable by company" ON maintenance_records;
DROP POLICY IF EXISTS "Inspections viewable by company" ON inspections;
DROP POLICY IF EXISTS "Inspections modifiable by company" ON inspections;

CREATE POLICY "Maintenance viewable by company" ON maintenance_records
FOR SELECT USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Maintenance modifiable by company" ON maintenance_records
FOR ALL USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Inspections viewable by company" ON inspections
FOR SELECT USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Inspections modifiable by company" ON inspections
FOR ALL USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);

-- 5. TRIGGERS (supprimer d'abord si existent)
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON maintenance_records;
DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'OK - Tables et RLS créés!' as status;
