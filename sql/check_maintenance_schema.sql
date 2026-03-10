-- ============================================================
-- SQL pour analyser la structure réelle de maintenance_records
-- ============================================================

-- 1. Liste des colonnes réelles de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'maintenance_records'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes et clés étrangères
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'maintenance_records';

-- 3. Vérifier les index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'maintenance_records';

-- 4. Vérifier les triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_records';
