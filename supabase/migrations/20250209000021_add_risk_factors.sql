-- ============================================
-- AJOUT COLONNE RISK_FACTORS MANQUANTE
-- ============================================

-- Ajouter la colonne risk_factors à ai_predictions
ALTER TABLE ai_predictions 
ADD COLUMN IF NOT EXISTS risk_factors TEXT[] DEFAULT '{}';

-- Mettre à jour les enregistrements existants
UPDATE ai_predictions 
SET risk_factors = ARRAY['Aucun facteur identifié']
WHERE risk_factors IS NULL OR array_length(risk_factors, 1) IS NULL;

SELECT 'Colonne risk_factors ajoutée avec succès!' as status;
