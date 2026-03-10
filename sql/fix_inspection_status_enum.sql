-- ============================================
-- FIX: Créer l'enum inspection_status et l'appliquer
-- ============================================

-- Étape 1: Créer le type enum avec TOUTES les valeurs possibles
CREATE TYPE inspection_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'CRITICAL_ISSUES',
  'ISSUES_FOUND',
  'REFUSEE',
  'VALIDATED'
);

-- Étape 2: Convertir la colonne status en utilisant l'enum
-- D'abord, s'assurer qu'il n'y a pas de valeurs NULL
UPDATE vehicle_inspections 
SET status = 'PENDING' 
WHERE status IS NULL;

-- Puis convertir en enum
ALTER TABLE vehicle_inspections 
ALTER COLUMN status TYPE inspection_status 
USING status::inspection_status;

-- Étape 3: Définir une valeur par défaut
ALTER TABLE vehicle_inspections 
ALTER COLUMN status SET DEFAULT 'PENDING';

-- Vérification
SELECT 
  'Table vehicle_inspections:' as info,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections' AND column_name = 'status';
