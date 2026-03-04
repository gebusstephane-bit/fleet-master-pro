-- ============================================================================
-- DIAGNOSTIC CRON MAINTENANCE - Vérifier les RDV du jour
-- ============================================================================
-- À exécuter dans Supabase SQL Editor pour voir les RDV d'aujourd'hui
-- ============================================================================

-- Date du jour (format ISO pour correspondre au JS)
SELECT CURRENT_DATE as today;
SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as today_iso;

-- ============================================================================
-- Vérifier tous les maintenance_records avec RDV aujourd'hui
-- ============================================================================
SELECT 
  mr.id,
  mr.vehicle_id,
  v.registration_number,
  mr.status as maintenance_status,
  mr.rdv_date,
  mr.scheduled_date,
  mr.rdv_time,
  mr.created_at,
  v.status as vehicle_status
FROM maintenance_records mr
JOIN vehicles v ON v.id = mr.vehicle_id
WHERE 
  -- Vérifier si rdv_date = aujourd'hui
  (mr.rdv_date = CURRENT_DATE 
   OR mr.scheduled_date = CURRENT_DATE)
  -- Exclure les maintenances terminées ou refusées
  AND mr.status NOT IN ('TERMINEE', 'REFUSEE')
ORDER BY mr.rdv_date, mr.rdv_time;

-- ============================================================================
-- Vérifier sans filtre de date (tous les records récents)
-- ============================================================================
SELECT 
  mr.id,
  v.registration_number,
  mr.status,
  mr.rdv_date,
  mr.scheduled_date,
  mr.created_at::date as created_date
FROM maintenance_records mr
JOIN vehicles v ON v.id = mr.vehicle_id
WHERE mr.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY mr.created_at DESC
LIMIT 20;

-- ============================================================================
-- Vérifier les statuts distincts dans maintenance_records
-- ============================================================================
SELECT DISTINCT status, COUNT(*) as count
FROM maintenance_records
GROUP BY status;

-- ============================================================================
-- Vérifier le format des dates (rdv_date vs scheduled_date)
-- ============================================================================
SELECT 
  'rdv_date' as field,
  pg_typeof(rdv_date) as data_type,
  COUNT(*) as total,
  COUNT(rdv_date) as non_null
FROM maintenance_records
UNION ALL
SELECT 
  'scheduled_date' as field,
  pg_typeof(scheduled_date) as data_type,
  COUNT(*) as total,
  COUNT(scheduled_date) as non_null
FROM maintenance_records;

-- ============================================================================
-- Vérifier si la contrainte CHECK existe sur vehicles.status
-- ============================================================================
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'vehicles'::regclass 
AND contype = 'c';
