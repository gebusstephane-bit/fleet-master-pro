-- ============================================================================
-- FIX: Corriger les company_id des fuel_records
-- ============================================================================

-- 1. Voir combien de records ont un company_id NULL ou incorrect
SELECT 
  'Records avec company_id NULL' as description,
  COUNT(*) as count
FROM fuel_records 
WHERE company_id IS NULL

UNION ALL

SELECT 
  'Records avec company_id différent du véhicule' as description,
  COUNT(*) as count
FROM fuel_records fr
JOIN vehicles v ON fr.vehicle_id = v.id
WHERE fr.company_id != v.company_id;

-- 2. Corriger les company_id NULL ou incorrects
UPDATE fuel_records fr
SET company_id = v.company_id
FROM vehicles v
WHERE fr.vehicle_id = v.id
AND (fr.company_id IS NULL OR fr.company_id != v.company_id);

-- 3. Vérifier le résultat
SELECT 
  'Records corrigés' as status,
  COUNT(*) as count
FROM fuel_records fr
JOIN vehicles v ON fr.vehicle_id = v.id
WHERE fr.company_id = v.company_id;

-- 4. Voir les records par company_id (pour vérifier)
SELECT 
  fr.company_id,
  c.name as company_name,
  COUNT(*) as record_count
FROM fuel_records fr
JOIN companies c ON fr.company_id = c.id
GROUP BY fr.company_id, c.name
ORDER BY record_count DESC;
