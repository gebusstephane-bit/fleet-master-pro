-- ============================================================
-- SUPPRESSION : Règles de graissage pour PL Frigo
-- ============================================================

-- Supprimer "Graissage cinquième roue / pivot — PL Frigorifique"
DELETE FROM maintenance_rules
WHERE is_system_rule = true
AND name = 'Graissage cinquième roue / pivot — PL Frigorifique'
AND applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO'];

-- Vérification
SELECT 
    'RÈGLES GRAISSAGE PL FRIGO RESTANTES' as statut,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Toutes supprimées'
        ELSE '❌ Encore ' || COUNT(*)::text || ' règle(s)'
    END as resultat
FROM maintenance_rules
WHERE is_system_rule = true
AND (
    name ILIKE '%graissage%cinquième%'
    OR name ILIKE '%graissage%5e%'
    OR name ILIKE '%graissage%pivot%'
)
AND applicable_vehicle_types @> ARRAY['POIDS_LOURD_FRIGO'];
