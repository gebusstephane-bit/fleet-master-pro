-- =============================================================================
-- SEED: Règles de conformité réglementaire par activité de transport
-- =============================================================================
-- Ce fichier contient les règles métier à jour pour chaque type d'activité
-- Peut être réexécuté pour réinitialiser les règles aux valeurs par défaut
-- =============================================================================

BEGIN;

-- Supprime les anciennes règles (si besoin de réinitialisation complète)
-- DELETE FROM compliance_rules;

-- =============================================================================
-- MARCHANDISES_GENERALES (Activité par défaut)
-- =============================================================================

-- CT PL (12 mois)
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('MARCHANDISES_GENERALES', 'CT_PL', 'Contrôle Technique PL', 12, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER', 'REMORQUE'], 30, false, NULL)
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- CT VL (24 mois)
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('MARCHANDISES_GENERALES', 'CT_VL', 'Contrôle Technique VL', 24, true, ARRAY['VOITURE', 'FOURGON'], 30, false, NULL)
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- Tachygraphe
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('MARCHANDISES_GENERALES', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL)
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- VGP Levage
INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('MARCHANDISES_GENERALES', 'VGP_LEVAGE', 'VGP Levage', 6, false, NULL, 15, true, ARRAY['Grue', 'Hayon élévateur', 'Treuil'])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- FRIGORIFIQUE (Température dirigée)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('FRIGORIFIQUE', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO'], 30, false, NULL),
  ('FRIGORIFIQUE', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD_FRIGO'], 30, false, NULL),
  ('FRIGORIFIQUE', 'ATP', 'Certificat ATP', 36, true, ARRAY['POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO'], 30, false, NULL),
  ('FRIGORIFIQUE', 'ETALONNAGE', 'Étalonnage température', 12, true, NULL, 30, true, ARRAY['Sondes de température', 'Enregistreur', 'Groupe frigorifique'])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- ADR_COLIS (Matières dangereuses - Colis)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('ADR_COLIS', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('ADR_COLIS', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('ADR_COLIS', 'ADR_CERT', 'Agrément ADR Véhicule', 12, true, NULL, 30, false, NULL),
  ('ADR_COLIS', 'ADR_EQUIPEMENT', 'Contrôle Équipement ADR', 12, true, NULL, 30, true, ARRAY[
    'Valise ADR complète',
    'Panneaux orange (2)',
    'Gilets jaunes (1 par personne)',
    'Cônes de signalisation (2)',
    'Lampes torches antidéflagrantes',
    'Protection oculaire',
    'Gants de protection',
    'Bottes de protection'
  ])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- ADR_CITERNE (Matières dangereuses - Citernes)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('ADR_CITERNE', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('ADR_CITERNE', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('ADR_CITERNE', 'ADR_CERT', 'Agrément ADR Véhicule', 12, true, NULL, 30, false, NULL),
  ('ADR_CITERNE', 'ADR_EQUIPEMENT', 'Contrôle Équipement ADR', 12, true, NULL, 30, true, ARRAY[
    'Valise ADR citerne',
    'Panneaux orange (2)',
    'Gilets jaunes (1 par personne)',
    'Cônes de signalisation (4)',
    'Lampes torches antidéflagrantes',
    'Protection oculaire',
    'Gants de protection spéciaux',
    'Bottes de protection',
    'Couverture anti-feu'
  ]),
  ('ADR_CITERNE', 'ETANCHEITE', 'Épreuve d''étanchéité', 36, true, NULL, 60, false, NULL),
  ('ADR_CITERNE', 'HYDRAULIQUE', 'Épreuve hydraulique', 72, true, NULL, 90, false, NULL),
  ('ADR_CITERNE', 'ECHELLE_CITERNE', 'Vérification échelle citerne', 12, true, NULL, 30, false, NULL)
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- CONVOI_EXCEPTIONNEL (Convoi exceptionnel)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('CONVOI_EXCEPTIONNEL', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER', 'REMORQUE'], 30, false, NULL),
  ('CONVOI_EXCEPTIONNEL', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('CONVOI_EXCEPTIONNEL', 'AUTORISATION', 'Autorisation convoi exceptionnel', 12, true, NULL, 30, false, NULL),
  ('CONVOI_EXCEPTIONNEL', 'VGP_LEVAGE', 'VGP Levage', 6, false, NULL, 15, true, ARRAY['Grue de chargement', 'Système d''arrimage'])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- BENNE_TRAVAUX_PUBLICS (Benne / Travaux Publics)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('BENNE_TRAVAUX_PUBLICS', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('BENNE_TRAVAUX_PUBLICS', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30, false, NULL),
  ('BENNE_TRAVAUX_PUBLICS', 'VGP_LEVAGE', 'VGP Benne hydraulique', 6, true, NULL, 15, true, ARRAY['Benne hydraulique', 'Vérins', 'Système de sécurité benne'])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- ANIMAUX_VIVANTS (Bétaillère)
-- =============================================================================

INSERT INTO compliance_rules (activity, document_code, document_name, frequency_months, is_mandatory, applicable_vehicle_types, reminder_days, requires_equipment, equipment_list) VALUES
  ('ANIMAUX_VIVANTS', 'CT', 'Contrôle Technique', 12, true, ARRAY['POIDS_LOURD', 'REMORQUE'], 30, false, NULL),
  ('ANIMAUX_VIVANTS', 'TACHY', 'Chronotachygraphe', 24, true, ARRAY['POIDS_LOURD'], 30, false, NULL),
  ('ANIMAUX_VIVANTS', 'CERTIFICATION', 'Certification transport animaux vivants', 24, true, NULL, 60, false, NULL),
  ('ANIMAUX_VIVANTS', 'HYGIENE', 'Contrôle hygiène bétaillère', 6, true, NULL, 15, true, ARRAY[
    'Système de ventilation',
    'Système d''abreuvement',
    'Système d''alimentation',
    'Revetement antidérapant',
    'Séparations amovibles'
  ])
ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list;

-- =============================================================================
-- Vérification des données insérées
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_count FROM compliance_rules;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED COMPLIANCE_RULES TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Nombre total de règles: %', v_count;
  RAISE NOTICE '========================================';
  
  -- Affiche le résumé par activité
  FOR rec IN 
    SELECT activity, COUNT(*) as rule_count 
    FROM compliance_rules 
    GROUP BY activity 
    ORDER BY activity
  LOOP
    RAISE NOTICE '  - %: % règles', rec.activity, rec.rule_count;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;
