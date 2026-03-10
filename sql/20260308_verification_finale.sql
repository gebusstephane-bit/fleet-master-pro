-- ============================================================
-- VÉRIFICATION FINALE : État des règles après mise à jour
-- ============================================================

-- 1. Vérifier les 6 règles modifiées
SELECT 
    'RÈGLES MODIFIÉES' as statut,
    name,
    interval_km,
    interval_months,
    CASE 
        WHEN name = 'Vidange moteur — Poids Lourd' AND interval_km = 60000 AND interval_months = 12 THEN '✅ OK'
        WHEN name = 'Freins — Poids Lourd' AND interval_km = 60000 THEN '✅ OK'
        WHEN name = 'Liquide de refroidissement — Poids Lourd' AND interval_km = 400000 AND interval_months = 60 THEN '✅ OK'
        WHEN name = 'Soufflets suspension pneumatique — Poids Lourd' AND interval_km = 60000 THEN '✅ OK'
        WHEN name = 'Vidange moteur — PL Frigorifique (châssis)' AND interval_km = 60000 THEN '✅ OK'
        WHEN name = 'Freins — PL Frigorifique (châssis)' AND interval_km = 60000 THEN '✅ OK'
        ELSE '⚠️ À VÉRIFIER'
    END as verification
FROM maintenance_rules
WHERE is_system_rule = true
AND (
    name IN (
        'Vidange moteur — Poids Lourd',
        'Freins — Poids Lourd',
        'Liquide de refroidissement — Poids Lourd',
        'Soufflets suspension pneumatique — Poids Lourd',
        'Vidange moteur — PL Frigorifique (châssis)',
        'Freins — PL Frigorifique (châssis)'
    )
)
ORDER BY name;

-- 2. Vérifier les suppressions (ces 2 règles ne doivent PLUS exister)
SELECT 
    'RÈGLES SUPPRIMÉES' as statut,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Supprimées correctement'
        ELSE '❌ Encore présentes : ' || COUNT(*)::text
    END as verification
FROM maintenance_rules
WHERE is_system_rule = true
AND (
    name = 'Graissage cinquième roue / pivot d''attelage'
    OR name = 'Graissage béquilles / train d''atterrissage — Semi-remorque'
)
AND applicable_vehicle_types = ARRAY['POIDS_LOURD'];

-- 3. Nombre total de règles actives par type
SELECT 
    'TOTAL RÈGLES ACTIVES' as statut,
    applicable_vehicle_types[1] as type_vehicule,
    COUNT(*) as nb_regles
FROM maintenance_rules
WHERE is_system_rule = true
AND is_active = true
GROUP BY applicable_vehicle_types[1]
ORDER BY applicable_vehicle_types[1];
