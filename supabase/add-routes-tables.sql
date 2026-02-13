-- Création des tables pour le module Tournées

-- Table des tournées
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    
    total_distance DECIMAL(10, 2), -- km
    estimated_duration INTEGER, -- minutes
    fuel_cost DECIMAL(10, 2),
    
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des arrêts de tournée
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    order_index INTEGER NOT NULL,
    
    time_window_start TIME,
    time_window_end TIME,
    service_duration INTEGER DEFAULT 15, -- minutes
    
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),
    
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES drivers(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, order_index);

-- RLS Policies
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Routes policies
DROP POLICY IF EXISTS "Users can view company routes" ON routes;
DROP POLICY IF EXISTS "Users can modify company routes" ON routes;

CREATE POLICY "Users can view company routes" ON routes
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Users can modify company routes" ON routes
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Route stops policies
DROP POLICY IF EXISTS "Users can view route stops" ON route_stops;
DROP POLICY IF EXISTS "Users can modify route stops" ON route_stops;

CREATE POLICY "Users can view route stops" ON route_stops
    FOR SELECT USING (
        route_id IN (SELECT id FROM routes WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()))
    );

CREATE POLICY "Users can modify route stops" ON route_stops
    FOR ALL USING (
        route_id IN (SELECT id FROM routes WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid()))
    );

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vérification
SELECT 
    'routes table created' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'routes') as routes_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'route_stops') as stops_exists;
