-- =====================================================
-- Ajout du score dans les inspections
-- =====================================================

-- Ajouter la colonne score
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 100;

-- Ajouter la colonne grade (A, B, C, D)
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'A';

-- Ajouter la colonne defects_count
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS defects_count INTEGER DEFAULT 0;

-- Commentaires
COMMENT ON COLUMN vehicle_inspections.score IS 'Score global de l inspection (0-100)';
COMMENT ON COLUMN vehicle_inspections.grade IS 'Note lettre: A, B, C ou D';
COMMENT ON COLUMN vehicle_inspections.defects_count IS 'Nombre de defauts signales';

-- Mettre a jour les inspections existantes
UPDATE vehicle_inspections 
SET score = 100, grade = 'A', defects_count = 0 
WHERE score IS NULL;

-- Verification
SELECT 'Colonnes ajoutees:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicle_inspections' 
AND column_name IN ('score', 'grade', 'defects_count');
