-- ============================================
-- SOS GARAGE V3 - Module Recherche Externe
-- Ajoute la recherche Apify + cache + historique
-- ============================================

-- Table: Cache des résultats de recherche externe (Apify)
-- Pour limiter les coûts API (cache 6h)
CREATE TABLE IF NOT EXISTS external_garages_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Clés de recherche (pour lookup unique)
  search_brand TEXT NOT NULL,
  search_location TEXT NOT NULL, -- "Lyon,69" ou lat,lng
  search_type TEXT NOT NULL, -- 'mechanical', 'frigo', 'tire', 'electric'
  vehicle_type TEXT NOT NULL, -- 'PL' ou 'VL'
  
  -- Données brutes
  raw_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Métadonnées cache
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 hours',
  hit_count INTEGER DEFAULT 1 -- Pour stats d'utilisation
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_cache_lookup 
  ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);
CREATE INDEX IF NOT EXISTS idx_cache_expires 
  ON external_garages_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_created 
  ON external_garages_cache(created_at DESC);

-- Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_unique_lookup 
  ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);

-- Table: Historique des recherches d'urgence (mise à jour V3)
CREATE TABLE IF NOT EXISTS emergency_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Véhicule concerné (référence en lecture seule)
  vehicle_id UUID,
  vehicle_registration TEXT,
  vehicle_brand TEXT,
  vehicle_type TEXT,
  
  -- Contexte de la panne
  breakdown_type TEXT NOT NULL, -- 'mechanical', 'frigo', 'tire', 'electric', 'bodywork'
  breakdown_lat FLOAT,
  breakdown_lng FLOAT,
  breakdown_address TEXT,
  severity TEXT DEFAULT 'normal', -- 'immediate', 'normal'
  
  -- Résultat de la recherche
  found_level TEXT NOT NULL, -- 'internal_partner', 'external_network', 'none'
  
  -- Si Niveau 1 (partenaire interne)
  selected_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  
  -- Si Niveau 2 (réseau externe)
  external_cache_id UUID REFERENCES external_garages_cache(id) ON DELETE SET NULL,
  selected_external_place_id TEXT, -- Place ID Google du garage choisi
  
  -- Métadonnées
  search_brand TEXT, -- Marque recherchée (Audi, Carrier, etc.)
  ai_reasoning TEXT,
  distance_km FLOAT,
  estimated_time_minutes INTEGER,
  
  -- Feedback post-intervention
  contacted BOOLEAN DEFAULT false,
  contacted_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  feedback_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_emergency_searches_user 
  ON emergency_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_vehicle 
  ON emergency_searches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_date 
  ON emergency_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_searches_level 
  ON emergency_searches(found_level);

-- Mettre à jour la table user_service_providers existante (ajouter vehicle_brands)
ALTER TABLE user_service_providers 
  ADD COLUMN IF NOT EXISTS vehicle_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frigo_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- Index supplémentaires pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_partners_brands 
  ON user_service_providers USING GIN(vehicle_brands);
CREATE INDEX IF NOT EXISTS idx_partners_frigo_brands 
  ON user_service_providers USING GIN(frigo_brands);

-- Fonction: Nettoyer le cache expiré (à appeler via cron ou manuellement)
CREATE OR REPLACE FUNCTION cleanup_expired_garage_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM external_garages_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Incrémenter le hit_count du cache
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE external_garages_cache 
  SET hit_count = hit_count + 1 
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies

-- Activer RLS sur external_garages_cache (lecture publique, insertion via service role)
ALTER TABLE external_garages_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read cache" ON external_garages_cache;
CREATE POLICY "Public can read cache"
  ON external_garages_cache FOR SELECT
  USING (true);

-- RLS sur emergency_searches (utilisateur voit ses propres recherches)
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

-- Commentaires pour documentation
COMMENT ON TABLE external_garages_cache IS 'Cache des résultats de recherche Apify (durée 6h)';
COMMENT ON TABLE emergency_searches IS 'Historique complet des recherches SOS avec feedback';
COMMENT ON COLUMN emergency_searches.found_level IS 'Niveau de résultat: internal_partner, external_network, none';
COMMENT ON COLUMN emergency_searches.search_brand IS 'Marque recherchée (Audi, Carrier, etc.)';

-- Trigger pour mettre à jour updated_at sur user_service_providers
DROP TRIGGER IF EXISTS update_user_providers_updated_at ON user_service_providers;
CREATE TRIGGER update_user_providers_updated_at
  BEFORE UPDATE ON user_service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
