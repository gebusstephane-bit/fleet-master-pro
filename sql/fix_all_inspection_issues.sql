-- ============================================
-- FIX COMPLET: Inspection - Tous les problèmes
-- ============================================

-- 1. Ajouter inspection_date si manquante
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mettre à jour les enregistrements existants
UPDATE vehicle_inspections 
SET inspection_date = created_at 
WHERE inspection_date IS NULL;

-- 2. Corriger le type de status (enum -> text pour flexibilité)
DO $$
BEGIN
  -- Si c'est un enum, convertir en text
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'inspection_status'
  ) THEN
    ALTER TABLE vehicle_inspections 
    ALTER COLUMN status TYPE TEXT 
    USING status::TEXT;
  END IF;
END $$;

-- S'assurer que status peut être NULL ou a une valeur par défaut
ALTER TABLE vehicle_inspections 
ALTER COLUMN status DROP NOT NULL;

-- 3. Vérifier/Créer l'enum inspection_status avec les bonnes valeurs
DO $$
BEGIN
  -- Supprimer l'ancien type enum si existe
  DROP TYPE IF EXISTS inspection_status CASCADE;
  
  -- Créer le nouveau type enum avec toutes les valeurs nécessaires
  CREATE TYPE inspection_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'CRITICAL_ISSUES',
    'ISSUES_FOUND',
    'REFUSEE',
    'VALIDATED'
  );
  
  -- Convertir la colonne status en utilisant le nouvel enum
  ALTER TABLE vehicle_inspections 
  ALTER COLUMN status TYPE inspection_status 
  USING status::inspection_status;
  
EXCEPTION WHEN OTHERS THEN
  -- Si ça échoue, garder en text
  RAISE NOTICE 'Conversion enum échouée, status reste en TEXT';
END $$;

-- 4. Mettre à jour les valeurs NULL
UPDATE vehicle_inspections 
SET status = 'PENDING' 
WHERE status IS NULL;

-- 5. Vérification finale
SELECT 
  'Structure de vehicle_inspections:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
AND column_name IN ('inspection_date', 'status', 'created_at')
ORDER BY ordinal_position;
