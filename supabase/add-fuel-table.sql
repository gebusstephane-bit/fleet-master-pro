-- ============================================
-- AJOUT TABLE FUEL_RECORDS (Pleins carburant)
-- ============================================

CREATE TABLE IF NOT EXISTS fuel_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity_liters DECIMAL(10, 2) NOT NULL,
    price_total DECIMAL(10, 2) NOT NULL,
    price_per_liter DECIMAL(10, 3),
    
    mileage_at_fill INTEGER NOT NULL,
    consumption_l_per_100km DECIMAL(5, 2),
    
    fuel_type VARCHAR(50) CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid', 'lpg')),
    station_name VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_driver_id ON fuel_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(date);

-- RLS
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view vehicle fuel" ON fuel_records;
DROP POLICY IF EXISTS "Users can modify vehicle fuel" ON fuel_records;

-- Recréer les policies
CREATE POLICY "Users can view vehicle fuel" ON fuel_records
    FOR SELECT USING (
        vehicle_id IN (
            SELECT id FROM vehicles 
            WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        )
    );

CREATE POLICY "Users can modify vehicle fuel" ON fuel_records
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM vehicles 
            WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        )
    );

-- Vérification
SELECT 'fuel_records créée' as status, COUNT(*) as count FROM fuel_records;
