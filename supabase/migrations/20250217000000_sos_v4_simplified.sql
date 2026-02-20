-- ============================================
-- SOS GARAGE V4 - Architecture simplifiée
-- "4 questions = 1 solution"
-- ============================================

-- Suppression des anciennes tables (si elles existent)
DROP TABLE IF EXISTS emergency_rules CASCADE;
DROP TABLE IF EXISTS emergency_protocols CASCADE;
DROP TABLE IF EXISTS emergency_searches CASCADE;
DROP TABLE IF EXISTS external_garages_cache CASCADE;

-- =====================================================
-- TABLE 1: sos_providers (Garages prestataires simplifiés)
-- Remplace user_service_providers
-- =====================================================

CREATE TABLE sos_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL, -- ex: "Euromaster Metz", "Garage Dupont"
  specialty TEXT NOT NULL DEFAULT 'general', 
    -- 'pneu', 'mecanique', 'frigo', 'carrosserie', 'general'
  
  -- Contact
  phone_standard TEXT, -- Numéro standard
  phone_24h TEXT, -- Numéro 24/24 (NULL si pas de service 24h)
  
  -- Rayon d'action (simplifié, pas de coordonnées GPS)
  max_distance_km INTEGER DEFAULT 50, -- Rayon d'intervention
  
  -- Localisation (texte libre, pas de géocodage)
  city TEXT NOT NULL, -- ex: "Metz", "Paris 15e"
  address TEXT, -- Adresse complète optionnelle
  
  -- Marques gérées (optionnel)
  vehicle_brands TEXT[], -- ex: {'Renault', 'Mercedes'}
  
  -- État
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- 0 = plus prioritaire
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sos_providers_user ON sos_providers(user_id, is_active, priority);
CREATE INDEX idx_sos_providers_specialty ON sos_providers(specialty);
CREATE INDEX idx_sos_providers_city ON sos_providers(city);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_sos_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sos_providers_updated_at
  BEFORE UPDATE ON sos_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_sos_providers_updated_at();

-- Commentaires
COMMENT ON TABLE sos_providers IS 'Garages prestataires SOS - Simplifié V4 (pas de GPS)';
COMMENT ON COLUMN sos_providers.phone_24h IS 'NULL = pas de service 24/24 disponible';
COMMENT ON COLUMN sos_providers.max_distance_km IS 'Rayon d''intervention depuis la ville';

-- =====================================================
-- TABLE 2: sos_emergency_contracts (Contrats d'urgence)
-- Ultra simplifiée
-- =====================================================

CREATE TABLE sos_emergency_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type de service (décision métier)
  service_type TEXT NOT NULL CHECK (service_type IN (
    'pneu_24h',           -- Dépannage pneu 24/24
    'frigo_assistance',   -- Assistance groupe frigo
    'mecanique_24h',      -- Mécanique 24/24
    'remorquage',         -- Service remorquage
    'assurance',          -- Assurance sinistres
    'direction'           -- Contact direction
  )),
  
  -- Identification
  name TEXT NOT NULL, -- ex: "Euromaster Astreinte", "Assurance Groupama"
  phone_number TEXT NOT NULL,
  contract_ref TEXT, -- ex: "Contrat N°12345"
  
  -- Instructions à afficher (texte libre multi-lignes)
  instructions TEXT DEFAULT '',
  
  -- Conditions d'utilisation (logique métier)
  for_distance TEXT CHECK (for_distance IN ('close', 'far', 'both')) DEFAULT 'both',
    -- 'close' = <50km du dépôt
    -- 'far' = >50km du dépôt  
    -- 'both' = peu importe la distance
  
  for_immobilized BOOLEAN, -- true=immobilisé, false=roulant, null=peu importe
  
  -- Affichage
  priority INTEGER DEFAULT 0, -- 0 = afficher en premier
  is_active BOOLEAN DEFAULT true,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sos_contracts_user ON sos_emergency_contracts(user_id, is_active, priority);
CREATE INDEX idx_sos_contracts_type ON sos_emergency_contracts(service_type);
CREATE INDEX idx_sos_contracts_conditions ON sos_emergency_contracts(for_distance, for_immobilized);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_sos_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sos_contracts_updated_at
  BEFORE UPDATE ON sos_emergency_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_sos_contracts_updated_at();

-- Commentaires
COMMENT ON TABLE sos_emergency_contracts IS 'Contrats d''urgence et contacts SOS - V4 simplifié';
COMMENT ON COLUMN sos_emergency_contracts.service_type IS 'Type de service pour logique métier';
COMMENT ON COLUMN sos_emergency_contracts.for_distance IS 'close=<50km, far=>50km, both=les deux';
COMMENT ON COLUMN sos_emergency_contracts.for_immobilized IS 'true=immobilisé, false=roulant, null=peu importe';

-- =====================================================
-- TABLE 3: sos_history (Historique des appels - optionnel)
-- Pour traçabilité uniquement
-- =====================================================

CREATE TABLE sos_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),
  
  -- Contexte
  breakdown_type TEXT NOT NULL,
  distance_category TEXT NOT NULL, -- 'close' ou 'far'
  vehicle_state TEXT NOT NULL, -- 'rolling' ou 'immobilized'
  
  -- Solution proposée
  solution_type TEXT NOT NULL, -- 'contract', 'insurance', 'garage_partner', 'garage_external'
  solution_name TEXT,
  solution_phone TEXT,
  
  -- Localisation déclarée (texte libre)
  location_text TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_history_user ON sos_history(user_id, created_at DESC);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- sos_providers
ALTER TABLE sos_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own providers"
  ON sos_providers FOR ALL
  USING (auth.uid() = user_id);

-- sos_emergency_contracts
ALTER TABLE sos_emergency_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contracts"
  ON sos_emergency_contracts FOR ALL
  USING (auth.uid() = user_id);

-- sos_history
ALTER TABLE sos_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history"
  ON sos_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON sos_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DONNÉES D'EXEMPLE (à supprimer en production)
-- =====================================================

-- Exemple: Garage partenaire pneu
-- INSERT INTO sos_providers (user_id, name, specialty, phone_standard, phone_24h, max_distance_km, city)
-- VALUES 
-- ('uuid-user', 'Euromaster Metz', 'pneu', '03.87.XX.XX.XX', '06.12.34.56.78', 50, 'Metz'),
-- ('uuid-user', 'Garage Central Méca', 'mecanique', '03.87.YY.YY.YY', NULL, 30, 'Metz');

-- Exemple: Contrats d'urgence
-- INSERT INTO sos_emergency_contracts (user_id, service_type, name, phone_number, contract_ref, instructions, for_distance, for_immobilized)
-- VALUES 
-- ('uuid-user', 'pneu_24h', 'Euromaster Astreinte 24/24', '06.12.34.56.78', 'CTR-PNEU-2024', 
--  '1. Restez à l''arrêt en sécurité
-- 2. Indiquez votre position exacte
-- 3. Précisez les dimensions du pneu', 'both', true),
-- ('uuid-user', 'assurance', 'Assurance Groupama Sinistres', '01.23.45.67.89', 'POL-789456',
--  'Contactez votre assurance pour remorquage. Numéro de contrat à indiquer.', 'both', true),
-- ('uuid-user', 'frigo_assistance', 'Carrier Assistance Frigo', '08.00.XX.XX.XX', 'CTR-CARRIER-001',
--  'NE COUPEZ PAS LE GROUPE FRIGO. Notez le code erreur et appelez.', 'both', NULL),
-- ('uuid-user', 'direction', 'Direction Technique', '06.98.76.54.32', NULL,
--  'Problème hayon - Contacter la direction uniquement. Ne pas chercher de garage extérieur.', 'both', NULL);
