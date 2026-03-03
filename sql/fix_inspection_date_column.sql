-- ============================================
-- FIX: Ajout de la colonne inspection_date manquante
-- ============================================

-- Vérifier si la colonne existe, sinon l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'vehicle_inspections' 
    AND column_name = 'inspection_date'
  ) THEN
    ALTER TABLE vehicle_inspections 
    ADD COLUMN inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    RAISE NOTICE 'Colonne inspection_date ajoutée à vehicle_inspections';
  ELSE
    RAISE NOTICE 'Colonne inspection_date déjà présente';
  END IF;
END $$;

-- Mettre à jour les enregistrements existants qui n'ont pas de date
UPDATE vehicle_inspections 
SET inspection_date = created_at 
WHERE inspection_date IS NULL;

-- Vérification
SELECT 
  'Statut de la table vehicle_inspections:' as info,
  COUNT(*) as total_inspections,
  COUNT(inspection_date) as with_inspection_date
FROM vehicle_inspections;
