-- ============================================
-- SOS GARAGE MODULE - Migration
-- Crée les tables pour le système d'assistance panne
-- ============================================

-- Table: Garages partenaires de l'utilisateur
CREATE TABLE IF NOT EXISTS user_service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Coordonnées
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  
  -- Géolocalisation (auto-généré depuis l'adresse)
  lat FLOAT,
  lng FLOAT,
  
  -- Capacités
  vehicle_types_supported TEXT[] DEFAULT '{}', -- ['PL', 'VL']
  specialties TEXT[] DEFAULT '{}', -- ['24_7', 'FRIGO_CARRIER', 'MOTEUR', 'PNEU', 'ELECTRIQUE', 'CARROSSERIE']
  max_tonnage INTEGER, -- Pour les camions lourds
  
  -- Paramètres d'intervention
  intervention_radius_km INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- 0-10, influence le classement IA
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_location ON user_service_providers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_user_providers_active ON user_service_providers(user_id, is_active);

-- Table: Historique des recherches d'urgence
CREATE TABLE IF NOT EXISTS emergency_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Véhicule concerné
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_registration TEXT, -- Backup si véhicule supprimé
  vehicle_type TEXT,
  
  -- Localisation de la panne
  breakdown_location_lat FLOAT,
  breakdown_location_lng FLOAT,
  breakdown_address TEXT,
  breakdown_type TEXT, -- 'MOTEUR', 'FRIGO_CARRIER', 'PNEU', etc.
  
  -- Résultats IA
  recommended_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  alternative_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  backup_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  ai_reasoning TEXT,
  
  -- Métriques
  distance_km FLOAT,
  estimated_time_minutes INTEGER,
  
  -- Statut
  status TEXT DEFAULT 'completed', -- 'completed', 'contacted', 'resolved', 'cancelled'
  
  -- Timeline
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contacted_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_emergency_searches_user ON emergency_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_vehicle ON emergency_searches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_date ON emergency_searches(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_providers_updated_at ON user_service_providers;
CREATE TRIGGER update_user_providers_updated_at
  BEFORE UPDATE ON user_service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies

-- Activer RLS
ALTER TABLE user_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_searches ENABLE ROW LEVEL SECURITY;

-- Policies pour user_service_providers
DROP POLICY IF EXISTS "Users can view their own providers" ON user_service_providers;
CREATE POLICY "Users can view their own providers"
  ON user_service_providers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own providers" ON user_service_providers;
CREATE POLICY "Users can insert their own providers"
  ON user_service_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own providers" ON user_service_providers;
CREATE POLICY "Users can update their own providers"
  ON user_service_providers FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own providers" ON user_service_providers;
CREATE POLICY "Users can delete their own providers"
  ON user_service_providers FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour emergency_searches
DROP POLICY IF EXISTS "Users can view their own searches" ON emergency_searches;
CREATE POLICY "Users can view their own searches"
  ON emergency_searches FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own searches" ON emergency_searches;
CREATE POLICY "Users can insert their own searches"
  ON emergency_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Commentaires pour documentation
COMMENT ON TABLE user_service_providers IS 'Garages partenaires des utilisateurs pour le module SOS';
COMMENT ON TABLE emergency_searches IS 'Historique des recherches de dépannage d urgence';

-- Données de test (optionnel - à supprimer en production)
-- INSERT INTO user_service_providers (user_id, name, phone, address, city, lat, lng, vehicle_types_supported, specialties, intervention_radius_km)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'Garage Test Paris',
--   '01 23 45 67 89',
--   '123 Avenue de la République',
--   'Paris',
--   48.8566,
--   2.3522,
--   ARRAY['PL', 'VL'],
--   ARRAY['24_7', 'MOTEUR', 'FRIGO_CARRIER'],
--   50
-- );
