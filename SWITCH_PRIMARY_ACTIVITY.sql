-- =============================================================================
-- SCRIPT CHIRURGICAL: Changer l'activité principale de l'entreprise
-- OBJECTIF: Passer FRIGORIFIQUE en activité principale (sans perte de données)
-- =============================================================================

-- Remplacer ce UUID par celui de votre entreprise (ou laisser comme ça si une seule entreprise)
-- Pour trouver votre company_id: SELECT id FROM companies WHERE name ILIKE '%votre nom%';
DO $$
DECLARE
  v_company_id UUID;
  v_current_primary_id UUID;
  v_frigo_id UUID;
BEGIN
  -- =============================================================================
  -- ÉTAPE 1: Identifier l'entreprise (prend la première si non spécifiée)
  -- =============================================================================
  
  -- Option 1: Si vous connaissez votre company_id, remplacez ici:
  -- v_company_id := 'votre-uuid-de-company';
  
  -- Option 2: Auto-détection (prend l'entreprise avec "transport stephane")
  SELECT c.id INTO v_company_id
  FROM companies c
  JOIN profiles p ON p.company_id = c.id
  WHERE c.name ILIKE '%transport%stephane%'
     OR c.name ILIKE '%stephane%'
  LIMIT 1;
  
  -- Si pas trouvé, prendre la première entreprise
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM companies LIMIT 1;
  END IF;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise trouvée';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Entreprise traitée: %', v_company_id;
  RAISE NOTICE '========================================';
  
  -- =============================================================================
  -- ÉTAPE 2: Vérifier les activités actuelles
  -- =============================================================================
  
  RAISE NOTICE 'Activités actuelles:';
  
  FOR rec IN 
    SELECT id, activity, is_primary 
    FROM company_activities 
    WHERE company_id = v_company_id
    ORDER BY is_primary DESC, created_at
  LOOP
    RAISE NOTICE '  - % (ID: %)', 
      rec.activity, 
      CASE WHEN rec.is_primary THEN 'PRINCIPALE' ELSE 'Secondaire' END;
    
    IF rec.is_primary THEN
      v_current_primary_id := rec.id;
    END IF;
    
    IF rec.activity = 'FRIGORIFIQUE' THEN
      v_frigo_id := rec.id;
    END IF;
  END LOOP;
  
  -- =============================================================================
  -- ÉTAPE 3: Vérifications de sécurité
  -- =============================================================================
  
  IF v_frigo_id IS NULL THEN
    RAISE EXCEPTION 'Activité FRIGORIFIQUE non trouvée pour cette entreprise. Ajoutez-la d abord dans Settings > Entreprise > Activités';
  END IF;
  
  IF v_current_primary_id = v_frigo_id THEN
    RAISE NOTICE 'FRIGORIFIQUE est déjà l activité principale. Aucune modification nécessaire.';
    RETURN;
  END IF;
  
  -- =============================================================================
  -- ÉTAPE 4: Effectuer le changement ( TRANSACTION )
  -- =============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '>>> Modification en cours...';
  
  -- 4.1: Passer l'ancienne principale en secondaire
  UPDATE company_activities
  SET is_primary = false,
      updated_at = NOW()
  WHERE id = v_current_primary_id
    AND company_id = v_company_id;
  
  RAISE NOTICE '  ✓ Ancienne activité principale passée en secondaire';
  
  -- 4.2: Passer Frigo en principale
  UPDATE company_activities
  SET is_primary = true,
      updated_at = NOW()
  WHERE id = v_frigo_id
    AND company_id = v_company_id;
  
  RAISE NOTICE '  ✓ FRIGORIFIQUE passée en activité principale';
  
  -- =============================================================================
  -- ÉTAPE 5: Vérification finale
  -- =============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE 'Activités après modification:';
  
  FOR rec IN 
    SELECT activity, is_primary 
    FROM company_activities 
    WHERE company_id = v_company_id
    ORDER BY is_primary DESC, created_at
  LOOP
    RAISE NOTICE '  - % [%]', 
      rec.activity, 
      CASE WHEN rec.is_primary THEN 'PRINCIPALE ⭐' ELSE 'Secondaire' END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MODIFICATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Rechargez la page Settings > Entreprise pour voir le changement.';
  RAISE NOTICE 'Le formulaire de véhicule affichera maintenant les types Frigorifique en premier.';
  
END $$;
