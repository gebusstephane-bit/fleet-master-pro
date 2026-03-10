-- =====================================================
-- MIGRATION: Ajout des nouvelles valeurs à l'enum plan_type
-- =====================================================

-- PostgreSQL ne permet pas de supprimer des valeurs d'enum, 
-- mais on peut ajouter de nouvelles valeurs

-- Ajouter ESSENTIAL à l'enum plan_type s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_type' AND e.enumlabel = 'ESSENTIAL'
  ) THEN
    ALTER TYPE plan_type ADD VALUE 'ESSENTIAL' BEFORE 'STARTER';
  END IF;
END $$;

-- Ajouter UNLIMITED à l'enum plan_type s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_type' AND e.enumlabel = 'UNLIMITED'
  ) THEN
    ALTER TYPE plan_type ADD VALUE 'UNLIMITED' AFTER 'PRO';
  END IF;
END $$;

SELECT 'Enum plan_type mis à jour avec ESSENTIAL et UNLIMITED' AS result;
