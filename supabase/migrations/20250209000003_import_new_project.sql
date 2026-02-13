-- ============================================
-- SCRIPT POUR IMPORT DANS UN NOUVEAU PROJET
-- Gère les colonnes manquantes dans la table users source
-- ============================================

-- ============================================
-- 1. CRÉER LA TABLE PROFILES (avec toutes les colonnes)
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
-- 2. CRÉER LA TABLE MAINTENANCE_RECORDS
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
-- 3. CRÉER LA TABLE INSPECTIONS
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
-- 4. ACTIVER RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. MIGRATION USERS → PROFILES (VERSION ROBUSTE)
-- ============================================
DO $$
DECLARE
    col_email TEXT;
    col_first_name TEXT;
    col_last_name TEXT;
    col_company_id TEXT;
    col_role TEXT;
    col_is_active TEXT;
    col_created_at TEXT;
    col_updated_at TEXT;
BEGIN
    -- Vérifier si la table users existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'Table users non trouvée, migration ignorée';
        RETURN;
    END IF;
    
    -- Vérifier les colonnes disponibles dans users
    SELECT column_name INTO col_email FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email';
    SELECT column_name INTO col_first_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name';
    SELECT column_name INTO col_last_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name';
    SELECT column_name INTO col_company_id FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id';
    SELECT column_name INTO col_role FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role';
    SELECT column_name INTO col_is_active FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active';
    SELECT column_name INTO col_created_at FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at';
    SELECT column_name INTO col_updated_at FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at';
    
    RAISE NOTICE 'Colonnes trouvées: email=%, first_name=%, last_name=%, company_id=%, role=%, is_active=%, created_at=%, updated_at=%',
        col_email, col_first_name, col_last_name, col_company_id, col_role, col_is_active, col_created_at, col_updated_at;
    
    -- Insertion avec COALESCE pour gérer les colonnes manquantes
    EXECUTE format('
        INSERT INTO profiles (id, email, first_name, last_name, company_id, role, is_active, created_at, updated_at)
        SELECT 
            id,
            COALESCE(%I, '''') as email,
            COALESCE(%I, '''') as first_name,
            COALESCE(%I, '''') as last_name,
            %I as company_id,
            CASE 
                WHEN %I = ''admin'' THEN ''ADMIN''
                WHEN %I = ''manager'' THEN ''DIRECTEUR''
                ELSE ''AGENT_DE_PARC''
            END::VARCHAR(50) as role,
            COALESCE(%I, true) as is_active,
            COALESCE(%I, NOW()) as created_at,
            COALESCE(%I, NOW()) as updated_at
        FROM users
        ON CONFLICT (id) DO NOTHING',
        COALESCE(col_email, 'email'),
        COALESCE(col_first_name, 'first_name'),
        COALESCE(col_last_name, 'last_name'),
        COALESCE(col_company_id, 'company_id'),
        COALESCE(col_role, 'role'),
        COALESCE(col_role, 'role'),
        COALESCE(col_is_active, 'true'),
        COALESCE(col_created_at, 'NOW()'),
        COALESCE(col_updated_at, 'NOW()')
    );
    
    RAISE NOTICE 'Migration users → profiles terminée';
END $$;

-- ============================================
-- 6. MIGRER LES DONNÉES DE COMPANY_ID
-- ============================================

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
-- 7. CRÉER LES POLICIES RLS
-- ============================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
DROP POLICY IF EXISTS "Maintenance viewable by company" ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance modifiable by company" ON maintenance_records;
DROP POLICY IF EXISTS "Inspections viewable by company" ON inspections;
DROP POLICY IF EXISTS "Inspections modifiable by company" ON inspections;

-- Profiles: Lecture
CREATE POLICY "Profiles viewable by company" ON profiles
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
);

-- Profiles: Modification
CREATE POLICY "Profiles modifiable by admin" ON profiles
FOR ALL USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR'))
);

-- Maintenance: Lecture
CREATE POLICY "Maintenance viewable by company" ON maintenance_records
FOR SELECT USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Maintenance: Modification
CREATE POLICY "Maintenance modifiable by company" ON maintenance_records
FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Inspections: Lecture
CREATE POLICY "Inspections viewable by company" ON inspections
FOR SELECT USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Inspections: Modification
CREATE POLICY "Inspections modifiable by company" ON inspections
FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- ============================================
-- 8. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- ============================================
-- 9. TRIGGERS updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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
-- VÉRIFICATION
-- ============================================
SELECT 'Import terminé avec succès!' as status;
