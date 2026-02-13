-- =====================================================
-- TABLE PREFERENCES D'APPARENCE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Thème
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  primary_color TEXT DEFAULT '#3b82f6',
  custom_color TEXT,
  
  -- Densité
  density TEXT DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'spacious')),
  
  -- Typographie
  font TEXT DEFAULT 'inter' CHECK (font IN ('inter', 'roboto', 'poppins')),
  font_size INTEGER DEFAULT 14 CHECK (font_size >= 12 AND font_size <= 18),
  
  -- Format régional
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'es', 'de')),
  date_format TEXT DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY')),
  time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  timezone TEXT DEFAULT 'Europe/Paris',
  
  -- Sidebar
  sidebar_style TEXT DEFAULT 'default' CHECK (sidebar_style IN ('default', 'floating', 'compact')),
  sidebar_auto_collapse BOOLEAN DEFAULT true,
  sidebar_icons_only BOOLEAN DEFAULT false,
  
  -- Animations
  reduce_motion BOOLEAN DEFAULT false,
  glass_effects BOOLEAN DEFAULT true,
  shadows BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_appearance_settings_user ON user_appearance_settings(user_id);

-- Politiques RLS
ALTER TABLE user_appearance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appearance_settings_select ON user_appearance_settings;
CREATE POLICY appearance_settings_select ON user_appearance_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS appearance_settings_insert ON user_appearance_settings;
CREATE POLICY appearance_settings_insert ON user_appearance_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS appearance_settings_update ON user_appearance_settings;
CREATE POLICY appearance_settings_update ON user_appearance_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_appearance_settings_updated_at ON user_appearance_settings;
CREATE TRIGGER update_appearance_settings_updated_at
  BEFORE UPDATE ON user_appearance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer les paramètres par défaut
CREATE OR REPLACE FUNCTION create_default_appearance_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_appearance_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les paramètres
DROP TRIGGER IF EXISTS create_appearance_settings_on_profile ON profiles;
CREATE TRIGGER create_appearance_settings_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_appearance_settings();

SELECT 'Table user_appearance_settings créée' as status;
