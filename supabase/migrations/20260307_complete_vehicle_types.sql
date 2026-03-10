-- =============================================================================
-- MIGRATION: Complétion des types de véhicules et champs réglementaires
-- DATE: 2026-03-07
-- OBJECTIF: Ajouter les colonnes pour les types détaillés et les échéances spécifiques
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Ajouter les valeurs manquantes à l'enum transport_activity
-- =============================================================================

DO $$
BEGIN
    -- ADR_CITERNE
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ADR_CITERNE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'ADR_CITERNE';
        RAISE NOTICE 'Valeur ADR_CITERNE ajoutée';
    END IF;

    -- CONVOI_EXCEPTIONNEL
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CONVOI_EXCEPTIONNEL' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'CONVOI_EXCEPTIONNEL';
        RAISE NOTICE 'Valeur CONVOI_EXCEPTIONNEL ajoutée';
    END IF;

    -- BENNE_TRAVAUX_PUBLICS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BENNE_TRAVAUX_PUBLICS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'BENNE_TRAVAUX_PUBLICS';
        RAISE NOTICE 'Valeur BENNE_TRAVAUX_PUBLICS ajoutée';
    END IF;

    -- ANIMAUX_VIVANTS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ANIMAUX_VIVANTS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'ANIMAUX_VIVANTS';
        RAISE NOTICE 'Valeur ANIMAUX_VIVANTS ajoutée';
    END IF;
END $$;

-- =============================================================================
-- ÉTAPE 2: Ajouter les colonnes à la table vehicles
-- =============================================================================

-- Colonne pour le type détaillé (affichage dans le formulaire)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(50);

COMMENT ON COLUMN vehicles.detailed_type IS 'Type détaillé du véhicule pour affichage (ex: PL_TAUTLINER, SEMI_FRIGO_MONO)';

-- Colonnes pour ADR
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS adr_certificate_date DATE,
ADD COLUMN IF NOT EXISTS adr_certificate_expiry DATE,
ADD COLUMN IF NOT EXISTS adr_equipment_check_date DATE,
ADD COLUMN IF NOT EXISTS adr_equipment_expiry DATE;

COMMENT ON COLUMN vehicles.adr_certificate_date IS 'Date du dernier agrément ADR';
COMMENT ON COLUMN vehicles.adr_certificate_expiry IS 'Date d expiration de l agrément ADR';
COMMENT ON COLUMN vehicles.adr_equipment_check_date IS 'Date du dernier contrôle équipement ADR';
COMMENT ON COLUMN vehicles.adr_equipment_expiry IS 'Date d expiration du contrôle équipement ADR';

-- Index pour les recherches par dates
CREATE INDEX IF NOT EXISTS idx_vehicles_adr_cert_expiry ON vehicles(adr_certificate_expiry) WHERE adr_certificate_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_adr_equip_expiry ON vehicles(adr_equipment_expiry) WHERE adr_equipment_expiry IS NOT NULL;

-- =============================================================================
-- ÉTAPE 3: Créer/Mettre à jour la table compliance_rules
-- =============================================================================

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
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_compliance_rules_activity ON compliance_rules(activity);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_document ON compliance_rules(activity, document_code);

-- Contrainte d'unicité
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_compliance_rule'
  ) THEN
    ALTER TABLE compliance_rules ADD CONSTRAINT unique_compliance_rule UNIQUE (activity, document_code);
  END IF;
END $$;

-- =============================================================================
-- ÉTAPE 4: Insérer les règles de compliance pour toutes les activités
-- =============================================================================

-- MARCHANDISES_GENERALES
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('MARCHANDISES_GENERALES', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('MARCHANDISES_GENERALES', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('MARCHANDISES_GENERALES', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- FRIGORIFIQUE
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('FRIGORIFIQUE', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('FRIGORIFIQUE', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('FRIGORIFIQUE', 'ATP', 'Certificat ATP (Frigo)', 36, true, ARRAY['Sondes température', 'Enregistreur', 'Groupe frigorifique'], 60),
  ('FRIGORIFIQUE', 'ETALONNAGE', 'Étalonnage température', 12, true, ARRAY['Sondes de température', 'Enregistreur', 'Groupe frigorifique'], 30),
  ('FRIGORIFIQUE', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- ADR_COLIS
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('ADR_COLIS', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('ADR_COLIS', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('ADR_COLIS', 'ADR_CERT', 'Agrément ADR Véhicule', 12, true, null, 30),
  ('ADR_COLIS', 'ADR_EQUIPEMENT', 'Contrôle Équipement ADR', 12, true, ARRAY['Valise ADR complète', 'Panneaux orange (2)', 'Gilets jaunes (1/personne)', 'Cônes de signalisation (2)', 'Lampes torches antidéflagrantes', 'Protection oculaire', 'Gants de protection', 'Bottes de protection'], 30),
  ('ADR_COLIS', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- ADR_CITERNE
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('ADR_CITERNE', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('ADR_CITERNE', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('ADR_CITERNE', 'ADR_CERT', 'Agrément ADR Citerne', 12, true, ARRAY['Valise ADR', 'Panneaux orange', 'Plaque obturation', 'Extincteurs spécifiques'], 30),
  ('ADR_CITERNE', 'ADR_EQUIPEMENT', 'Contrôle Équipement ADR', 12, true, ARRAY['Valise ADR complète', 'Panneaux orange (2)', 'Extincteurs adaptés', 'Bâche de sécurité'], 30),
  ('ADR_CITERNE', 'ETANCHEITE', 'Épreuve étanchéité citerne', 36, true, null, 60),
  ('ADR_CITERNE', 'HYDRAULIQUE', 'Épreuve hydraulique complète', 72, true, null, 90),
  ('ADR_CITERNE', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- CONVOI_EXCEPTIONNEL
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('CONVOI_EXCEPTIONNEL', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('CONVOI_EXCEPTIONNEL', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('CONVOI_EXCEPTIONNEL', 'AUTORISATION', 'Autorisation Préfectorale', 12, true, null, 30),
  ('CONVOI_EXCEPTIONNEL', 'SIGNALISATION', 'Contrôle signalétique exceptionnelle', 6, true, ARRAY['Panneaux klaxon', 'Gyrophares', 'Drapeaux', 'Escortes obligatoires'], 15),
  ('CONVOI_EXCEPTIONNEL', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- BENNE_TRAVAUX_PUBLICS
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('BENNE_TRAVAUX_PUBLICS', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('BENNE_TRAVAUX_PUBLICS', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('BENNE_TRAVAUX_PUBLICS', 'VGP_LEVAGE', 'VGP Ampliroll/Grue', 6, true, ARRAY['Vérificateur habilité', 'Câbles', 'Crochets', 'Limiteurs de charge'], 15),
  ('BENNE_TRAVAUX_PUBLICS', 'BACHAGE', 'Contrôle bâchage automatique', 12, false, ARRAY['Toile de bâchage', 'Enrouleur', 'Sangles'], 30),
  ('BENNE_TRAVAUX_PUBLICS', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- ANIMAUX_VIVANTS
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, equipment_list, reminder_days)
VALUES 
  ('ANIMAUX_VIVANTS', 'CT', 'Contrôle Technique', 12, true, null, 30),
  ('ANIMAUX_VIVANTS', 'TACHY', 'Chronotachygraphe', 24, true, null, 30),
  ('ANIMAUX_VIVANTS', 'DDPP', 'Agrément DDPP (Vétérinaire)', 60, true, null, 90),
  ('ANIMAUX_VIVANTS', 'HYGIENE', 'Contrôle hygiène bétaillère', 12, true, ARRAY['Nettoyage désinfection', 'Aération', 'Sols antidérapants', 'Séparation des animaux'], 30),
  ('ANIMAUX_VIVANTS', 'ASSURANCE', 'Assurance', 12, true, null, 15)
ON CONFLICT (activity, document_code) DO NOTHING;

-- =============================================================================
-- ÉTAPE 5: Mettre à jour les véhicules existants avec detailed_type si NULL
-- =============================================================================

-- Pour les PL Frigo
UPDATE vehicles 
SET detailed_type = 'PL_FRIGO_CAISSE'
WHERE type = 'POIDS_LOURD_FRIGO' AND detailed_type IS NULL;

-- Pour les Remorques Frigo
UPDATE vehicles 
SET detailed_type = 'REMORQUE_FRIGO_MONO'
WHERE type = 'REMORQUE_FRIGO' AND detailed_type IS NULL;

-- Pour les autres types, utiliser le type comme detailed_type par défaut
UPDATE vehicles 
SET detailed_type = type::text
WHERE detailed_type IS NULL;

-- =============================================================================
-- ÉTAPE 6: Vérification finale
-- =============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Vérifier les colonnes ajoutées
  SELECT COUNT(*) INTO v_count 
  FROM information_schema.columns 
  WHERE table_name = 'vehicles' 
  AND column_name IN ('detailed_type', 'adr_certificate_date', 'adr_certificate_expiry', 
                      'adr_equipment_check_date', 'adr_equipment_expiry');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonnes ajoutées à vehicles: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Activités configurées dans compliance_rules:';
  
  -- Afficher le nombre de règles par activité
  FOR v_count IN 
    SELECT COUNT(*)::int 
    FROM compliance_rules 
    GROUP BY activity 
    ORDER BY activity
  LOOP
    RAISE NOTICE '  - % règles', v_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Véhicules mis à jour avec detailed_type: %', 
    (SELECT COUNT(*) FROM vehicles WHERE detailed_type IS NOT NULL);
  RAISE NOTICE '========================================';
END $$;
