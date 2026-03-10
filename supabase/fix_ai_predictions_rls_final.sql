-- ============================================================
-- FIX RLS FINAL : Table ai_predictions
-- Problème : new row violates row-level security policy
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les anciennes politiques
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ai_predictions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON ai_predictions', pol.policyname);
    END LOOP;
END $$;

-- 3. Créer des politiques robustes

-- Politique SELECT : voir les prédictions des véhicules de sa company
CREATE POLICY "ai_predictions_select_policy"
ON ai_predictions FOR SELECT
TO authenticated
USING (
    vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    )
);

-- Politique INSERT : insérer pour les véhicules de sa company
-- NOTE : Le véhicule DOIT exister avant l'insertion de la prédiction
CREATE POLICY "ai_predictions_insert_policy"
ON ai_predictions FOR INSERT
TO authenticated
WITH CHECK (
    vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    )
);

-- Politique UPDATE : modifier les prédictions de sa company
CREATE POLICY "ai_predictions_update_policy"
ON ai_predictions FOR UPDATE
TO authenticated
USING (
    vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    )
);

-- Politique DELETE : supprimer les prédictions de sa company (admin uniquement)
CREATE POLICY "ai_predictions_delete_policy"
ON ai_predictions FOR DELETE
TO authenticated
USING (
    vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'SUPERADMIN', 'DIRECTEUR')
        )
    )
);

-- 4. Permettre au service_role toutes les opérations (pour les crons et migrations)
CREATE POLICY "ai_predictions_service_policy"
ON ai_predictions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Vérification
SELECT 'Politiques créées :' as status;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'ai_predictions'
ORDER BY policyname;
