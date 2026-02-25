-- ============================================================
-- FIX RLS : Table ai_predictions
-- Problème : new row violates row-level security policy
-- ============================================================

-- Activer RLS sur la table
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "ai_predictions_select" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_insert" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_update" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_delete" ON ai_predictions;

-- ============================================================
-- Politique SELECT 
-- Les utilisateurs voient uniquement les prédictions de leur entreprise
-- ============================================================
CREATE POLICY "ai_predictions_select"
ON ai_predictions FOR SELECT
USING (
  vehicle_id IN (
    SELECT v.id FROM vehicles v
    JOIN profiles p ON v.company_id = p.company_id
    WHERE p.id = auth.uid()
  )
);

-- ============================================================
-- Politique INSERT
-- Les utilisateurs peuvent créer des prédictions pour les véhicules de leur entreprise
-- ============================================================
CREATE POLICY "ai_predictions_insert"
ON ai_predictions FOR INSERT
WITH CHECK (
  vehicle_id IN (
    SELECT v.id FROM vehicles v
    JOIN profiles p ON v.company_id = p.company_id
    WHERE p.id = auth.uid()
  )
);

-- ============================================================
-- Politique UPDATE
-- Mise à jour uniquement pour les véhicules de l'entreprise
-- ============================================================
CREATE POLICY "ai_predictions_update"
ON ai_predictions FOR UPDATE
USING (
  vehicle_id IN (
    SELECT v.id FROM vehicles v
    JOIN profiles p ON v.company_id = p.company_id
    WHERE p.id = auth.uid()
  )
);

-- ============================================================
-- Politique DELETE
-- Suppression uniquement par les admins/superadmins
-- ============================================================
CREATE POLICY "ai_predictions_delete"
ON ai_predictions FOR DELETE
USING (
  vehicle_id IN (
    SELECT v.id FROM vehicles v
    JOIN profiles p ON v.company_id = p.company_id
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'SUPERADMIN', 'DIRECTEUR')
  )
);

-- ============================================================
-- Vérification : Lister les politiques créées
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'ai_predictions';
