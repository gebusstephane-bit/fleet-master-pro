-- ============================================
-- FIX: Convertir uniquement la colonne status vers l'enum
-- ============================================

-- Étape 1: Nettoyer les valeurs invalides (mettre PENDING par défaut)
UPDATE vehicle_inspections 
SET status = 'PENDING'
WHERE status IS NULL 
   OR status NOT IN ('PENDING', 'COMPLETED', 'CRITICAL_ISSUES', 'ISSUES_FOUND', 'REFUSEE', 'VALIDATED');

-- Étape 2: Convertir la colonne de TEXT vers l'enum inspection_status
ALTER TABLE vehicle_inspections 
ALTER COLUMN status TYPE inspection_status 
USING status::inspection_status;

-- Étape 3: Définir la valeur par défaut
ALTER TABLE vehicle_inspections 
ALTER COLUMN status SET DEFAULT 'PENDING';

-- Vérification
SELECT 
  'Colonne status:' as info,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections' AND column_name = 'status';
