-- =====================================================
-- FIX: Modifier la clé étrangère maintenance_records.requested_by
-- Pour pointer vers profiles au lieu de users
-- =====================================================

-- 1. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE maintenance_records
DROP CONSTRAINT IF EXISTS maintenance_records_requested_by_fkey;

-- 2. Ajouter la nouvelle contrainte vers profiles
ALTER TABLE maintenance_records
ADD CONSTRAINT maintenance_records_requested_by_fkey
FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Vérifier que la contrainte a été créée
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'maintenance_records'
AND kcu.column_name = 'requested_by';

SELECT 'Contrainte mise à jour: maintenance_records.requested_by -> profiles(id)' as status;
