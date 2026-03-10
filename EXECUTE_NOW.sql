-- =============================================================================
-- SCRIPT RAPIDE À EXÉCUTER IMMÉDIATEMENT DANS SUPABASE SQL EDITOR
-- =============================================================================

-- 1. Ajouter les valeurs à l'enum (si pas déjà fait)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADR_CITERNE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')) THEN
        ALTER TYPE transport_activity ADD VALUE 'ADR_CITERNE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONVOI_EXCEPTIONNEL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')) THEN
        ALTER TYPE transport_activity ADD VALUE 'CONVOI_EXCEPTIONNEL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BENNE_TRAVAUX_PUBLICS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')) THEN
        ALTER TYPE transport_activity ADD VALUE 'BENNE_TRAVAUX_PUBLICS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANIMAUX_VIVANTS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')) THEN
        ALTER TYPE transport_activity ADD VALUE 'ANIMAUX_VIVANTS';
    END IF;
END $$;

-- 2. Ajouter les colonnes à vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS adr_certificate_date DATE,
ADD COLUMN IF NOT EXISTS adr_certificate_expiry DATE,
ADD COLUMN IF NOT EXISTS adr_equipment_check_date DATE,
ADD COLUMN IF NOT EXISTS adr_equipment_expiry DATE;

-- 3. Créer la table compliance_rules si elle n'existe pas
CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity transport_activity NOT NULL,
  document_code varchar NOT NULL,
  document_name varchar NOT NULL,
  frequency_months int NOT NULL,
  is_mandatory boolean DEFAULT true,
  requires_equipment boolean DEFAULT false,
  equipment_list text[] DEFAULT NULL,
  applicable_vehicle_types text[] DEFAULT NULL,
  reminder_days int DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity, document_code)
);

-- 4. Insérer les règles essentiels (ADR, Frigo, etc.)
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days) VALUES
  -- FRIGORIFIQUE
  ('FRIGORIFIQUE', 'ATP', 'Certificat ATP (Frigo)', 36, true, ARRAY['Sondes température', 'Enregistreur', 'Groupe frigorifique'], 60),
  ('FRIGORIFIQUE', 'ETALONNAGE', 'Étalonnage température', 12, true, ARRAY['Sondes de température', 'Enregistreur', 'Groupe frigorifique'], 30),
  -- ADR
  ('ADR_COLIS', 'ADR_CERT', 'Agrément ADR Véhicule', 12, true, null, 30),
  ('ADR_COLIS', 'ADR_EQUIPEMENT', 'Contrôle Équipement ADR', 12, true, ARRAY['Valise ADR complète', 'Panneaux orange (2)', 'Gilets jaunes', 'Cônes de signalisation', 'Lampes torches'], 30),
  -- ADR CITERNE
  ('ADR_CITERNE', 'ADR_CERT', 'Agrément ADR Citerne', 12, true, ARRAY['Valise ADR', 'Panneaux orange', 'Plaque obturation', 'Extincteurs spécifiques'], 30),
  ('ADR_CITERNE', 'ETANCHEITE', 'Épreuve étanchéité citerne', 36, true, null, 60),
  ('ADR_CITERNE', 'HYDRAULIQUE', 'Épreuve hydraulique complète', 72, true, null, 90)
ON CONFLICT (activity, document_code) DO NOTHING;

-- 5. Mettre à jour les véhicules existants
UPDATE vehicles SET detailed_type = COALESCE(detailed_type, type::text);

-- 6. Vérification
SELECT 
  'Colonnes ajoutées' as info,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name LIKE 'adr_%') as adr_columns
UNION ALL
SELECT 
  'Règles compliance',
  (SELECT COUNT(*)::int FROM compliance_rules);
