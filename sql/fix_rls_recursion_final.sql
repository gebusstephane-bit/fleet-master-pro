-- ============================================================================
-- FIX RLS RÉCURSION - Fichier: src/hooks/use-vehicles.ts lignes 104-122
-- ============================================================================
-- Problème : Les policies avec sous-requêtes sur profiles créent une boucle 
--            infinie lors des jointures vehicles/drivers
-- Solution : Remplacer les sous-requêtes par des fonctions SECURITY DEFINER
-- Date     : 2026-03-03
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Fonctions SECURITY DEFINER (création ou mise à jour)
-- ============================================================================

-- Fonction principale : retourne le company_id de l'utilisateur connecté
-- SECURITY DEFINER contourne RLS sur profiles → zéro récursion
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;
$$;

COMMENT ON FUNCTION get_user_company_id() IS 
'Retourne le company_id de l''utilisateur JWT courant. '
'SECURITY DEFINER : contourne RLS sur profiles → zéro récursion.';

-- Fonction secondaire : retourne le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;
$$;

COMMENT ON FUNCTION get_user_role() IS 
'Retourne le rôle de l''utilisateur (ADMIN|DIRECTEUR|AGENT_DE_PARC|EXPLOITANT|CHAUFFEUR). '
'SECURITY DEFINER : même protection anti-récursion.';

-- Alias de compatibilité avec les anciennes migrations
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_company_id();
$$;

-- Permissions
REVOKE ALL ON FUNCTION get_user_company_id()         FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_role()               FROM PUBLIC;
REVOKE ALL ON FUNCTION get_current_user_company_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_user_company_id()         TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role()               TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id()         TO service_role;
GRANT EXECUTE ON FUNCTION get_user_role()               TO service_role;
GRANT EXECUTE ON FUNCTION get_current_user_company_id() TO service_role;

-- ============================================================================
-- ÉTAPE 2 : Correction des policies récursives sur incidents
-- ============================================================================
-- Ces policies utilisent des sous-requêtes directes sur profiles
-- qui causent la récursion infinie

DROP POLICY IF EXISTS "incidents_select_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_update_own_company" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_own_company" ON incidents;

CREATE POLICY "incidents_select_own_company" ON incidents FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "incidents_insert_own_company" ON incidents FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "incidents_update_own_company" ON incidents FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "incidents_delete_own_company" ON incidents FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================================
-- ÉTAPE 3 : Correction des policies sur incident_documents
-- ============================================================================

DROP POLICY IF EXISTS "incident_documents_select" ON incident_documents;
DROP POLICY IF EXISTS "incident_documents_insert" ON incident_documents;
DROP POLICY IF EXISTS "incident_documents_delete" ON incident_documents;

CREATE POLICY "incident_documents_select" ON incident_documents FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "incident_documents_insert" ON incident_documents FOR INSERT
  WITH CHECK (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "incident_documents_delete" ON incident_documents FOR DELETE
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- ÉTAPE 4 : Correction des policies sur monthly_report_logs
-- ============================================================================

DROP POLICY IF EXISTS "monthly_report_logs viewable by company" ON monthly_report_logs;
DROP POLICY IF EXISTS "monthly_report_logs manageable by admin" ON monthly_report_logs;

CREATE POLICY "monthly_report_logs viewable by company" ON monthly_report_logs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "monthly_report_logs manageable by admin" ON monthly_report_logs
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'DIRECTEUR'));

-- ============================================================================
-- ÉTAPE 5 : Correction des policies sur ai_conversations
-- ============================================================================

DROP POLICY IF EXISTS "ai_conv_company_select" ON ai_conversations;

CREATE POLICY "ai_conv_company_select" ON ai_conversations
  FOR SELECT USING (company_id = get_user_company_id());

-- ============================================================================
-- ÉTAPE 6 : Vérification que vehicles utilise bien les fonctions SECURITY DEFINER
-- ============================================================================
-- Si des policies fmp_ existent (créées par la migration 20260224000001), 
-- elles utilisent déjà get_user_company_id() → OK
-- Sinon, on recrée les policies de base

DO $$
BEGIN
  -- Vérifier si les policies fmp_vehicles_* existent
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' AND policyname = 'fmp_vehicles_select'
  ) THEN
    -- Supprimer les anciennes policies si elles existent
    DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
    DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;
    
    -- Créer les policies avec SECURITY DEFINER
    CREATE POLICY "fmp_vehicles_select" ON vehicles
      FOR SELECT USING (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_vehicles_insert" ON vehicles
      FOR INSERT WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_vehicles_update" ON vehicles
      FOR UPDATE USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_vehicles_delete" ON vehicles
      FOR DELETE USING (company_id = get_user_company_id());
      
    RAISE NOTICE 'Policies vehicles créées avec get_user_company_id()';
  ELSE
    RAISE NOTICE 'Policies fmp_vehicles_* déjà existantes - OK';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 7 : Vérification que maintenance_records utilise bien SECURITY DEFINER
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_records' AND policyname = 'fmp_maintenance_select'
  ) THEN
    DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_update" ON maintenance_records;
    DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_records;
    
    CREATE POLICY "fmp_maintenance_select" ON maintenance_records
      FOR SELECT USING (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_maintenance_insert" ON maintenance_records
      FOR INSERT WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_maintenance_update" ON maintenance_records
      FOR UPDATE USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_maintenance_delete" ON maintenance_records
      FOR DELETE USING (company_id = get_user_company_id());
      
    RAISE NOTICE 'Policies maintenance_records créées avec get_user_company_id()';
  ELSE
    RAISE NOTICE 'Policies fmp_maintenance_* déjà existantes - OK';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 8 : Vérification que drivers utilise bien SECURITY DEFINER
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'drivers' AND policyname = 'fmp_drivers_select'
  ) THEN
    DROP POLICY IF EXISTS "drivers_select" ON drivers;
    DROP POLICY IF EXISTS "drivers_insert" ON drivers;
    DROP POLICY IF EXISTS "drivers_update" ON drivers;
    DROP POLICY IF EXISTS "drivers_delete" ON drivers;
    
    CREATE POLICY "fmp_drivers_select" ON drivers
      FOR SELECT USING (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_drivers_insert" ON drivers
      FOR INSERT WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_drivers_update" ON drivers
      FOR UPDATE USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
    
    CREATE POLICY "fmp_drivers_delete" ON drivers
      FOR DELETE USING (company_id = get_user_company_id());
      
    RAISE NOTICE 'Policies drivers créées avec get_user_company_id()';
  ELSE
    RAISE NOTICE 'Policies fmp_drivers_* déjà existantes - OK';
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT 
  'Fonctions SECURITY DEFINER' as check_item,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') as get_user_company_id_ok,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') as get_user_role_ok,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_company_id') as alias_ok;

-- Liste des policies par table (vérifie qu'elles utilisent bien les fonctions)
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%get_user_company_id%' THEN '✅ SECURITY DEFINER'
    WHEN qual::text LIKE '%profiles%' THEN '⚠️ SOUS-REQUÊTE profiles - RISQUE RÉCURSION'
    ELSE '? Vérifier manuellement'
  END as type
FROM pg_policies 
WHERE tablename IN ('vehicles', 'drivers', 'maintenance_records', 'incidents', 'incident_documents', 'monthly_report_logs', 'ai_conversations')
ORDER BY tablename, policyname;
