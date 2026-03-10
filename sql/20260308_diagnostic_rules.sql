-- ============================================================
-- DIAGNOSTIC : Vérifier les règles existantes exactes
-- ============================================================

-- 1. Lister TOUTES les règles PL standard avec leurs noms EXACTS
SELECT 
    'RÈGLES PL STANDARD' as section,
    id,
    name,
    applicable_vehicle_types,
    interval_km,
    interval_months
FROM maintenance_rules
WHERE is_system_rule = true
AND applicable_vehicle_types @> ARRAY['POIDS_LOURD']
AND NOT (applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO'])
ORDER BY name;

-- 2. Lister TOUTES les règles PL Frigo
SELECT 
    'RÈGLES PL FRIGO' as section,
    id,
    name,
    applicable_vehicle_types,
    interval_km,
    interval_months
FROM maintenance_rules
WHERE is_system_rule = true
AND applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO']
ORDER BY name;

-- 3. Chercher les règles "Graissage" pour voir les noms exacts
SELECT 
    'RÈGLES GRAISSAGE' as section,
    id,
    name,
    applicable_vehicle_types
FROM maintenance_rules
WHERE is_system_rule = true
AND (name ILIKE '%graissage%' OR name ILIKE '%5e%' OR name ILIKE '%cinquième%')
ORDER BY name;

-- 4. Vérifier si les règles ont des applicable_vehicle_types exacts ou multiples
SELECT 
    'VERIFICATION ARRAY' as section,
    name,
    applicable_vehicle_types,
    applicable_vehicle_types = ARRAY['POIDS_LOURD'] as exact_array,
    applicable_vehicle_types @> ARRAY['POIDS_LOURD'] as contains_array
FROM maintenance_rules
WHERE is_system_rule = true
AND name ILIKE '%vidange%'
ORDER BY name;
