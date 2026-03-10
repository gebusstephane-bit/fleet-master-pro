-- Vérifier les valeurs autorisées par la contrainte CHECK sur status
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'maintenance_records'::regclass
AND contype = 'c';

-- Alternative: voir toutes les contraintes de la table
SELECT *
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%maintenance_records%';
