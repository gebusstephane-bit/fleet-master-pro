-- Corriger les driver_name NULL en les extrayant des notes
UPDATE fuel_records 
SET driver_name = SUBSTRING(notes FROM 'par (.+)$')
WHERE driver_name IS NULL 
AND notes LIKE '%par %';

-- Vérifier
SELECT notes, driver_name FROM fuel_records WHERE driver_name IS NULL;
