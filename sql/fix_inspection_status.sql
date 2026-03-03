-- ============================================
-- FIX: Corriger le type de la colonne status
-- ============================================

-- Option 1: Si l'enum inspection_status existe, l'alterer pour accepter les nouvelles valeurs
-- Option 2: Convertir en text pour plus de flexibilité

-- Vérifier si l'enum existe
DO $$
BEGIN
  -- Supprimer la contrainte d'enum si elle existe et convertir en text
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'inspection_status'
  ) THEN
    -- Convertir la colonne en text
    ALTER TABLE vehicle_inspections 
    ALTER COLUMN status TYPE TEXT 
    USING status::TEXT;
    
    RAISE NOTICE 'Colonne status convertie en TEXT';
  ELSE
    -- Vérifier si status existe et est contraint
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicle_inspections' AND column_name = 'status'
    ) THEN
      -- S'assurer que c'est du texte
      ALTER TABLE vehicle_inspections 
      ALTER COLUMN status TYPE TEXT;
      
      RAISE NOTICE 'Colonne status définie comme TEXT';
    END IF;
  END IF;
END $$;

-- Définir une valeur par défaut si nécessaire
ALTER TABLE vehicle_inspections 
ALTER COLUMN status SET DEFAULT 'PENDING';

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections' AND column_name = 'status';
