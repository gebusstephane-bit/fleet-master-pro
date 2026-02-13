-- Table fuel_records
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
    fuel_type VARCHAR(50),
    station_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(date);

-- Enable RLS
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

SELECT 'fuel_records OK' as status;
