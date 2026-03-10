-- =============================================================================
-- VERSION SIMPLE: Passer Frigorifique en activité principale
-- Copier-coller dans Supabase SQL Editor et exécuter
-- =============================================================================

-- Trouve automatiquement ton entreprise et fait le changement
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Trouver l'entreprise (modifie cette ligne si besoin)
  SELECT c.id INTO v_company_id
  FROM companies c
  WHERE c.name ILIKE '%stephane%'
  LIMIT 1;
  
  -- Si pas trouvé avec "stephane", prendre la première entreprise
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM companies LIMIT 1;
  END IF;
  
  -- Afficher ce qu'on va faire
  RAISE NOTICE 'Entreprise: %', v_company_id;
  
  -- 1. Tout passer en secondaire d'abord (sécurité)
  UPDATE company_activities
  SET is_primary = false
  WHERE company_id = v_company_id;
  
  -- 2. Passer Frigorifique en principale
  UPDATE company_activities
  SET is_primary = true
  WHERE company_id = v_company_id
    AND activity = 'FRIGORIFIQUE';
  
  -- Vérification
  RAISE NOTICE 'Nouvelle configuration:';
  FOR rec IN 
    SELECT activity, is_primary 
    FROM company_activities 
    WHERE company_id = v_company_id
  LOOP
    RAISE NOTICE '% - %', 
      rec.activity, 
      CASE WHEN rec.is_primary THEN 'PRINCIPALE' ELSE 'secondaire' END;
  END LOOP;
  
END $$;

-- Message de confirmation
SELECT '✓ Frigorifique est maintenant l activité principale' as result;
