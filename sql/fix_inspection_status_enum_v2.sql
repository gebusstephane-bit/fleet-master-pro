-- ============================================
-- FIX: Ajouter les valeurs manquantes à l'enum inspection_status
-- ============================================

-- Vérifier et ajouter les valeurs manquantes à l'enum
DO $$
BEGIN
  -- Ajouter CRITICAL_ISSUES si pas présent
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'inspection_status'::regtype 
    AND enumlabel = 'CRITICAL_ISSUES'
  ) THEN
    ALTER TYPE inspection_status ADD VALUE 'CRITICAL_ISSUES';
  END IF;

  -- Ajouter ISSUES_FOUND si pas présent
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'inspection_status'::regtype 
    AND enumlabel = 'ISSUES_FOUND'
  ) THEN
    ALTER TYPE inspection_status ADD VALUE 'ISSUES_FOUND';
  END IF;

  -- Ajouter REFUSEE si pas présent
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'inspection_status'::regtype 
    AND enumlabel = 'REFUSEE'
  ) THEN
    ALTER TYPE inspection_status ADD VALUE 'REFUSEE';
  END IF;

  -- Ajouter VALIDATED si pas présent
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'inspection_status'::regtype 
    AND enumlabel = 'VALIDATED'
  ) THEN
    ALTER TYPE inspection_status ADD VALUE 'VALIDATED';
  END IF;
END $$;

-- Vérifier les valeurs de l'enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'inspection_status'::regtype
ORDER BY enumsortorder;
