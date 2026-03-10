-- =============================================================
-- FIX CRITIQUE : RLS maintenance_records cassée
-- Cause : policy référençant v.driver_id qui n'existe plus
-- Solution : drop ALL policies existantes + recréation correcte
-- À exécuter dans Supabase SQL Editor (rôle postgres/service_role)
-- =============================================================

-- 1. Drop toutes les policies existantes sur maintenance_records
--    (y compris la policy cassée avec v.driver_id)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'maintenance_records' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.maintenance_records', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END;
$$;

-- 2. Recréer la policy correcte basée sur company_id + profiles
--    (utilise profiles, pas users ni vehicles)
CREATE POLICY maintenance_company_isolation ON public.maintenance_records
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 3. Vérification : lister les policies actives
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'maintenance_records' AND schemaname = 'public';
