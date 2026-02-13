-- =====================================================
-- MODULE GESTION UTILISATEURS - SCHEMA COMPLET
-- =====================================================

-- =====================================================
-- 1. Mise à jour table profiles
-- =====================================================
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'EXPLOITANT',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Contrainte CHECK pour les rôles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_user_role;

ALTER TABLE profiles 
  ADD CONSTRAINT check_user_role 
  CHECK (role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'));

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON profiles(company_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =====================================================
-- 2. Table préférences de notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Types d'alertes
  alert_maintenance BOOLEAN DEFAULT true,
  alert_inspection BOOLEAN DEFAULT true,
  alert_routes BOOLEAN DEFAULT true,
  alert_documents_expiry BOOLEAN DEFAULT true,
  alert_fuel BOOLEAN DEFAULT false,
  alert_critical_only BOOLEAN DEFAULT false,
  
  -- Canaux
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON user_notification_preferences(user_id);

-- =====================================================
-- 3. Table historique des connexions
-- =====================================================
CREATE TABLE IF NOT EXISTS user_login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  success BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON user_login_history(login_at DESC);

-- =====================================================
-- 4. Table invitations (pour suivi)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'EXPLOITANT',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);

-- =====================================================
-- 5. Fonction pour mettre à jour updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger sur profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur user_notification_preferences
DROP TRIGGER IF EXISTS update_notif_prefs_updated_at ON user_notification_preferences;
CREATE TRIGGER update_notif_prefs_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Politiques RLS pour user_notification_preferences
-- =====================================================
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notif_prefs_select ON user_notification_preferences;
CREATE POLICY user_notif_prefs_select ON user_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_notif_prefs_insert ON user_notification_preferences;
CREATE POLICY user_notif_prefs_insert ON user_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_notif_prefs_update ON user_notification_preferences;
CREATE POLICY user_notif_prefs_update ON user_notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 7. Politiques RLS pour user_login_history
-- =====================================================
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_login_history_select ON user_login_history;
CREATE POLICY user_login_history_select ON user_login_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_login_history_insert ON user_login_history;
CREATE POLICY user_login_history_insert ON user_login_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. Politiques RLS pour user_invitations
-- =====================================================
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_invitations_select ON user_invitations;
CREATE POLICY user_invitations_select ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND company_id = user_invitations.company_id
      AND role IN ('ADMIN', 'DIRECTEUR')
    )
  );

DROP POLICY IF EXISTS user_invitations_insert ON user_invitations;
CREATE POLICY user_invitations_insert ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND company_id = user_invitations.company_id
      AND role IN ('ADMIN', 'DIRECTEUR')
    )
  );

-- =====================================================
-- 9. Vue pour liste utilisateurs avec stats
-- =====================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id,
  p.company_id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.last_login,
  c.name as company_name,
  (
    SELECT COUNT(*) 
    FROM vehicle_inspections vi 
    WHERE vi.created_by = p.id
  ) as inspections_count,
  (
    SELECT COUNT(*) 
    FROM maintenance_records mr 
    WHERE mr.created_by = p.id
  ) as maintenances_count
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id;

-- =====================================================
-- 10. Vérifications finales
-- =====================================================
SELECT 'Table profiles - colonnes:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT 'Tables créées:' as info;
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_notification_preferences', 'user_login_history', 'user_invitations');
