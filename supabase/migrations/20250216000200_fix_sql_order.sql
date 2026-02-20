-- ============================================
-- FIX SQL: Créer les tables dans le bon ordre
-- ============================================

-- Étape 1: Supprimer les tables existantes (si elles existent)
DROP TABLE IF EXISTS emergency_searches CASCADE;
DROP TABLE IF EXISTS external_garages_cache CASCADE;

-- Étape 2: Créer external_garages_cache D'ABORD
CREATE TABLE external_garages_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_brand TEXT NOT NULL,
  search_location TEXT NOT NULL,
  search_type TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  raw_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 hours',
  hit_count INTEGER DEFAULT 1
);

-- Index pour external_garages_cache
CREATE INDEX idx_cache_lookup ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);
CREATE INDEX idx_cache_expires ON external_garages_cache(expires_at);
CREATE UNIQUE INDEX idx_cache_unique_lookup ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);

-- RLS pour external_garages_cache
ALTER TABLE external_garages_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read cache" ON external_garages_cache;
CREATE POLICY "Public can read cache"
  ON external_garages_cache FOR SELECT
  USING (true);

-- Étape 3: Créer emergency_searches ENSUITE (après external_garages_cache)
CREATE TABLE emergency_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  vehicle_id UUID,
  vehicle_registration TEXT,
  vehicle_brand TEXT,
  vehicle_type TEXT,
  
  breakdown_type TEXT NOT NULL,
  breakdown_lat FLOAT,
  breakdown_lng FLOAT,
  breakdown_address TEXT,
  severity TEXT DEFAULT 'normal',
  
  found_level TEXT NOT NULL,
  
  selected_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  external_cache_id UUID REFERENCES external_garages_cache(id) ON DELETE SET NULL,
  selected_external_place_id TEXT,
  
  search_brand TEXT,
  ai_reasoning TEXT,
  distance_km FLOAT,
  estimated_time_minutes INTEGER,
  
  contacted BOOLEAN DEFAULT false,
  contacted_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  feedback_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour emergency_searches
CREATE INDEX idx_emergency_searches_user ON emergency_searches(user_id);
CREATE INDEX idx_emergency_searches_vehicle ON emergency_searches(vehicle_id);
CREATE INDEX idx_emergency_searches_date ON emergency_searches(created_at DESC);
CREATE INDEX idx_emergency_searches_level ON emergency_searches(found_level);

-- RLS pour emergency_searches
ALTER TABLE emergency_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own searches" ON emergency_searches;
CREATE POLICY "Users can view their own searches"
  ON emergency_searches FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own searches" ON emergency_searches;
CREATE POLICY "Users can insert their own searches"
  ON emergency_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own searches" ON emergency_searches;
CREATE POLICY "Users can update their own searches"
  ON emergency_searches FOR UPDATE
  USING (auth.uid() = user_id);

-- Étape 4: Fonction pour incrémenter le hit_count
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE external_garages_cache 
  SET hit_count = hit_count + 1 
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Mettre à jour user_service_providers (ajouter colonnes si elles n'existent pas)
ALTER TABLE user_service_providers 
  ADD COLUMN IF NOT EXISTS vehicle_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frigo_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_partners_brands ON user_service_providers USING GIN(vehicle_brands);
CREATE INDEX IF NOT EXISTS idx_partners_frigo_brands ON user_service_providers USING GIN(frigo_brands);

-- Commentaires
COMMENT ON TABLE external_garages_cache IS 'Cache des résultats de recherche Apify (durée 6h)';
COMMENT ON TABLE emergency_searches IS 'Historique complet des recherches SOS V3';
