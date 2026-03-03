-- ============================================================================
-- FIX FINAL: Corriger les driver_name NULL
-- ============================================================================

-- 1. Mettre à jour les enregistrements existants
UPDATE fuel_records 
SET driver_name = SUBSTRING(notes FROM 'par (.+)$')
WHERE driver_name IS NULL 
AND notes LIKE '%par %';

-- 2. Vérifier ceux qui restent NULL
SELECT id, notes, driver_name 
FROM fuel_records 
WHERE driver_name IS NULL 
AND notes IS NOT NULL;

-- 3. Si certains ont encore NULL mais ont des notes avec "par", forcer la mise à jour
UPDATE fuel_records 
SET driver_name = TRIM(SUBSTRING(notes FROM 'par\s+(.+)$'))
WHERE driver_name IS NULL 
AND notes ~* 'par\s+';

-- 4. Statistiques finales
SELECT 
  COUNT(*) as total,
  COUNT(driver_name) as avec_nom,
  COUNT(*) - COUNT(driver_name) as sans_nom
FROM fuel_records;
