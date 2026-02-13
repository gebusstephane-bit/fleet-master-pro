-- ============================================
-- MIGRATION DE SÉCURITÉ CRITIQUE
-- Correction des RLS manquantes et migration users → profiles
-- ============================================

-- ============================================
-- PARTIE 1: Migration users → profiles (FINALISATION)
-- ============================================

-- Vérifier si la table profiles existe, sinon la créer
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

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Migrer les données de users vers profiles (si users existe encore)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        INSERT INTO profiles (id, email, first_name, last_name, company_id, role, is_active, created_at, updated_at)
        SELECT 
            id, 
            COALESCE(email, '') as email, 
            COALESCE(first_name, '') as first_name, 
            COALESCE(last_name, '') as last_name, 
            company_id,
            CASE 
                WHEN role = 'admin' THEN 'ADMIN'
                WHEN role = 'manager' THEN 'DIRECTEUR'
                ELSE 'AGENT_DE_PARC'
            END::VARCHAR(50),
            true as is_active,  -- Valeur par défaut car colonne peut être absente
            COALESCE(created_at, NOW()) as created_at,
            COALESCE(updated_at, NOW()) as updated_at
        FROM users
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migration users → profiles terminée';
    END IF;
END $$;

-- ============================================
-- PARTIE 2: RLS pour profiles
-- ============================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Policy: Lecture des profils de sa company
CREATE POLICY "Profiles viewable by company"
ON profiles FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- Policy: Modification par admin ou soi-même (limité)
CREATE POLICY "Profiles modifiable by admin or self"
ON profiles FOR UPDATE
USING (
    id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR')
    )
)
WITH CHECK (
    id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR')
    )
);

-- Policy: Création par admin uniquement
CREATE POLICY "Profiles insertable by admin"
ON profiles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR')
    )
);

-- Policy: Suppression par admin uniquement
CREATE POLICY "Profiles deletable by admin"
ON profiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- ============================================
-- PARTIE 3: RLS pour maintenance_records (CORRECTION CRITIQUE)
-- ============================================

-- Activer RLS si pas déjà fait
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Users can view vehicle maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Users can modify vehicle maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance viewable by company" ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance modifiable by company" ON maintenance_records;

-- Ajouter company_id à maintenance_records si manquant (hors du bloc DO pour erreur explicite)
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Mettre à jour les enregistrements existants (si des données existent)
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE maintenance_records mr
    SET company_id = v.company_id
    FROM vehicles v
    WHERE mr.vehicle_id = v.id 
    AND mr.company_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Mise à jour de % enregistrements maintenance_records', updated_count;
    END IF;
END $$;

-- Policy: Vue par company_id (via vehicle ou direct)
CREATE POLICY "Maintenance viewable by company"
ON maintenance_records FOR SELECT
USING (
    -- Vérifier via company_id si défini
    (company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ))
    OR
    -- Sinon vérifier via la table vehicles
    (vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    ))
);

-- Policy: Modification par company_id (via vehicle ou direct)
CREATE POLICY "Maintenance modifiable by company"
ON maintenance_records FOR ALL
USING (
    (company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ))
    OR
    (vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    ))
)
WITH CHECK (
    company_id IS NULL OR company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- PARTIE 4: RLS pour inspections (CORRECTION CRITIQUE)
-- ============================================

-- Créer la table inspections si elle n'existe pas
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

-- Ajouter company_id si manquant (pour table existante)
ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Migrer les données existantes si besoin
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE inspections i
    SET company_id = v.company_id
    FROM vehicles v
    WHERE i.vehicle_id = v.id 
    AND i.company_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Mise à jour de % enregistrements inspections', updated_count;
    END IF;
END $$;

-- Activer RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Inspections viewable by company" ON inspections;
DROP POLICY IF EXISTS "Inspections modifiable by company" ON inspections;

-- Policy: Vue par company_id (gère aussi company_id NULL temporairement)
CREATE POLICY "Inspections viewable by company"
ON inspections FOR SELECT
USING (
    (company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ))
    OR
    (vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    ))
);

-- Policy: Modification par company_id
CREATE POLICY "Inspections modifiable by company"
ON inspections FOR ALL
USING (
    (company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ))
    OR
    (vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    ))
)
WITH CHECK (
    company_id IS NULL OR company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- PARTIE 5: Index pour performance
-- ============================================

-- Index sur maintenance_records
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_service_date ON maintenance_records(service_date);

-- Index sur inspections
CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at);

-- Index sur profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- PARTIE 6: Triggers pour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour inspections
DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTIE 7: Cleanup (optionnel - à exécuter manuellement après vérification)
-- ============================================

-- COMMENTER CETTE PARTIE jusqu'à validation complète
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier les RLS activées
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'maintenance_records', 'inspections', 'vehicles', 'drivers', 'companies')
ORDER BY tablename;
