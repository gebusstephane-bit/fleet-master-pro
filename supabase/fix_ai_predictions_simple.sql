-- ============================================================
-- FIX RLS SIMPLE : Table ai_predictions
-- Problème : new row violates row-level security policy
-- Solution : Politiques permissives basées sur company_id
-- ============================================================

-- 1. Activer RLS
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "ai_predictions_select" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_insert" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_update" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_delete" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_select_policy" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_insert_policy" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_update_policy" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_delete_policy" ON ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_service_policy" ON ai_predictions;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON ai_predictions;
DROP POLICY IF EXISTS "Allow authenticated selects" ON ai_predictions;

-- 3. Créer des politiques simples et robustes

-- SELECT : Voir les prédictions des véhicules de sa company
CREATE POLICY "ai_predictions_select"
ON ai_predictions
FOR SELECT
TO authenticated
USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id = (
            SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
        )
    )
);

-- INSERT : Permettre l'insertion si le véhicule appartient à l'utilisateur
-- NOTE: Cette politique vérifie que le vehicle_id existe et appartient à la company
CREATE POLICY "ai_predictions_insert"
ON ai_predictions
FOR INSERT
TO authenticated
WITH CHECK (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id = (
            SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
        )
    )
);

-- UPDATE : Mettre à jour si le véhicule appartient à l'utilisateur
CREATE POLICY "ai_predictions_update"
ON ai_predictions
FOR UPDATE
TO authenticated
USING (
    vehicle_id IN (
        SELECT id FROM vehicles 
        WHERE company_id = (
            SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
        )
    )
);

-- DELETE : Supprimer si admin et véhicule de sa company
CREATE POLICY "ai_predictions_delete"
ON ai_predictions
FOR DELETE
TO authenticated
USING (
    vehicle_id IN (
        SELECT v.id FROM vehicles v
        JOIN profiles p ON v.company_id = p.company_id
        WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'SUPERADMIN', 'DIRECTEUR')
    )
);

-- 4. Service role a tous les droits
CREATE POLICY "ai_predictions_service_all"
ON ai_predictions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Vérification finale
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles::text,
    cmd,
    CASE WHEN LENGTH(qual::text) > 50 THEN LEFT(qual::text, 50) || '...' ELSE qual::text END as condition
FROM pg_policies 
WHERE tablename = 'ai_predictions'
ORDER BY cmd;
