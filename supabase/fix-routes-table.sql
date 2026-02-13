-- Fix routes table: rename date column to route_date
-- Option 1: If table already exists with 'date' column
ALTER TABLE IF EXISTS routes RENAME COLUMN date TO route_date;

-- Option 2: If tables don't exist yet, create them fresh
-- Uncomment below and comment out above if creating new

/*
DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    route_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned',
    total_distance DECIMAL(10,2),
    estimated_duration INTEGER,
    fuel_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    order_index INTEGER NOT NULL,
    time_window_start TIME,
    time_window_end TIME,
    service_duration INTEGER DEFAULT 15,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Policies for routes
CREATE POLICY "routes_company_isolation" ON routes
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Policies for route_stops
CREATE POLICY "route_stops_company_isolation" ON route_stops
    FOR ALL USING (route_id IN (
        SELECT id FROM routes WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

-- Indexes
CREATE INDEX idx_routes_company ON routes(company_id);
CREATE INDEX idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX idx_routes_driver ON routes(driver_id);
CREATE INDEX idx_routes_date ON routes(route_date);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
*/
