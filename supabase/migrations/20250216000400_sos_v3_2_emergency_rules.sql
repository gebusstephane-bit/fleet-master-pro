-- ============================================
-- SOS GARAGE V3.2 - Règles d'urgence intelligentes (Arbre de décision)
-- Remplace emergency_protocols par une logique plus fine
-- ============================================

-- Supprimer l'ancienne table (si elle existe)
DROP TABLE IF EXISTS emergency_protocols CASCADE;

-- Nouvelle table : emergency_rules (logique d'arbre de décision)
CREATE TABLE emergency_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('contract_24_7', 'insurance', 'highway_service', 'management', 'garage_partner')),
  
  -- Conditions déclenchement
  applies_to_breakdown_types TEXT[] NOT NULL DEFAULT '{}',
  applies_if_immobilized BOOLEAN, -- true=immobilisé, false=roulant, null=peu importe
  applies_on_highway BOOLEAN DEFAULT false, -- true=autoroute, false=hors autoroute, null=les deux
  
  -- Contact
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  contract_reference TEXT,
  
  -- Instructions affichées
  instructions TEXT NOT NULL,
  
  -- Affichage
  display_color TEXT DEFAULT 'blue', -- 'red', 'orange', 'green', 'blue'
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX idx_rules_user ON emergency_rules(user_id, is_active, priority);
CREATE INDEX idx_rules_breakdown ON emergency_rules USING GIN(applies_to_breakdown_types);
CREATE INDEX idx_rules_conditions ON emergency_rules(applies_if_immobilized, applies_on_highway);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_emergency_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_emergency_rules_updated_at ON emergency_rules;
CREATE TRIGGER update_emergency_rules_updated_at
  BEFORE UPDATE ON emergency_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_rules_updated_at();

-- RLS
ALTER TABLE emergency_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rules" ON emergency_rules;
CREATE POLICY "Users can view their own rules"
  ON emergency_rules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rules" ON emergency_rules;
CREATE POLICY "Users can insert their own rules"
  ON emergency_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rules" ON emergency_rules;
CREATE POLICY "Users can update their own rules"
  ON emergency_rules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rules" ON emergency_rules;
CREATE POLICY "Users can delete their own rules"
  ON emergency_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE emergency_rules IS 'Règles d urgence intelligentes (V3.2) - Arbre de décision';
COMMENT ON COLUMN emergency_rules.applies_to_breakdown_types IS 'Types de panne: tire, mechanical, frigo, tailgate, electric';
COMMENT ON COLUMN emergency_rules.applies_if_immobilized IS 'true=immobilisé, false=roulant, null=peu importe';
COMMENT ON COLUMN emergency_rules.applies_on_highway IS 'true=autoroute, false=hors autoroute, null=les deux';

-- Données d'exemple (à supprimer en production)
-- INSERT INTO emergency_rules (user_id, name, rule_type, applies_to_breakdown_types, applies_if_immobilized, applies_on_highway, phone_number, contact_name, contract_reference, instructions, display_color, priority)
-- VALUES 
-- ('uuid-user', 'Euromaster Pneu 24/24', 'contract_24_7', ARRAY['tire'], true, false, '06.12.34.56.78', 'Service dépannage', 'CTR-12345', '1. Restez à l arrêt\n2. Appelez le numéro\n3. Indiquez votre position', 'green', 0),
-- ('uuid-user', 'Assurance Groupama', 'insurance', ARRAY['tire', 'mechanical'], true, false, '01.23.45.67.89', 'Assistance', 'POL-789', 'Véhicule immobilisé - Contactez votre assurance', 'orange', 1),
-- ('uuid-user', 'Direction Technique', 'management', ARRAY['tailgate'], null, false, '06.98.76.54.32', 'Directeur', null, 'Problème hayon - Contacter la direction uniquement', 'blue', 0),
-- ('uuid-user', 'Assistance Carrier Frigo', 'contract_24_7', ARRAY['frigo'], false, false, '08.00.XX.XX.XX', 'Support Carrier', 'CTR-FRIGO-001', '1. Notez le code erreur\n2. Ne coupez pas le groupe\n3. Appelez le numéro', 'green', 0);
