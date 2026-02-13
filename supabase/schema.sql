-- ============================================
-- FleetMaster Pro - Schéma Complet SQL
-- ============================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLE COMPANIES (Entreprises)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    siret VARCHAR(14) UNIQUE,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'France',
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLE USERS (utilise auth.users de Supabase)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABLE DRIVERS (Chauffeurs) - Créé d'abord pour éviter la dépendance circulaire
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Informations personnelles
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Adresse
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Permis de conduire
    license_number VARCHAR(50) NOT NULL,
    license_type VARCHAR(20) DEFAULT 'B',
    license_expiry DATE NOT NULL,
    
    -- Employé
    hire_date DATE,
    termination_date DATE,
    
    -- Performance
    safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
    total_distance INTEGER DEFAULT 0,
    
    -- Statut
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. TABLE VEHICLES (Véhicules)
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Informations générales
    registration_number VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
    type VARCHAR(50) NOT NULL CHECK (type IN ('truck', 'van', 'car', 'motorcycle', 'trailer')),
    color VARCHAR(50) NOT NULL,
    vin VARCHAR(50),
    
    -- Caractéristiques techniques
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid', 'lpg')),
    mileage INTEGER NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    
    -- Statut
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
    
    -- Dates importantes
    insurance_expiry DATE,
    technical_control_expiry DATE,
    next_maintenance_date DATE,
    last_maintenance_date DATE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique par entreprise
    UNIQUE(company_id, registration_number)
);

-- Ajouter la colonne vehicle_id et sa contrainte FK (après création de vehicles)
ALTER TABLE drivers 
DROP COLUMN IF EXISTS vehicle_id;

ALTER TABLE drivers 
ADD COLUMN vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

-- ============================================
-- 5. TABLE MAINTENANCE_RECORDS (Entretiens)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 6. TABLE ROUTES (Trajets)
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 7. TABLE ALERTS (Alertes)
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- INDEXES POUR PERFORMANCES
-- ============================================

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);

-- Drivers
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);

-- Maintenance
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(service_date);

-- Routes
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);

-- ============================================
-- FONCTION TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger à toutes les tables (drop si existe puis recreate)
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Users can view company users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view company vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can modify company vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view company drivers" ON drivers;
DROP POLICY IF EXISTS "Users can modify company drivers" ON drivers;
DROP POLICY IF EXISTS "Users can view vehicle maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Users can modify vehicle maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Users can view company routes" ON routes;
DROP POLICY IF EXISTS "Users can modify company routes" ON routes;
DROP POLICY IF EXISTS "Users can view company alerts" ON alerts;
DROP POLICY IF EXISTS "Users can modify company alerts" ON alerts;

-- Policy: Les users peuvent voir leur propre entreprise
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        OR id IN (SELECT company_id FROM users WHERE auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
    );

-- Policy: Les users peuvent voir les users de leur entreprise
CREATE POLICY "Users can view company users" ON users
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Les users peuvent modifier leur profil
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Policy: Véhicules - lecture par entreprise
CREATE POLICY "Users can view company vehicles" ON vehicles
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Véhicules - modification par entreprise
CREATE POLICY "Users can modify company vehicles" ON vehicles
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Chauffeurs - lecture par entreprise
CREATE POLICY "Users can view company drivers" ON drivers
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Chauffeurs - modification par entreprise
CREATE POLICY "Users can modify company drivers" ON drivers
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Maintenance - accès par véhicule de l'entreprise
CREATE POLICY "Users can view vehicle maintenance" ON maintenance_records
    FOR SELECT USING (
        vehicle_id IN (
            SELECT id FROM vehicles 
            WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        )
    );

CREATE POLICY "Users can modify vehicle maintenance" ON maintenance_records
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM vehicles 
            WHERE company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        )
    );

-- Policy: Routes - accès par entreprise
CREATE POLICY "Users can view company routes" ON routes
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

CREATE POLICY "Users can modify company routes" ON routes
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- Policy: Alertes - accès par entreprise
CREATE POLICY "Users can view company alerts" ON alerts
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

CREATE POLICY "Users can modify company alerts" ON alerts
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- ============================================
-- DONNÉES DE TEST (Optionnel)
-- ============================================

-- Créer une entreprise de test
INSERT INTO companies (name, siret, address, city, postal_code, email)
VALUES (
    'Transport Dupont SA',
    '12345678900012',
    '15 rue de la Logistique',
    'Lyon',
    '69000',
    'contact@transport-dupont.fr'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
