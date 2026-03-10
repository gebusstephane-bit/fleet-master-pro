-- =============================================================================
-- MIGRATION: Ajout complet des activités de transport manquantes
-- DATE: 2026-03-07
-- OBJECTIF: Compléter l'enum et ajouter les règles de compliance pour tous les cas métiers
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Ajouter les valeurs manquantes à l'enum transport_activity
-- =============================================================================

-- Note: PostgreSQL ne permet pas de supprimer des valeurs d'enum facilement,
-- donc on vérifie d'abord si elles existent

DO $$
BEGIN
    -- ADR_CITERNE
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ADR_CITERNE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'ADR_CITERNE';
        RAISE NOTICE 'Valeur ADR_CITERNE ajoutée à l enum';
    ELSE
        RAISE NOTICE 'Valeur ADR_CITERNE existe déjà';
    END IF;

    -- CONVOI_EXCEPTIONNEL
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CONVOI_EXCEPTIONNEL' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'CONVOI_EXCEPTIONNEL';
        RAISE NOTICE 'Valeur CONVOI_EXCEPTIONNEL ajoutée à l enum';
    ELSE
        RAISE NOTICE 'Valeur CONVOI_EXCEPTIONNEL existe déjà';
    END IF;

    -- BENNE_TRAVAUX_PUBLICS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BENNE_TRAVAUX_PUBLICS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'BENNE_TRAVAUX_PUBLICS';
        RAISE NOTICE 'Valeur BENNE_TRAVAUX_PUBLICS ajoutée à l enum';
    ELSE
        RAISE NOTICE 'Valeur BENNE_TRAVAUX_PUBLICS existe déjà';
    END IF;

    -- ANIMAUX_VIVANTS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ANIMAUX_VIVANTS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transport_activity')
    ) THEN
        ALTER TYPE transport_activity ADD VALUE 'ANIMAUX_VIVANTS';
        RAISE NOTICE 'Valeur ANIMAUX_VIVANTS ajoutée à l enum';
    ELSE
        RAISE NOTICE 'Valeur ANIMAUX_VIVANTS existe déjà';
    END IF;
END $$;

-- =============================================================================
-- ÉTAPE 2: Créer la table compliance_rules si elle n'existe pas
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
-- ÉTAPE 3: Insérer les règles de compliance pour chaque activité
-- =============================================================================

-- MARCHANDISES_GENERALES (règles de base)
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

-- ADR_CITERNE (3 ans / 6 ans)
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
-- ÉTAPE 4: Créer une vue pour faciliter les requêtes
-- =============================================================================

CREATE OR REPLACE VIEW compliance_rules_summary AS
SELECT 
  activity,
  COUNT(*) as total_rules,
  COUNT(*) FILTER (WHERE is_mandatory) as mandatory_rules,
  array_agg(document_name ORDER BY frequency_months) as documents
FROM compliance_rules
GROUP BY activity;

-- =============================================================================
-- ÉTAPE 5: Log de confirmation
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLÉTÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activités configurées:';
  RAISE NOTICE '  - MARCHANDISES_GENERALES (3 règles)';
  RAISE NOTICE '  - FRIGORIFIQUE (5 règles)';
  RAISE NOTICE '  - ADR_COLIS (5 règles)';
  RAISE NOTICE '  - ADR_CITERNE (7 règles - avec étanchéité 3 ans / hydraulique 6 ans)';
  RAISE NOTICE '  - CONVOI_EXCEPTIONNEL (5 règles)';
  RAISE NOTICE '  - BENNE_TRAVAUX_PUBLICS (5 règles)';
  RAISE NOTICE '  - ANIMAUX_VIVANTS (5 règles)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Vue créée: compliance_rules_summary';
  RAISE NOTICE '========================================';
END $$;
