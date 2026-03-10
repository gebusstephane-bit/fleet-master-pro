-- ============================================================
-- MISE À JOUR : Intervalles PL et PL Frigo selon tableau réaliste
-- ATTENTION : Ce script met à jour les règles EXISTANTES (pas de doublons)
-- et supprime 2 règles obsolètes
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : SUPPRESSION DES 2 RÈGLES OBSOLÈTES
-- ============================================================
-- Note : Les prédictions liées à ces règles seront nettoyées automatiquement
-- car on a une contrainte ON DELETE CASCADE sur maintenance_predictions.rule_id

-- Supprimer "Graissage cinquième roue / pivot d'attelage" (PL Standard uniquement)
DELETE FROM maintenance_rules
WHERE is_system_rule = true
AND name = 'Graissage cinquième roue / pivot d''attelage'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- Supprimer "Graissage béquilles / train d'atterrissage" (PL Standard uniquement)
DELETE FROM maintenance_rules
WHERE is_system_rule = true
AND name = 'Graissage béquilles / train d''atterrissage — Semi-remorque'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- Note : Les règles équivalentes pour PL Frigo et Remorques sont conservées
-- car elles ont des intervalles différents et des applicable_vehicle_types différents

-- ============================================================
-- ÉTAPE 2 : MISE À JOUR POIDS LOURD (PL Standard)
-- ============================================================

-- 2.1 Vidange moteur : 80 000 km / 18 mois → 60 000 km / 12 mois
UPDATE maintenance_rules
SET interval_km = 60000,
    interval_months = 12,
    alert_km_before = 3000,
    description = 'Huile moteur + filtre à huile. Intervalle réaliste flotte : 60 000 km ou 12 mois. ' ||
                  'Porteur régional : 50 000 km. Usage intensif ville : 30 000 km. ' ||
                  'Source : Renault Trucks, Volvo FH, Mercedes Actros.',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Vidange moteur — Poids Lourd'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- 2.2 Freins : 100 000 km → 60 000 km (contrôle plus fréquent)
UPDATE maintenance_rules
SET interval_km = 60000,
    alert_km_before = 3000,
    description = 'Contrôle garnitures, disques/tambours, ABS, EBS. ' ||
                  'Intervalle réaliste : contrôle tous les 60 000 km, remplacement 120-150 000 km max. ' ||
                  'Porteur régional : usure plus rapide. Tracteur longue distance : 100-150 000 km.',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Freins — Poids Lourd'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- 2.3 Liquide refroidissement : 200 000 km / 24 mois → 400 000 km / 60 mois (48-60 mois)
UPDATE maintenance_rules
SET interval_km = 400000,
    interval_months = 60,
    alert_km_before = 10000,
    description = 'Remplacement liquide refroidissement (LLC Long Life Coolant). ' ||
                  'Intervalle réaliste PL : 400 000 km ou 60 mois (5 ans). ' ||
                  'Vérification pH et concentration antigel annuelle.',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Liquide de refroidissement — Poids Lourd'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- 2.4 Soufflets suspension : 100 000 km → 60 000 km
UPDATE maintenance_rules
SET interval_km = 60000,
    alert_km_before = 3000,
    description = 'Inspection fuites et fissures soufflets suspension pneumatique. ' ||
                  'Intervalle réaliste : contrôle à chaque grosse révision (60 000 km). ' ||
                  'Roulement de moyeux : contrôle jeu axial.',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Soufflets suspension pneumatique — Poids Lourd'
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- ============================================================
-- ÉTAPE 3 : MISE À JOUR POIDS LOURD FRIGO (Châssis)
-- ============================================================

-- 3.1 Vidange moteur châssis : 80 000 km / 18 mois → 60 000 km / 12 mois
UPDATE maintenance_rules
SET interval_km = 60000,
    interval_months = 12,
    alert_km_before = 3000,
    description = 'Huile moteur + filtre châssis. Identique PL standard. ' ||
                  'Intervalle réaliste : 60 000 km ou 12 mois (moteur tracteur).',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Vidange moteur — PL Frigorifique (châssis)';

-- 3.2 Freins châssis : 100 000 km → 60 000 km
UPDATE maintenance_rules
SET interval_km = 60000,
    alert_km_before = 3000,
    description = 'Contrôle freins châssis frigo. Intervalle réaliste : contrôle 60 000 km, ' ||
                  'remplacement garnitures 120-150 000 km max.',
    updated_at = NOW()
WHERE is_system_rule = true
AND name = 'Freins — PL Frigorifique (châssis)';

-- ============================================================
-- ÉTAPE 4 : VÉRIFICATION DES MODIFICATIONS
-- ============================================================
DO $$
DECLARE
    v_vidange_pl INTEGER;
    v_freins_pl INTEGER;
    v_liquide_pl INTEGER;
    v_soufflets_pl INTEGER;
    v_vidange_frigo INTEGER;
    v_freins_frigo INTEGER;
    v_supprimees INTEGER;
BEGIN
    -- Compter les mises à jour
    SELECT interval_km INTO v_vidange_pl FROM maintenance_rules 
    WHERE name = 'Vidange moteur — Poids Lourd' AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];
    
    SELECT interval_km INTO v_freins_pl FROM maintenance_rules 
    WHERE name = 'Freins — Poids Lourd' AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];
    
    SELECT interval_months INTO v_liquide_pl FROM maintenance_rules 
    WHERE name = 'Liquide de refroidissement — Poids Lourd' AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];
    
    SELECT interval_km INTO v_soufflets_pl FROM maintenance_rules 
    WHERE name = 'Soufflets suspension pneumatique — Poids Lourd' AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];
    
    SELECT interval_km INTO v_vidange_frigo FROM maintenance_rules 
    WHERE name = 'Vidange moteur — PL Frigorifique (châssis)';
    
    SELECT interval_km INTO v_freins_frigo FROM maintenance_rules 
    WHERE name = 'Freins — PL Frigorifique (châssis)';
    
    -- Vérifier suppressions
    SELECT COUNT(*) INTO v_supprimees FROM maintenance_rules 
    WHERE is_system_rule = true 
    AND (name ILIKE '%Graissage cinquième roue%' OR name ILIKE '%Graissage béquilles%');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RÉSULTAT DES MISES À JOUR';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PL Standard :';
    RAISE NOTICE '  - Vidange moteur : % km', v_vidange_pl;
    RAISE NOTICE '  - Freins : % km', v_freins_pl;
    RAISE NOTICE '  - Liquide refroidissement : % mois', v_liquide_pl;
    RAISE NOTICE '  - Soufflets suspension : % km', v_soufflets_pl;
    RAISE NOTICE 'PL Frigo :';
    RAISE NOTICE '  - Vidange moteur (châssis) : % km', v_vidange_frigo;
    RAISE NOTICE '  - Freins (châssis) : % km', v_freins_frigo;
    RAISE NOTICE 'Règles supprimées : % (doit être 0)', v_supprimees;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- ÉTAPE 5 : NETTOYAGE DES PRÉDICTIONS ORPHELINES (facultatif)
-- Si vous voulez recalculer toutes les prédictions après modification :
-- ============================================================
-- NOTE : Les prédictions liées aux règles supprimées sont déjà nettoyées par CASCADE
-- Les prédictions des règles modifiées vont se recalculer automatiquement au prochain 
-- calcul (ouverture fiche véhicule ou cron quotidien)

-- Optionnel : Marquer les prédictions modifiées comme à recalculer
-- UPDATE maintenance_predictions SET calculated_at = NULL 
-- WHERE rule_id IN (
--     SELECT id FROM maintenance_rules 
--     WHERE updated_at > NOW() - INTERVAL '1 hour'
-- );
