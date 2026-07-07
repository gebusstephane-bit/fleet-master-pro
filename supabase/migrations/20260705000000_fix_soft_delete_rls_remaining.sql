-- ============================================
-- FIX RLS soft-delete (complément — audit 2026-07-05, M7)
-- ============================================
-- La migration 20260704010000 avait supprimé 2 anciennes policies SELECT non
-- filtrées, mais 3 AUTRES policies SELECT sur vehicles subsistaient SANS filtre
-- deleted_at (fmp_vehicles_select, vehicles_read, chauffeur_vehicle_view). Les
-- policies permissives étant combinées en OR, les véhicules soft-deleted
-- restaient visibles via ces 3 policies. On les recrée à l'identique + le filtre.
--
-- Appliqué en prod le 2026-07-05 (vérifié : les 5 policies SELECT filtrent
-- désormais deleted_at IS NULL). Idempotent.
-- ============================================

DROP POLICY IF EXISTS fmp_vehicles_select ON vehicles;
CREATE POLICY fmp_vehicles_select ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS vehicles_read ON vehicles;
CREATE POLICY vehicles_read ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS chauffeur_vehicle_view ON vehicles;
CREATE POLICY chauffeur_vehicle_view ON vehicles
  FOR SELECT TO public
  USING (
    (
      (EXISTS (SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = ANY (ARRAY['ADMIN','DIRECTEUR','AGENT_DE_PARC','EXPLOITANT'])
          AND p.company_id = vehicles.company_id))
      OR (
        (EXISTS (SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'CHAUFFEUR'
            AND p.company_id = vehicles.company_id))
        AND assigned_driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
      )
    )
    AND deleted_at IS NULL
  );
