-- ============================================================
-- FIX : Ajouter REMORQUE_FRIGO aux règles spécifiques frigo
-- Problème : Les remorques sans detailed_type n'ont plus de règles
-- Solution : Étendre applicable_vehicle_types à REMORQUE_FRIGO
-- ============================================================

-- Mettre à jour les règles frigo pour inclure REMORQUE_FRIGO (compatibilité ascendante)
UPDATE maintenance_rules
SET applicable_vehicle_types = ARRAY['REMORQUE_FRIGO', 'REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'],
    updated_at = NOW()
WHERE is_system_rule = true
AND is_active = true
AND applicable_vehicle_types @> ARRAY['REMORQUE_FRIGO_MONO']
AND created_at >= '2026-03-08'::date;

-- Vérification
SELECT 'Règles frigo mises à jour' as status,
       COUNT(*) as count
FROM maintenance_rules
WHERE is_system_rule = true
AND applicable_vehicle_types @> ARRAY['REMORQUE_FRIGO']
AND applicable_vehicle_types @> ARRAY['REMORQUE_FRIGO_MONO'];
