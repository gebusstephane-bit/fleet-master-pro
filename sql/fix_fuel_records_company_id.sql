-- ============================================================================
-- FIX: Corriger les company_id des fuel_records insérés via QR code
-- ============================================================================

-- 1. Voir les records sans company_id ou avec company_id NULL
SELECT 
  fr.id,
  fr.vehicle_id,
  fr.company_id,
  v.company_id as correct_company_id,
  v.registration_number
FROM fuel_records fr
JOIN vehicles v ON fr.vehicle_id = v.id
WHERE fr.company_id IS NULL 
   OR fr.company_id != v.company_id;

-- 2. Corriger les company_id manquants/incorrects
UPDATE fuel_records fr
SET company_id = v.company_id
FROM vehicles v
WHERE fr.vehicle_id = v.id
AND (fr.company_id IS NULL OR fr.company_id != v.company_id);

-- 3. Vérifier qu'il n'y a plus de problème
SELECT 
  'Records corrigés' as status,
  COUNT(*) as count
FROM fuel_records fr
JOIN vehicles v ON fr.vehicle_id = v.id
WHERE fr.company_id = v.company_id;

-- 4. Vérifier les RLS policies
SELECT 
  policyname,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'fuel_records';
