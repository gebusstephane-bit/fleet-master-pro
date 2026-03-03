-- ============================================================================
-- FIX : Correction contrainte CHECK fuel_type
-- Le formulaire envoie des valeurs anglaises (diesel, gasoline) 
-- mais la contrainte existante attend peut-être des valeurs différentes
-- ============================================================================

-- 1. Supprimer la contrainte existante si elle existe
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_records_fuel_type_check;
ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fuel_type_check;

-- 2. Créer une nouvelle contrainte avec les valeurs correspondant au TypeScript
ALTER TABLE fuel_records ADD CONSTRAINT fuel_records_fuel_type_check 
CHECK (fuel_type IN ('diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg'));

-- 3. Vérifier les valeurs existantes
SELECT DISTINCT fuel_type, COUNT(*) as count 
FROM fuel_records 
GROUP BY fuel_type;
