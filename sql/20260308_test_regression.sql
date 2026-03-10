-- ============================================================
-- TEST DE NON-RÉGRESSION - Maintenance Remorques
-- À exécuter AVANT et APRÈS la migration
-- ============================================================

-- ============================================================
-- PARTIE A : BASELINE AVANT MIGRATION
-- Sauvegarder ces résultats avant de migrer
-- ============================================================

-- A1. Nombre de remorques par detailed_type
SELECT 'A1-REMORQUES_PAR_TYPE' as test,
       COALESCE(detailed_type, 'NULL (anciennes)') as detailed_type,
       COUNT(*) as count
FROM vehicles 
WHERE type IN ('REMORQUE', 'REMORQUE_FRIGO')
GROUP BY detailed_type
ORDER BY detailed_type;

-- A2. Nombre de prédictions existantes par type de remorque
SELECT 'A2-PREDICTIONS_TOTAL' as test,
       COUNT(*) as total_predictions,
       COUNT(DISTINCT mp.vehicle_id) as vehicles_with_predictions
FROM maintenance_predictions mp
JOIN vehicles v ON mp.vehicle_id = v.id
WHERE v.type IN ('REMORQUE', 'REMORQUE_FRIGO');

-- A3. Exemple concret : Remorque FB-245-DG (si existe)
SELECT 'A3-EXEMPLE_FB-245-DG' as test,
       id,
       registration_number,
       type,
       detailed_type,
       mileage
FROM vehicles
WHERE registration_number ILIKE '%FB-245-DG%'
UNION ALL
SELECT 'A3-EXEMPLE_PREMIERE_REMORQUE_FRIGO' as test,
       id,
       registration_number,
       type,
       detailed_type,
       mileage
FROM vehicles
WHERE type = 'REMORQUE_FRIGO'
LIMIT 1;

-- A4. Règles actuellement actives pour REMORQUE_FRIGO
SELECT 'A4-REGLES_FRIGO_ACTIVES' as test,
       id,
       name,
       applicable_vehicle_types,
       is_active
FROM maintenance_rules
WHERE applicable_vehicle_types @> ARRAY['REMORQUE_FRIGO']
AND is_system_rule = true;

-- ============================================================
-- PARTIE B : VÉRIFICATION APRÈS MIGRATION
-- À exécuter après la migration pour valider
-- ============================================================

-- B1. Nouvelles règles créées
SELECT 'B1-NOUVELLES_REGLES' as test,
       COUNT(*) as new_rules_count,
       category,
       applicable_vehicle_types
FROM maintenance_rules
WHERE is_system_rule = true
AND created_at >= '2026-03-08'::date
GROUP BY category, applicable_vehicle_types
ORDER BY applicable_vehicle_types, category;

-- B2. Prédictions pour 3 remorques existantes (comparer avec A2)
WITH three_trailers AS (
    SELECT id, registration_number, detailed_type
    FROM vehicles
    WHERE type IN ('REMORQUE', 'REMORQUE_FRIGO')
    AND detailed_type IS NOT NULL
    LIMIT 3
)
SELECT 'B2-PREDICTIONS_PAR_REMORQUE' as test,
       t.registration_number,
       t.detailed_type,
       COUNT(mp.id) as prediction_count,
       STRING_AGG(DISTINCT mr.category, ', ' ORDER BY mr.category) as categories
FROM three_trailers t
LEFT JOIN maintenance_predictions mp ON mp.vehicle_id = t.id
LEFT JOIN maintenance_rules mr ON mp.rule_id = mr.id
GROUP BY t.registration_number, t.detailed_type
ORDER BY t.registration_number;

-- B3. Comparaison nombre prédictions (doit être >= qu'avant)
SELECT 'B3-COMPARAISON_GLOBALE' as test,
       COUNT(*) as total_predictions_now,
       COUNT(DISTINCT mp.vehicle_id) as vehicles_with_predictions_now
FROM maintenance_predictions mp
JOIN vehicles v ON mp.vehicle_id = v.id
WHERE v.type IN ('REMORQUE', 'REMORQUE_FRIGO');

-- B4. Vérification pas de règles génériques REMORQUE_FRIGO actives (si on les a désactivées)
SELECT 'B4-REGLES_FRIGO_GENERIQUES' as test,
       COUNT(*) as count_generiques_actives
FROM maintenance_rules
WHERE applicable_vehicle_types = ARRAY['REMORQUE_FRIGO']
AND is_system_rule = true
AND is_active = true;

-- B5. Validation règles spécifiques actives
SELECT 'B5-REGLES_SPECIFIQUES_ACTIVES' as test,
       COUNT(*) as count_specifiques_actives,
       (SELECT COUNT(*) FROM maintenance_rules 
        WHERE applicable_vehicle_types @> ARRAY['REMORQUE_TAUTLINER'] AND is_active = true) as tautliner,
       (SELECT COUNT(*) FROM maintenance_rules 
        WHERE applicable_vehicle_types @> ARRAY['REMORQUE_FOURGON'] AND is_active = true) as fourgon,
       (SELECT COUNT(*) FROM maintenance_rules 
        WHERE applicable_vehicle_types @> ARRAY['REMORQUE_FRIGO_MONO'] AND is_active = true) as frigo_mono
FROM maintenance_rules
WHERE is_system_rule = true
AND applicable_vehicle_types && ARRAY[
    'REMORQUE_TAUTLINER', 'REMORQUE_FOURGON', 'REMORQUE_PLATEAU',
    'REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP', 'REMORQUE_PORTE_CONTENEUR',
    'REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'
]
AND is_active = true;

-- ============================================================
-- CRITÈRES DE SUCCÈS
-- ============================================================
-- ✅ B3.total_predictions_now >= A2.total_predictions (jamais inférieur)
-- ✅ B4.count_generiques_actives = 0 (anciennes règles désactivées)
-- ✅ B5.count_specifiques_actives >= 50 (toutes les nouvelles règles créées)
-- ✅ Pas d'erreurs dans les logs d'exécution
-- ============================================================
