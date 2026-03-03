-- Debug: Vérifier les données fuel_records et leur company_id

-- 1. Voir tous les fuel_records avec leur company_id
SELECT 
  fr.id,
  fr.vehicle_id,
  fr.company_id,
  fr.fuel_type,
  fr.quantity_liters,
  fr.created_at,
  v.registration_number,
  v.company_id as vehicle_company_id
FROM fuel_records fr
LEFT JOIN vehicles v ON fr.vehicle_id = v.id
ORDER BY fr.created_at DESC
LIMIT 10;

-- 2. Vérifier que les company_id correspondent bien aux véhicules
SELECT 
  'MISMATCH' as issue,
  fr.id,
  fr.company_id as fuel_company_id,
  v.company_id as vehicle_company_id
FROM fuel_records fr
JOIN vehicles v ON fr.vehicle_id = v.id
WHERE fr.company_id != v.company_id;

-- 3. Vérifier le RLS policy sur fuel_records
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'fuel_records';

-- 4. Compter par company_id
SELECT 
  company_id,
  COUNT(*) as count
FROM fuel_records
GROUP BY company_id;
