-- ============================================
-- MODULE SOS GARAGE - MES PRESTATAIRES
-- Création des nouvelles tables (sans toucher aux existantes)
-- ============================================

-- 1. TABLE : user_service_providers (Garages prestataires du client)
CREATE TABLE IF NOT EXISTS user_service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Infos garage
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat FLOAT,
  lng FLOAT,
  
  -- Spécifications techniques
  vehicle_types_supported TEXT[] DEFAULT '{}', -- ['PL', 'VL']
  specialties TEXT[] DEFAULT '{}', -- ['FRIGO_CARRIER', 'FRIGO_THERMOKING', 'MOTEUR', 'PNEU', 'ELECTRIQUE', '24_7']
  max_tonnage INTEGER DEFAULT 44, -- jusqu'à combien de tonnes
  intervention_radius_km INTEGER DEFAULT 50, -- rayon d'action pour dépannage
  
  -- Contrat
  contract_number TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- 0=normal, 10=prioritaire
  
  -- Géolocalisation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_company_id ON user_service_providers(company_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_location ON user_service_providers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_user_providers_is_active ON user_service_providers(is_active);

-- 2. TABLE : emergency_searches (Historique des recherches SOS)
CREATE TABLE IF NOT EXISTS emergency_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  
  -- Contexte
  breakdown_location_lat FLOAT,
  breakdown_location_lng FLOAT,
  breakdown_address TEXT NOT NULL,
  breakdown_type TEXT NOT NULL, -- 'MOTEUR', 'GROUPE_FRIGO', 'PNEU', 'ELECTRIQUE', 'CARROSSERIE', 'AUTRE'
  
  -- Résultat IA
  recommended_provider_id UUID REFERENCES user_service_providers(id),
  alternative_provider_id UUID REFERENCES user_service_providers(id),
  backup_provider_id UUID REFERENCES user_service_providers(id),
  ai_reasoning TEXT, -- Explication de l'IA
  distance_km FLOAT,
  estimated_time_minutes INTEGER,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'called', 'resolved', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_emergency_searches_user_id ON emergency_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_vehicle_id ON emergency_searches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_created_at ON emergency_searches(created_at DESC);

-- 3. TABLE : sos_settings (Paramètres utilisateur SOS)
CREATE TABLE IF NOT EXISTS sos_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_depot_lat FLOAT,
  default_depot_lng FLOAT,
  emergency_phone_fallback TEXT, -- numéro dépanneur universel si aucun prestataire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS sur les nouvelles tables
ALTER TABLE user_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_settings ENABLE ROW LEVEL SECURITY;

-- user_service_providers : Users voient uniquement LEURS prestataires
CREATE POLICY "Users can view their own service providers"
  ON user_service_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service providers"
  ON user_service_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service providers"
  ON user_service_providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service providers"
  ON user_service_providers FOR DELETE
  USING (auth.uid() = user_id);

-- emergency_searches : Users voient uniquement LEURS recherches
CREATE POLICY "Users can view their own emergency searches"
  ON emergency_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency searches"
  ON emergency_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- sos_settings : Users voient/modifient uniquement LEURS settings
CREATE POLICY "Users can view their own SOS settings"
  ON sos_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SOS settings"
  ON sos_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOS settings"
  ON sos_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer la distance entre deux points GPS (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 FLOAT,
  lng1 FLOAT,
  lat2 FLOAT,
  lng2 FLOAT
) RETURNS FLOAT AS $$
DECLARE
  R FLOAT := 6371; -- Rayon de la Terre en km
  dlat FLOAT;
  dlng FLOAT;
  a FLOAT;
  c FLOAT;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_service_providers_updated_at
  BEFORE UPDATE ON user_service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_settings_updated_at
  BEFORE UPDATE ON sos_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE user_service_providers IS 'Garages et prestataires de service enregistrés par chaque utilisateur/client';
COMMENT ON TABLE emergency_searches IS 'Historique des recherches d assistance SOS';
COMMENT ON TABLE sos_settings IS 'Paramètres utilisateur pour le module SOS';
