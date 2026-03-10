-- ============================================================================
-- Ajouter le champ driver_name à fuel_records
-- ============================================================================

-- 1. Ajouter la colonne driver_name si elle n'existe pas
ALTER TABLE fuel_records 
ADD COLUMN IF NOT EXISTS driver_name TEXT;

-- 2. Mettre à jour les enregistrements existants avec le nom extrait des notes
-- Extrait "gebus" de "Saisi via QR par gebus"
UPDATE fuel_records 
SET driver_name = SUBSTRING(notes FROM 'Saisi via QR par (.+)$')
WHERE notes LIKE 'Saisi via QR par %' 
AND driver_name IS NULL;

-- 3. Vérifier
SELECT id, driver_name, notes FROM fuel_records WHERE driver_name IS NOT NULL LIMIT 5;
