-- =====================================================
-- AJOUT COLONNES VALIDATION POUR INSPECTIONS
-- =====================================================

-- Ajouter les colonnes de validation si elles n'existent pas
ALTER TABLE vehicle_inspections 
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id);

-- Vérifier les colonnes
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'vehicle_inspections' 
  AND column_name IN ('validated_at', 'validated_by', 'status')
ORDER BY 
  column_name;

-- Vérifier les valeurs du statut
SELECT 
  status, 
  COUNT(*) as count 
FROM 
  vehicle_inspections 
GROUP BY 
  status;
