-- ============================================
-- FIX RLS : fuite du soft-delete véhicules (audit 2026-07-04, M7)
-- ============================================
-- Problème : la migration 20260303201624_soft_delete_vehicles a ajouté des
-- policies SELECT filtrées « deleted_at IS NULL », MAIS les anciennes policies
-- SELECT non filtrées subsistaient. Les policies RLS permissives étant
-- combinées en OR, un véhicule soft-deleted restait visible via les anciennes.
--
-- Ce nettoyage supprime UNIQUEMENT les deux policies SELECT non filtrées.
-- Les policies filtrées restantes couvrent tous les utilisateurs de la société :
--   - "Users can view vehicles from their company" (company + deleted_at IS NULL)
--   - "Admins can view all vehicles"              (admin/dir + deleted_at IS NULL)
-- Les policies INSERT/UPDATE/DELETE sont distinctes et NE sont PAS touchées.
--
-- ⚠️ RLS : à appliquer après vérification (liste véhicules OK, véhicules
-- supprimés absents des dashboards). Idempotent (DROP IF EXISTS).
-- ============================================

-- Ancienne policy SELECT sans filtre deleted_at (20250208130000_working_rls)
DROP POLICY IF EXISTS vehicles_company_isolation ON vehicles;

-- Ancienne policy SELECT sans filtre deleted_at (20250219000100_fix_critical_rls)
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;

-- Filet de sécurité : garantir la présence de la policy SELECT filtrée
-- (recréée à l'identique de 20260303201624 si jamais absente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles'
      AND policyname = 'Users can view vehicles from their company'
  ) THEN
    CREATE POLICY "Users can view vehicles from their company" ON vehicles
      FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND deleted_at IS NULL
      );
  END IF;
END $$;
