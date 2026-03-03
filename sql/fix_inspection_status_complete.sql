-- ============================================
-- FIX COMPLET: Enum inspection_status + conversion colonne
-- ============================================

-- Étape 1: Créer le type enum s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE inspection_status AS ENUM (
      'PENDING',
      'COMPLETED',
      'CRITICAL_ISSUES',
      'ISSUES_FOUND',
      'REFUSEE',
      'VALIDATED'
    );
  END IF;
END $$;

-- Étape 2: Ajouter les valeurs manquantes si l'enum existe déjà
DO $$
DECLARE
  v_enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') INTO v_enum_exists;
  
  IF v_enum_exists THEN
    -- Ajouter CRITICAL_ISSUES
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'inspection_status'::regtype AND enumlabel = 'CRITICAL_ISSUES') THEN
      ALTER TYPE inspection_status ADD VALUE 'CRITICAL_ISSUES';
    END IF;
    
    -- Ajouter ISSUES_FOUND
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'inspection_status'::regtype AND enumlabel = 'ISSUES_FOUND') THEN
      ALTER TYPE inspection_status ADD VALUE 'ISSUES_FOUND';
    END IF;
    
    -- Ajouter REFUSEE
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'inspection_status'::regtype AND enumlabel = 'REFUSEE') THEN
      ALTER TYPE inspection_status ADD VALUE 'REFUSEE';
    END IF;
    
    -- Ajouter VALIDATED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'inspection_status'::regtype AND enumlabel = 'VALIDATED') THEN
      ALTER TYPE inspection_status ADD VALUE 'VALIDATED';
    END IF;
  END IF;
END $$;

-- Étape 3: Vérifier le type actuel de la colonne status
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'vehicle_inspections' AND column_name = 'status';
  
  -- Si c'est du text, convertir en enum
  IF v_data_type = 'text' OR v_data_type = 'character varying' THEN
    -- Mettre à jour les valeurs qui ne sont pas dans l'enum
    UPDATE vehicle_inspections 
    SET status = 'PENDING'
    WHERE status NOT IN ('PENDING', 'COMPLETED', 'CRITICAL_ISSUES', 'ISSUES_FOUND', 'REFUSEE', 'VALIDATED');
    
    -- Convertir la colonne
    ALTER TABLE vehicle_inspections 
    ALTER COLUMN status TYPE inspection_status 
    USING status::inspection_status;
    
    RAISE NOTICE 'Colonne status convertie en inspection_status';
  END IF;
END $$;

-- Étape 4: Définir la valeur par défaut
ALTER TABLE vehicle_inspections 
ALTER COLUMN status SET DEFAULT 'PENDING';

-- Vérification finale
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections' AND column_name = 'status';
