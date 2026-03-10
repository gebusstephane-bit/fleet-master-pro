-- ============================================
-- PATCH SÉCURITÉ FLEETMASTER PRO
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Création de la fonction pour récupérer le company_id (SECURITY DEFINER)
-- Cette fonction contourne les politiques RLS pour éviter la boucle infinie
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Commentaire explicatif
COMMENT ON FUNCTION get_current_user_company_id() IS 
'Fonction utilisée par les politiques RLS pour obtenir le company_id 
de l utilisateur connecté sans déclencher de récursion infinie.
SECURITY DEFINER permet de contourner les RLS sur profiles.';

-- 2. Suppression des anciennes politiques problématiques (si elles existent)
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;

DROP POLICY IF EXISTS "drivers_select_policy" ON drivers;
DROP POLICY IF EXISTS "drivers_insert_policy" ON drivers;
DROP POLICY IF EXISTS "drivers_update_policy" ON drivers;
DROP POLICY IF EXISTS "drivers_delete_policy" ON drivers;

DROP POLICY IF EXISTS "maintenance_select_policy" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert_policy" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update_policy" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete_policy" ON maintenance_records;

-- 3. Création des nouvelles politiques RLS sécurisées

-- ============================================
-- VEHICULES
-- ============================================
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_insert_policy" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_update_policy" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "vehicles_delete_policy" ON vehicles
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- DRIVERS (CHAUFFEURS)
-- ============================================
CREATE POLICY "drivers_select_policy" ON drivers
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_insert_policy" ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_update_policy" ON drivers
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "drivers_delete_policy" ON drivers
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- MAINTENANCE RECORDS
-- ============================================
CREATE POLICY "maintenance_select_policy" ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_insert_policy" ON maintenance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_update_policy" ON maintenance_records
  FOR UPDATE
  TO authenticated
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_delete_policy" ON maintenance_records
  FOR DELETE
  TO authenticated
  USING (company_id = get_current_user_company_id());

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
  'Fonction créée' as check_item,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_company_id') as status
UNION ALL
SELECT 
  'Politiques vehicles',
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'vehicles_select_policy')
UNION ALL
SELECT 
  'Politiques drivers',
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'drivers_select_policy')
UNION ALL
SELECT 
  'Politiques maintenance',
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_records' AND policyname = 'maintenance_select_policy');
