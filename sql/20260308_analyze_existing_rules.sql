-- ============================================================
-- ANALYSE : Vérification des règles de maintenance existantes
-- POIDS_LOURD | POIDS_LOURD_FRIGO | TRACTEUR_ROUTIER
-- ============================================================

-- ============================================================
-- 1. RÈGLES POIDS LOURD (Camions/Porteurs/Tracteurs)
-- ============================================================
SELECT 
    'POIDS_LOURD' as vehicule_type,
    name as regle,
    category as categorie,
    trigger_type as declencheur,
    interval_km as intervalle_km,
    interval_months as intervalle_mois,
    alert_km_before as alerte_km,
    priority as priorite,
    CASE 
        WHEN interval_km IS NOT NULL AND interval_months IS NOT NULL 
        THEN interval_km::text || ' km / ' || interval_months::text || ' mois'
        WHEN interval_km IS NOT NULL 
        THEN interval_km::text || ' km'
        WHEN interval_months IS NOT NULL 
        THEN interval_months::text || ' mois'
        ELSE 'N/A'
    END as intervalle_complet,
    LEFT(description, 80) as description_courte
FROM maintenance_rules
WHERE applicable_vehicle_types @> ARRAY['POIDS_LOURD']
AND applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO'] = false  -- Exclure les règles frigo mixtes
AND is_system_rule = true
AND is_active = true
ORDER BY 
    CASE category 
        WHEN 'moteur' THEN 1 
        WHEN 'filtration' THEN 2
        WHEN 'freinage' THEN 3
        WHEN 'transmission' THEN 4
        WHEN 'suspension' THEN 5
        WHEN 'attelage' THEN 6
        WHEN 'electricite' THEN 7
        WHEN 'carrosserie' THEN 8
        WHEN 'pneumatique' THEN 9
        WHEN 'reglementaire' THEN 10
        ELSE 11
    END;

-- ============================================================
-- 2. RÈGLES POIDS LOURD FRIGORIFIQUE (Châssis + Groupe froid)
-- ============================================================
SELECT 
    'POIDS_LOURD_FRIGO' as vehicule_type,
    name as regle,
    category as categorie,
    trigger_type as declencheur,
    interval_km as intervalle_km,
    interval_months as intervalle_mois,
    alert_km_before as alerte_km,
    priority as priorite,
    CASE 
        WHEN interval_km IS NOT NULL AND interval_months IS NOT NULL 
        THEN interval_km::text || ' km / ' || interval_months::text || ' mois'
        WHEN interval_km IS NOT NULL 
        THEN interval_km::text || ' km'
        WHEN interval_months IS NOT NULL 
        THEN interval_months::text || ' mois'
        ELSE 'N/A'
    END as intervalle_complet,
    LEFT(description, 80) as description_courte
FROM maintenance_rules
WHERE applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO']
AND is_system_rule = true
AND is_active = true
ORDER BY 
    CASE 
        WHEN category = 'refrigeration' THEN 1
        WHEN category = 'reglementaire' THEN 2
        ELSE 3
    END,
    name;

-- ============================================================
-- 3. RÈGLES TRACTEUR ROUTIER (spécifiques ou héritées)
-- ============================================================
-- Note : Les tracteurs routiers sont souvent typés POIDS_LOURD
-- Mais vérifions s'il existe des règles spécifiques TRACTEUR_ROUTIER
SELECT 
    'TRACTEUR_ROUTIER' as vehicule_type,
    name as regle,
    category as categorie,
    trigger_type as declencheur,
    interval_km as intervalle_km,
    interval_months as intervalle_mois,
    alert_km_before as alerte_km,
    priority as priorite,
    CASE 
        WHEN interval_km IS NOT NULL AND interval_months IS NOT NULL 
        THEN interval_km::text || ' km / ' || interval_months::text || ' mois'
        WHEN interval_km IS NOT NULL 
        THEN interval_km::text || ' km'
        WHEN interval_months IS NOT NULL 
        THEN interval_months::text || ' mois'
        ELSE 'N/A'
    END as intervalle_complet
FROM maintenance_rules
WHERE applicable_vehicle_types @> ARRAY['TRACTEUR_ROUTIER']
AND is_system_rule = true
AND is_active = true
ORDER BY category, name;

-- ============================================================
-- 4. SYNTHÈSE PAR CATÉGORIE (pour vérifier la cohérence)
-- ============================================================
SELECT 
    category as categorie,
    COUNT(*) as nb_regles,
    STRING_AGG(DISTINCT applicable_vehicle_types[1], ', ') as types_concernes,
    MIN(interval_km) as min_km,
    MAX(interval_km) as max_km,
    MIN(interval_months) as min_mois,
    MAX(interval_months) as max_mois
FROM maintenance_rules
WHERE is_system_rule = true
AND is_active = true
AND applicable_vehicle_types && ARRAY['POIDS_LOURD', 'POIDS_LOURD_FRIGO', 'TRACTEUR_ROUTIER']
GROUP BY category
ORDER BY nb_regles DESC;

-- ============================================================
-- 5. VÉRIFICATION : Règles manquantes par rapport aux voitures
-- ============================================================
SELECT 
    'Comparaison PL vs VOITURE' as analyse,
    (SELECT COUNT(*) FROM maintenance_rules 
     WHERE applicable_vehicle_types @> ARRAY['POIDS_LOURD'] 
     AND is_active = true) as nb_regles_pl,
    (SELECT COUNT(*) FROM maintenance_rules 
     WHERE applicable_vehicle_types @> ARRAY['VOITURE'] 
     AND is_active = true) as nb_regles_voiture,
    (SELECT COUNT(*) FROM maintenance_rules 
     WHERE applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO'] 
     AND is_active = true) as nb_regles_pl_frigo;
