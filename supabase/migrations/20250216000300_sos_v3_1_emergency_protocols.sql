-- ============================================
-- SOS GARAGE V3.1 - Protocoles d'urgence configurables
-- Couche AU-DESSUS de la V3 (ne rien casser)
-- ============================================

-- Table: Protocoles d'urgence personnalisés
CREATE TABLE IF NOT EXISTS emergency_protocols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- 0 = vérifié en premier
  
  -- Conditions
  condition_type TEXT NOT NULL, -- 'distance', 'location_type', 'breakdown_type', 'brand_specific'
  condition_value TEXT NOT NULL, -- ex: '>50', 'highway', 'frigo', 'Carrier'
  condition_reference TEXT, -- ex: 'garage_id_xxx' (pour distance) ou null
  
  -- Action
  action_type TEXT NOT NULL DEFAULT 'call', -- 'call', 'display'
  phone_number TEXT,
  instructions TEXT NOT NULL,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_emergency_protocols_user 
  ON emergency_protocols(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_protocols_priority 
  ON emergency_protocols(priority);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_emergency_protocols_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_emergency_protocols_updated_at ON emergency_protocols;
CREATE TRIGGER update_emergency_protocols_updated_at
  BEFORE UPDATE ON emergency_protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_protocols_updated_at();

-- RLS
ALTER TABLE emergency_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own protocols" ON emergency_protocols;
CREATE POLICY "Users can view their own protocols"
  ON emergency_protocols FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own protocols" ON emergency_protocols;
CREATE POLICY "Users can insert their own protocols"
  ON emergency_protocols FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own protocols" ON emergency_protocols;
CREATE POLICY "Users can update their own protocols"
  ON emergency_protocols FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own protocols" ON emergency_protocols;
CREATE POLICY "Users can delete their own protocols"
  ON emergency_protocols FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE emergency_protocols IS 'Protocoles d urgence personnalisés (V3.1)';
COMMENT ON COLUMN emergency_protocols.condition_type IS 'Type: distance, location_type, breakdown_type, brand_specific';
