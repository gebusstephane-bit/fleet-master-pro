-- Ajouter colonne risk_factors
ALTER TABLE ai_predictions ADD COLUMN IF NOT EXISTS risk_factors TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Mettre à jour les NULL
UPDATE ai_predictions SET risk_factors = ARRAY[]::TEXT[] WHERE risk_factors IS NULL;

SELECT 'OK' as status;
