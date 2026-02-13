-- ============================================
-- SCRIPT FINAL CORRIGÉ
-- Gère TOUTES les colonnes manquantes dans users
-- ============================================

-- 1. Créer la table profiles
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

-- 2. Migration ultra-robuste (vérifie chaque colonne)
DO $$
DECLARE
    has_email BOOLEAN := false;
    has_first_name BOOLEAN := false;
    has_last_name BOOLEAN := false;
    has_company_id BOOLEAN := false;
    has_role BOOLEAN := false;
    has_created_at BOOLEAN := false;
    has_updated_at BOOLEAN := false;
    sql_query TEXT;
    v_count INTEGER;
BEGIN
    -- Vérifier si users existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'Table users non trouvée';
        RETURN;
    END IF;
    
    -- Vérifier quelles colonnes existent dans users
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') INTO has_email;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') INTO has_first_name;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') INTO has_last_name;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id') INTO has_company_id;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') INTO has_role;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') INTO has_created_at;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') INTO has_updated_at;
    
    RAISE NOTICE 'Colonnes présentes: email=%, first_name=%, last_name=%, company_id=%, role=%, created_at=%, updated_at=%',
        has_email, has_first_name, has_last_name, has_company_id, has_role, has_created_at, has_updated_at;
    
    -- Construire la requête dynamiquement
    sql_query := '
        INSERT INTO profiles (id, email, first_name, last_name, company_id, role, is_active, created_at, updated_at)
        SELECT 
            u.id,
            ' || CASE WHEN has_email THEN 'COALESCE(u.email, '''')' ELSE '''''' END || ' as email,
            ' || CASE WHEN has_first_name THEN 'COALESCE(u.first_name, '''')' ELSE '''''' END || ' as first_name,
            ' || CASE WHEN has_last_name THEN 'COALESCE(u.last_name, '''')' ELSE '''''' END || ' as last_name,
            ' || CASE WHEN has_company_id THEN 'u.company_id' ELSE 'NULL' END || ' as company_id,
            ' || CASE WHEN has_role 
                THEN 'CASE WHEN u.role = ''admin'' THEN ''ADMIN'' WHEN u.role = ''manager'' THEN ''DIRECTEUR'' ELSE ''AGENT_DE_PARC'' END::VARCHAR(50)'
                ELSE '''AGENT_DE_PARC''' END || ' as role,
            true as is_active,
            ' || CASE WHEN has_created_at THEN 'COALESCE(u.created_at, NOW())' ELSE 'NOW()' END || ' as created_at,
            ' || CASE WHEN has_updated_at THEN 'COALESCE(u.updated_at, NOW())' ELSE 'NOW()' END || ' as updated_at
        FROM users u
        WHERE u.id NOT IN (SELECT id FROM profiles)
        ON CONFLICT (id) DO NOTHING';
    
    -- Exécuter la requête
    EXECUTE sql_query;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '% utilisateurs migrés avec succès', v_count;
END $$;

-- 3. Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer et recréer les policies
DROP POLICY IF EXISTS "Profiles viewable by company" ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin" ON profiles;

CREATE POLICY "Profiles viewable by company" ON profiles
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Profiles modifiable by admin" ON profiles
FOR ALL USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR'))
);

-- 5. Triggers et index
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

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

SELECT 'Migration terminée avec succès!' as status;
