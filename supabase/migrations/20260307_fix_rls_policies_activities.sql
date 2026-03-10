-- =============================================================================
-- FIX: Correction des RLS policies pour company_activities et vehicle_activity_assignments
-- DATE: 2026-03-07
-- PROBLÈME: Les policies utilisaient des rôles en minuscules ('admin', 'manager')
--           mais l'application envoie des rôles en majuscules ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
-- =============================================================================

-- Fix policy: company_activities - écriture pour admins/agents de parc
DROP POLICY IF EXISTS company_activities_write ON company_activities;
CREATE POLICY company_activities_write ON company_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = company_activities.company_id
    )
  );

-- Fix policy: vehicle_activity_assignments - écriture pour admins/agents de parc
DROP POLICY IF EXISTS vehicle_activity_write ON vehicle_activity_assignments;
CREATE POLICY vehicle_activity_write ON vehicle_activity_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN profiles p ON p.company_id = v.company_id
      WHERE v.id = vehicle_activity_assignments.vehicle_id 
      AND p.id = auth.uid()
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    )
  );

-- Vérification: log de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES CORRIGEES AVEC SUCCES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Rôles autorisés: ADMIN, DIRECTEUR, AGENT_DE_PARC';
  RAISE NOTICE '========================================';
END $$;
