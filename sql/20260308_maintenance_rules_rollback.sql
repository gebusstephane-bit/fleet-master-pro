-- ============================================================
-- ROLLBACK : Suppression des règles spécifiques remorques
-- FICHIER : 20260308_maintenance_rules_rollback.sql
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : Réactiver les anciennes règles génériques REMORQUE_FRIGO
-- ============================================================
UPDATE maintenance_rules
SET is_active = true,
    updated_at = NOW()
WHERE is_system_rule = true
AND applicable_vehicle_types = ARRAY['REMORQUE_FRIGO']
AND created_at < '2026-03-08';

-- ============================================================
-- ÉTAPE 2 : Supprimer les nouvelles règles créées le 2026-03-08
-- ============================================================
DELETE FROM maintenance_rules
WHERE is_system_rule = true
AND created_at >= '2026-03-08'::date
AND created_at < '2026-03-09'::date;

-- ============================================================
-- ÉTAPE 3 : Nettoyage des prédictions orphelines
-- ============================================================
DELETE FROM maintenance_predictions
WHERE rule_id NOT IN (SELECT id FROM maintenance_rules);

-- ============================================================
-- ÉTAPE 4 : Restaurer l'ancienne contrainte CHECK (optionnel)
-- Décommenter si besoin de revenir à l'état initial complet
-- ============================================================
/*
ALTER TABLE maintenance_rules DROP CONSTRAINT IF EXISTS maintenance_rules_category_check;
ALTER TABLE maintenance_rules ADD CONSTRAINT maintenance_rules_category_check 
CHECK (category IN (
    'moteur', 'filtration', 'freinage', 'transmission', 'suspension', 
    'electricite', 'carrosserie', 'refrigeration', 'attelage',
    'pneumatique', 'reglementaire', 'autre'
));
*/

-- ============================================================
-- VÉRIFICATION
-- ============================================================
DO $$
DECLARE
    v_remaining INTEGER;
    v_reactivated INTEGER;
BEGIN
    -- Vérifier qu'il ne reste pas de règles spécifiques
    SELECT COUNT(*) INTO v_remaining
    FROM maintenance_rules
    WHERE is_system_rule = true
    AND applicable_vehicle_types && ARRAY[
        'REMORQUE_TAUTLINER', 'REMORQUE_FOURGON', 'REMORQUE_PLATEAU',
        'REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP', 'REMORQUE_PORTE_CONTENEUR'
    ];
    
    -- Vérifier que les anciennes règles sont réactivées
    SELECT COUNT(*) INTO v_reactivated
    FROM maintenance_rules
    WHERE is_system_rule = true
    AND applicable_vehicle_types = ARRAY['REMORQUE_FRIGO']
    AND is_active = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK TERMINÉ';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Règles spécifiques restantes : % (doit être 0)', v_remaining;
    RAISE NOTICE 'Règles génériques réactivées : %', v_reactivated;
    RAISE NOTICE '========================================';
    
    IF v_remaining > 0 THEN
        RAISE WARNING '⚠️ % règles spécifiques non supprimées', v_remaining;
    ELSE
        RAISE NOTICE '✅ Rollback terminé avec succès';
    END IF;
END $$;
