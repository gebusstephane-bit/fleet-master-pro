-- ============================================================
-- MIGRATION : Normalisation RLS → Pattern A (get_user_company_id())
-- Date : 2026-03-10
-- Objectif : Remplacer les sous-requêtes directes (Pattern B) par la
--            fonction SECURITY DEFINER get_user_company_id() (Pattern A)
-- Tables migrées : 13 tables
--   incidents, incident_documents, fuel_records, monthly_report_logs,
--   vehicle_axle_configs, tires, tire_mountings, tire_depth_checks,
--   vehicle_driver_assignments, maintenance_rules, maintenance_predictions,
--   company_activities, vehicle_activity_assignments
-- ============================================================

-- Pré-requis : la fonction SECURITY DEFINER doit exister
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') THEN
    RAISE EXCEPTION 'Fonction get_user_company_id() introuvable — migration annulée';
  END IF;
  RAISE NOTICE 'Pré-requis OK : get_user_company_id() trouvée';
END $$;


-- ============================================================
-- 1. incidents
-- ============================================================
DROP POLICY IF EXISTS "incidents_select_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_update_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_own_company" ON incidents;

CREATE POLICY "incidents_select" ON incidents FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "incidents_insert" ON incidents FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "incidents_update" ON incidents FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "incidents_delete" ON incidents FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 2. incident_documents
--    Pas de company_id direct → isolation via incidents
-- ============================================================
DROP POLICY IF EXISTS "incident_documents_select" ON incident_documents;
DROP POLICY IF EXISTS "incident_documents_insert" ON incident_documents;
DROP POLICY IF EXISTS "incident_documents_delete" ON incident_documents;

CREATE POLICY "incident_documents_select" ON incident_documents FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "incident_documents_insert" ON incident_documents FOR INSERT TO authenticated
  WITH CHECK (
    incident_id IN (
      SELECT id FROM incidents WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "incident_documents_delete" ON incident_documents FOR DELETE TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents WHERE company_id = get_user_company_id()
    )
  );


-- ============================================================
-- 3. fuel_records
--    DELETE conserve la restriction ADMIN/DIRECTEUR
-- ============================================================
DROP POLICY IF EXISTS fuel_records_select ON fuel_records;
DROP POLICY IF EXISTS fuel_records_insert ON fuel_records;
DROP POLICY IF EXISTS fuel_records_update ON fuel_records;
DROP POLICY IF EXISTS fuel_records_delete ON fuel_records;

CREATE POLICY fuel_records_select ON fuel_records FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY fuel_records_insert ON fuel_records FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY fuel_records_update ON fuel_records FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- DELETE : restreint aux ADMIN/DIRECTEUR (logique métier préservée)
CREATE POLICY fuel_records_delete ON fuel_records FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'DIRECTEUR')
    )
  );


-- ============================================================
-- 4. monthly_report_logs
--    SELECT : toute la company | ALL : ADMIN/DIRECTEUR seulement
-- ============================================================
DROP POLICY IF EXISTS "monthly_report_logs viewable by company" ON monthly_report_logs;
DROP POLICY IF EXISTS "monthly_report_logs manageable by admin" ON monthly_report_logs;

CREATE POLICY "monthly_report_logs_select" ON monthly_report_logs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "monthly_report_logs_write" ON monthly_report_logs FOR ALL TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'DIRECTEUR')
    )
  );


-- ============================================================
-- 5. vehicle_axle_configs
-- ============================================================
DROP POLICY IF EXISTS "vac_select" ON vehicle_axle_configs;
DROP POLICY IF EXISTS "vac_insert" ON vehicle_axle_configs;
DROP POLICY IF EXISTS "vac_update" ON vehicle_axle_configs;
DROP POLICY IF EXISTS "vac_delete" ON vehicle_axle_configs;

CREATE POLICY "vac_select" ON vehicle_axle_configs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "vac_insert" ON vehicle_axle_configs FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "vac_update" ON vehicle_axle_configs FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "vac_delete" ON vehicle_axle_configs FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 6. tires
-- ============================================================
DROP POLICY IF EXISTS "tires_select" ON tires;
DROP POLICY IF EXISTS "tires_insert" ON tires;
DROP POLICY IF EXISTS "tires_update" ON tires;
DROP POLICY IF EXISTS "tires_delete" ON tires;

CREATE POLICY "tires_select" ON tires FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "tires_insert" ON tires FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tires_update" ON tires FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tires_delete" ON tires FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 7. tire_mountings
-- ============================================================
DROP POLICY IF EXISTS "tm_select" ON tire_mountings;
DROP POLICY IF EXISTS "tm_insert" ON tire_mountings;
DROP POLICY IF EXISTS "tm_update" ON tire_mountings;
DROP POLICY IF EXISTS "tm_delete" ON tire_mountings;

CREATE POLICY "tm_select" ON tire_mountings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "tm_insert" ON tire_mountings FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tm_update" ON tire_mountings FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tm_delete" ON tire_mountings FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 8. tire_depth_checks
-- ============================================================
DROP POLICY IF EXISTS "tdc_select" ON tire_depth_checks;
DROP POLICY IF EXISTS "tdc_insert" ON tire_depth_checks;
DROP POLICY IF EXISTS "tdc_update" ON tire_depth_checks;
DROP POLICY IF EXISTS "tdc_delete" ON tire_depth_checks;

CREATE POLICY "tdc_select" ON tire_depth_checks FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "tdc_insert" ON tire_depth_checks FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tdc_update" ON tire_depth_checks FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "tdc_delete" ON tire_depth_checks FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 9. vehicle_driver_assignments
-- ============================================================
DROP POLICY IF EXISTS "vda_select" ON vehicle_driver_assignments;
DROP POLICY IF EXISTS "vda_insert" ON vehicle_driver_assignments;
DROP POLICY IF EXISTS "vda_update" ON vehicle_driver_assignments;
DROP POLICY IF EXISTS "vda_delete" ON vehicle_driver_assignments;

CREATE POLICY "vda_select" ON vehicle_driver_assignments FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "vda_insert" ON vehicle_driver_assignments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "vda_update" ON vehicle_driver_assignments FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "vda_delete" ON vehicle_driver_assignments FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 10. maintenance_rules
--     company_id IS NULL = règle système globale (non rattachée à une company)
-- ============================================================
DROP POLICY IF EXISTS "system_rules_readable_by_all" ON maintenance_rules;
DROP POLICY IF EXISTS "company_rules_manageable" ON maintenance_rules;
DROP POLICY IF EXISTS "system_rules_immutable" ON maintenance_rules;

-- SELECT : règles système (company_id NULL) + règles propres à la company
CREATE POLICY "maintenance_rules_select" ON maintenance_rules FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR company_id = get_user_company_id()
  );

-- ALL (INSERT/UPDATE/DELETE) : uniquement les règles propres à la company
CREATE POLICY "maintenance_rules_write" ON maintenance_rules FOR ALL TO authenticated
  USING (
    company_id IS NOT NULL
    AND company_id = get_user_company_id()
  );


-- ============================================================
-- 11. maintenance_predictions
-- ============================================================
DROP POLICY IF EXISTS "company_isolation_predictions" ON maintenance_predictions;

CREATE POLICY "maintenance_predictions_isolation" ON maintenance_predictions FOR ALL TO authenticated
  USING (company_id = get_user_company_id());


-- ============================================================
-- 12. company_activities
--     SELECT : tous les membres | ALL : ADMIN/DIRECTEUR/AGENT_DE_PARC
-- ============================================================
DROP POLICY IF EXISTS company_activities_select ON company_activities;
DROP POLICY IF EXISTS company_activities_write ON company_activities;

CREATE POLICY company_activities_select ON company_activities FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY company_activities_write ON company_activities FOR ALL TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    )
  );


-- ============================================================
-- 13. vehicle_activity_assignments
--     Pas de company_id direct → isolation via vehicles
--     SELECT : tous les membres | ALL : ADMIN/DIRECTEUR/AGENT_DE_PARC
-- ============================================================
DROP POLICY IF EXISTS vehicle_activity_select ON vehicle_activity_assignments;
DROP POLICY IF EXISTS vehicle_activity_write ON vehicle_activity_assignments;

CREATE POLICY vehicle_activity_select ON vehicle_activity_assignments FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY vehicle_activity_write ON vehicle_activity_assignments FOR ALL TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE company_id = get_user_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    )
  );


-- ============================================================
-- VALIDATION FINALE
-- ============================================================
DO $$
DECLARE
  v_pattern_b_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pattern_b_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual  LIKE '%SELECT company_id FROM profiles WHERE id = auth.uid()%'
      OR with_check LIKE '%SELECT company_id FROM profiles WHERE id = auth.uid()%'
    );

  IF v_pattern_b_count > 0 THEN
    RAISE WARNING 'ATTENTION : % policies Pattern B encore actives (voir pg_policies)', v_pattern_b_count;
  ELSE
    RAISE NOTICE 'OK : Pattern B résiduel = 0 | Toutes les policies utilisent get_user_company_id()';
  END IF;
END $$;
