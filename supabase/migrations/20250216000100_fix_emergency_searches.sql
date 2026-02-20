-- ============================================
-- FIX: Mise à jour de emergency_searches pour V3
-- ============================================

-- Supprimer l'ancienne table si elle existe avec une structure obsolète
DROP TABLE IF EXISTS emergency_searches CASCADE;

-- Recréer avec la bonne structure V3
CREATE TABLE emergency_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Véhicule concerné (référence en lecture seule)
  vehicle_id UUID,
  vehicle_registration TEXT,
  vehicle_brand TEXT,
  vehicle_type TEXT,
  
  -- Contexte de la panne
  breakdown_type TEXT NOT NULL,
  breakdown_lat FLOAT,
  breakdown_lng FLOAT,
  breakdown_address TEXT,
  severity TEXT DEFAULT 'normal',
  
  -- Résultat de la recherche
  found_level TEXT NOT NULL, -- 'internal_partner', 'external_network', 'none'
  
  -- Si Niveau 1 (partenaire interne)
  selected_provider_id UUID REFERENCES user_service_providers(id) ON DELETE SET NULL,
  
  -- Si Niveau 2 (réseau externe)
  external_cache_id UUID REFERENCES external_garages_cache(id) ON DELETE SET NULL,
  selected_external_place_id TEXT,
  
  -- Métadonnées
  search_brand TEXT,
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

-- Index
CREATE INDEX idx_emergency_searches_user ON emergency_searches(user_id);
CREATE INDEX idx_emergency_searches_vehicle ON emergency_searches(vehicle_id);
CREATE INDEX idx_emergency_searches_date ON emergency_searches(created_at DESC);
CREATE INDEX idx_emergency_searches_level ON emergency_searches(found_level);

-- RLS
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

-- Vérifier que external_garages_cache existe
CREATE TABLE IF NOT EXISTS external_garages_cache (
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
CREATE INDEX IF NOT EXISTS idx_cache_lookup 
  ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);
CREATE INDEX IF NOT EXISTS idx_cache_expires 
  ON external_garages_cache(expires_at);

-- Contrainte unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_unique_lookup 
  ON external_garages_cache(search_brand, search_location, search_type, vehicle_type);

-- Fonction pour incrémenter le hit_count
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE external_garages_cache 
  SET hit_count = hit_count + 1 
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE emergency_searches IS 'Historique complet des recherches SOS V3';
COMMENT ON COLUMN emergency_searches.found_level IS 'Niveau de résultat: internal_partner, external_network, none';
