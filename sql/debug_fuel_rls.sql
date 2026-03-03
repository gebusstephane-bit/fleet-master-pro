-- ============================================================================
-- DEBUG: Vérifier pourquoi les fuel_records ne sont pas récupérés
-- ============================================================================

-- 1. Vérifier la structure de la table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'fuel_records' 
ORDER BY ordinal_position;

-- 2. Vérifier si les données existent vraiment pour cette company
SELECT 
  id,
  company_id::text,
  vehicle_id::text,
  fuel_type,
  quantity_liters,
  created_at
FROM fuel_records
WHERE company_id::text = '2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Compter sans filtre company
SELECT COUNT(*) as total_records FROM fuel_records;

-- 4. Compter avec filtre company
SELECT COUNT(*) as company_records 
FROM fuel_records 
WHERE company_id = '2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90'::uuid;

-- 5. Vérifier les RLS policies
SELECT 
  policyname,
  permissive,
  roles::text,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'fuel_records';

-- 6. Vérifier si RLS est activé
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'fuel_records';
