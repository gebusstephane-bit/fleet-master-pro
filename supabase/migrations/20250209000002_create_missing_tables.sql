-- ============================================
-- CRÉATION DES TABLES MANQUANTES
-- À exécuter AVANT la migration de sécurité
-- ============================================

-- ============================================
-- 1. TABLE PROFILES (utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'AGENT_DE_PARC' CHECK (role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT')),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLE MAINTENANCE_RECORDS (entretiens)
-- ============================================
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

-- ============================================
-- 3. TABLE INSPECTIONS
-- ============================================
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

-- ============================================
-- 4. INDEXES POUR PERFORMANCES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);

CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- ============================================
-- 5. TRIGGER POUR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON maintenance_records;
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. MIGRER LES DONNÉES EXISTANTES
-- ============================================

-- Migrer users vers profiles (si table users existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        INSERT INTO profiles (id, email, first_name, last_name, company_id, role, is_active, created_at, updated_at)
        SELECT 
            id, 
            COALESCE(email, ''), 
            COALESCE(first_name, ''), 
            COALESCE(last_name, ''), 
            company_id,
            CASE 
                WHEN role = 'admin' THEN 'ADMIN'
                WHEN role = 'manager' THEN 'DIRECTEUR'
                ELSE 'AGENT_DE_PARC'
            END::VARCHAR(50),
            COALESCE(is_active, true),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM users
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migration users → profiles terminée';
    END IF;
END $$;

-- Mettre à jour company_id dans maintenance_records
UPDATE maintenance_records mr
SET company_id = v.company_id
FROM vehicles v
WHERE mr.vehicle_id = v.id AND mr.company_id IS NULL;

-- Mettre à jour company_id dans inspections
UPDATE inspections i
SET company_id = v.company_id
FROM vehicles v
WHERE i.vehicle_id = v.id AND i.company_id IS NULL;

-- ============================================
-- 8. CRÉER LES POLICIES RLS
-- ============================================

-- Profiles: Lecture
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
CREATE POLICY "Profiles viewable by company" ON profiles
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
);

-- Profiles: Modification
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
CREATE POLICY "Profiles modifiable by admin" ON profiles
FOR ALL USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR'))
);

-- Maintenance: Lecture
DROP POLICY IF EXISTS "Maintenance viewable by company" ON maintenance_records;
CREATE POLICY "Maintenance viewable by company" ON maintenance_records
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Maintenance: Modification
DROP POLICY IF EXISTS "Maintenance modifiable by company" ON maintenance_records;
CREATE POLICY "Maintenance modifiable by company" ON maintenance_records
FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Inspections: Lecture
DROP POLICY IF EXISTS "Inspections viewable by company" ON inspections;
CREATE POLICY "Inspections viewable by company" ON inspections
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Inspections: Modification
DROP POLICY IF EXISTS "Inspections modifiable by company" ON inspections;
CREATE POLICY "Inspections modifiable by company" ON inspections
FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 'Tables créées avec succès' as status;
