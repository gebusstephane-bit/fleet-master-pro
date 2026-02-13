-- ============================================
-- CORRECTION MIGRATION PROFILES (pour projet existant)
-- Gère les colonnes manquantes dans la table users
-- ============================================

-- 1. Vérifier et créer la table profiles si elle n'existe pas
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL DEFAULT '',
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'AGENT_DE_PARC' CHECK (role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT')),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Migration robuste de users vers profiles
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier si la table users existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'Table users non trouvée';
        RETURN;
    END IF;
    
    -- Compter les utilisateurs à migrer
    SELECT COUNT(*) INTO v_count FROM users WHERE id NOT IN (SELECT id FROM profiles);
    RAISE NOTICE 'Migration de % utilisateurs...', v_count;
    
    -- Insérer avec des valeurs par défaut pour les colonnes manquantes
    INSERT INTO profiles (id, email, first_name, last_name, company_id, role, is_active, created_at, updated_at)
    SELECT 
        u.id,
        COALESCE(u.email, '') as email,
        COALESCE(u.first_name, '') as first_name,
        COALESCE(u.last_name, '') as last_name,
        u.company_id,
        CASE 
            WHEN u.role = 'admin' THEN 'ADMIN'
            WHEN u.role = 'manager' THEN 'DIRECTEUR'
            ELSE 'AGENT_DE_PARC'
        END::VARCHAR(50) as role,
        true as is_active,  -- Valeur par défaut
        COALESCE(u.created_at, NOW()) as created_at,
        COALESCE(u.updated_at, NOW()) as updated_at
    FROM users u
    WHERE u.id NOT IN (SELECT id FROM profiles)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '% utilisateurs migrés avec succès', v_count;
END $$;

-- 4. Supprimer les anciennes policies et créer les nouvelles
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin or self" ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by admin" ON profiles;
DROP POLICY IF EXISTS "Profiles deletable by admin" ON profiles;

CREATE POLICY "Profiles viewable by company" ON profiles
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Profiles modifiable by admin or self" ON profiles
FOR UPDATE USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR'))
);

CREATE POLICY "Profiles insertable by admin" ON profiles
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR'))
);

-- 5. Trigger updated_at
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

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

SELECT 'Migration profiles corrigée!' as status;
