-- ============================================================================
-- FIX: Aligner les valeurs de status avec la contrainte CHECK existante
-- ============================================================================

-- 1. D'abord, voir quelles sont les valeurs actuelles en DB
SELECT DISTINCT status, COUNT(*) 
FROM maintenance_records 
GROUP BY status;

-- 2. Voir la définition de la contrainte
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'maintenance_records'::regclass
AND contype = 'c'
AND conname LIKE '%status%';

-- 3. Si la contrainte existe avec d'autres valeurs, on peut soit :
--    A) Modifier la contrainte pour accepter les nouvelles valeurs
--    B) Utiliser les valeurs existantes dans le code

-- Option A: Modifier la contrainte (à décommenter si nécessaire)
-- ALTER TABLE maintenance_records 
-- DROP CONSTRAINT IF EXISTS maintenance_records_status_check;

-- ALTER TABLE maintenance_records 
-- ADD CONSTRAINT maintenance_records_status_check 
-- CHECK (status IN ('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
