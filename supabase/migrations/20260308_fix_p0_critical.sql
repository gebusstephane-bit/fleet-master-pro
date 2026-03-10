-- =============================================================================
-- MIGRATION: Corrections P0 - Transactions atomiques et règles légales manquantes
-- DATE: 2026-03-08
-- OBJECTIF: 
--   1. Fonction RPC atomique pour assignation activité véhicule
--   2. Ajout extincteurs (obligatoire légal)
--   3. Ajout TSVR (Taxe Spéciale Véhicules Routiers)
--   4. Ajout Limiteur de vitesse (distinct du tachygraphe)
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Fonction RPC atomique pour assignation d'activité
-- Résout: Faille transaction non atomique (données orphelines)
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_vehicle_activity_atomic(
  p_vehicle_id uuid,
  p_activity transport_activity,
  p_start_date timestamptz,
  p_notes text,
  p_assigned_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_old_assignment_id uuid;
  v_new_assignment_id uuid;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Vérifier que le véhicule existe et récupérer company_id
  SELECT company_id INTO v_company_id
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Véhicule non trouvé';
  END IF;
  
  -- Vérifier que l'activité est autorisée pour cette entreprise
  IF NOT EXISTS (
    SELECT 1 FROM company_activities 
    WHERE company_id = v_company_id 
    AND activity = p_activity
  ) THEN
    RAISE EXCEPTION 'Activité non autorisée pour cette entreprise';
  END IF;

  -- 1. Clôturer l'ancienne assignation si existe
  UPDATE vehicle_activity_assignments 
  SET end_date = CURRENT_TIMESTAMP
  WHERE vehicle_id = p_vehicle_id 
  AND end_date IS NULL
  RETURNING id INTO v_old_assignment_id;
  
  -- 2. Créer la nouvelle assignation
  INSERT INTO vehicle_activity_assignments (
    vehicle_id, 
    activity, 
    start_date, 
    notes, 
    assigned_by
  ) VALUES (
    p_vehicle_id, 
    p_activity, 
    p_start_date, 
    p_notes, 
    p_assigned_by
  ) 
  RETURNING id INTO v_new_assignment_id;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'closed_assignment_id', v_old_assignment_id,
    'new_assignment_id', v_new_assignment_id,
    'vehicle_id', p_vehicle_id,
    'activity', p_activity
  );
  
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, tout est rollback automatiquement par PostgreSQL
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire sur la fonction
COMMENT ON FUNCTION assign_vehicle_activity_atomic IS 
'Assigne une nouvelle activité à un véhicule de manière atomique.
Clôture automatiquement l''ancienne activité (end_date) et crée la nouvelle.
Rollback automatique en cas d''erreur (transaction PostgreSQL).';

-- Accès RLS à la fonction (uniquement pour les rôles autorisés)
GRANT EXECUTE ON FUNCTION assign_vehicle_activity_atomic TO authenticated;

-- =============================================================================
-- ÉTAPE 2: EXTINCTEURS (Obligatoires pour tous les PL - Code des transports)
-- =============================================================================

INSERT INTO compliance_rules (
  activity, 
  document_code, 
  document_name, 
  frequency_months, 
  is_mandatory, 
  requires_equipment,
  equipment_list, 
  applicable_vehicle_types, 
  reminder_days
) VALUES
-- Marchandises générales (PL uniquement, pas les VL)
('MARCHANDISES_GENERALES', 'EXTINCTEURS', 'Contrôle extincteurs homologués', 12, true, true,
 ARRAY['Extincteur 6kg CO2 cabine', 'Extincteur 6kg poudre ABC cellule'], 
 ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30),

-- Frigorifique (équipement spécifique risque électrique)
('FRIGORIFIQUE', 'EXTINCTEURS', 'Contrôle extincteurs frigo', 12, true, true,
 ARRAY['Extincteur 6kg CO2 cabine', 'Extincteur spécial électrique cellule'], 
 ARRAY['POIDS_LOURD_FRIGO', 'REMORQUE_FRIGO'], 30),

-- ADR Colis (extincteurs adaptés aux matières dangereuses)
('ADR_COLIS', 'EXTINCTEURS_ADR', 'Extincteurs ADR spécifiques', 12, true, true,
 ARRAY['Extincteur 6kg poudre ABC cabine', 'Extincteur selon classe ADR transportée', 'Couverture anti-feu'], 
 NULL, 30),

-- ADR Citerne (capacité accrue pour citernes)
('ADR_CITERNE', 'EXTINCTEURS_CITERNE', 'Extincteurs citerne ADR', 12, true, true,
 ARRAY['Extincteur 12kg poudre ABC', 'Lance monitors', 'Couverture anti-feu citerne'], 
 NULL, 30),

-- Convoi exceptionnel (volume important)
('CONVOI_EXCEPTIONNEL', 'EXTINCTEURS', 'Extincteurs convoi', 12, true, true,
 ARRAY['Extincteur 6kg cabine', 'Extincteur 12kg convoi'], 
 ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30),

-- Benne TP (environnement poussiéreux)
('BENNE_TRAVAUX_PUBLICS', 'EXTINCTEURS', 'Extincteurs TP', 12, true, true,
 ARRAY['Extincteur 6kg cabine', 'Extincteur 12kg benne'], 
 ARRAY['POIDS_LOURD'], 30),

-- Animaux vivants (accès extérieur obligatoire)
('ANIMAUX_VIVANTS', 'EXTINCTEURS', 'Extincteurs bétaillère', 12, true, true,
 ARRAY['Extincteur 6kg cabine', 'Extincteur accessible extérieur'], 
 ARRAY['POIDS_LOURD'], 30)

ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  requires_equipment = EXCLUDED.requires_equipment,
  equipment_list = EXCLUDED.equipment_list,
  applicable_vehicle_types = EXCLUDED.applicable_vehicle_types,
  reminder_days = EXCLUDED.reminder_days;

-- =============================================================================
-- ÉTAPE 3: TSVR (Taxe Spéciale Véhicules Routiers) - Tous les PL > 3,5t
-- =============================================================================

INSERT INTO compliance_rules (
  activity, 
  document_code, 
  document_name, 
  frequency_months, 
  is_mandatory, 
  requires_equipment,
  equipment_list,
  applicable_vehicle_types, 
  reminder_days
) VALUES
('MARCHANDISES_GENERALES', 'TSVR', 'Attestation TSVR/CV à jour', 12, true, false, null,
 ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 15),

('FRIGORIFIQUE', 'TSVR', 'Attestation TSVR à jour', 12, true, false, null,
 ARRAY['POIDS_LOURD_FRIGO'], 15),

('ADR_COLIS', 'TSVR', 'Attestation TSVR ADR', 12, true, false, null,
 NULL, 15),

('ADR_CITERNE', 'TSVR', 'Attestation TSVR citerne', 12, true, false, null,
 NULL, 15),

('CONVOI_EXCEPTIONNEL', 'TSVR', 'Attestation TSVR convoi', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 15),

('BENNE_TRAVAUX_PUBLICS', 'TSVR', 'Attestation TSVR', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 15),

('ANIMAUX_VIVANTS', 'TSVR', 'Attestation TSVR', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 15)

ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  reminder_days = EXCLUDED.reminder_days;

-- =============================================================================
-- ÉTAPE 4: LIMITEUR DE VITESSE (Distinct du tachygraphe - Directive 92/6/CEE)
-- =============================================================================

INSERT INTO compliance_rules (
  activity, 
  document_code, 
  document_name, 
  frequency_months, 
  is_mandatory, 
  requires_equipment,
  equipment_list,
  applicable_vehicle_types, 
  reminder_days
) VALUES
('MARCHANDISES_GENERALES', 'LIMITEUR', 'Contrôle limiteur de vitesse', 12, true, false, null,
 ARRAY['POIDS_LOURD', 'TRACTEUR_ROUTIER'], 30),

('FRIGORIFIQUE', 'LIMITEUR', 'Contrôle limiteur', 12, true, false, null,
 ARRAY['POIDS_LOURD_FRIGO'], 30),

('ADR_COLIS', 'LIMITEUR', 'Contrôle limiteur ADR', 12, true, false, null,
 NULL, 30),

('ADR_CITERNE', 'LIMITEUR', 'Contrôle limiteur citerne', 12, true, false, null,
 NULL, 30),

('CONVOI_EXCEPTIONNEL', 'LIMITEUR', 'Contrôle limiteur convoi', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 30),

('BENNE_TRAVAUX_PUBLICS', 'LIMITEUR', 'Contrôle limiteur', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 30),

('ANIMAUX_VIVANTS', 'LIMITEUR', 'Contrôle limiteur', 12, true, false, null,
 ARRAY['POIDS_LOURD'], 30)

ON CONFLICT (activity, document_code) DO UPDATE SET
  document_name = EXCLUDED.document_name,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  reminder_days = EXCLUDED.reminder_days;

-- =============================================================================
-- ÉTAPE 5: Vérification finale
-- =============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION P0 CRITICAL FIX TERMINÉE';
  RAISE NOTICE '========================================';
  
  -- Compter les règles par activité
  FOR v_count IN 
    SELECT COUNT(*)::int 
    FROM compliance_rules 
    GROUP BY activity 
    ORDER BY activity
  LOOP
    RAISE NOTICE '  - % règles', v_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Nouvelles règles ajoutées:';
  RAISE NOTICE '  - EXTINCTEURS: 7 règles (toutes activités PL)';
  RAISE NOTICE '  - TSVR: 7 règles (tous PL > 3,5t)';
  RAISE NOTICE '  - LIMITEUR: 7 règles (distinct du tachy)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonction RPC créée:';
  RAISE NOTICE '  - assign_vehicle_activity_atomic() : Transaction atomique';
  RAISE NOTICE '========================================';
END $$;
