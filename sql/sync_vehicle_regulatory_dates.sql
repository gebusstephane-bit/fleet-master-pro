-- ============================================================================
-- SYNCHRONISATION des dates réglementaires depuis les maintenance_records
-- ============================================================================
-- Ce script met à jour technical_control_date et tachy_control_date 
-- dans la table vehicles en se basant sur les maintenances terminées
-- ============================================================================

-- 1. Vérifier les maintenances CT terminées sans mise à jour véhicule
-- ----------------------------------------------------------------------------
SELECT 
    mr.id as maintenance_id,
    mr.vehicle_id,
    v.registration_number,
    mr.description,
    mr.completed_date,
    mr.status,
    v.technical_control_date as current_ct_date,
    v.tachy_control_date as current_tachy_date
FROM maintenance_records mr
JOIN vehicles v ON mr.vehicle_id = v.id
WHERE mr.status = 'TERMINEE'
    AND (
        LOWER(mr.description) LIKE '%contrôle technique%'
        OR LOWER(mr.description) LIKE '%controle technique%'
        OR LOWER(mr.description) LIKE '%tachygraphe%'
        OR LOWER(mr.description) LIKE '%tachy%'
    )
ORDER BY mr.completed_date DESC;

-- 2. Mise à jour des dates de contrôle technique
-- ----------------------------------------------------------------------------
UPDATE vehicles v
SET 
    technical_control_date = mr.completed_date,
    updated_at = NOW()
FROM maintenance_records mr
WHERE mr.vehicle_id = v.id
    AND mr.status = 'TERMINEE'
    AND (
        LOWER(mr.description) LIKE '%contrôle technique%'
        OR LOWER(mr.description) LIKE '%controle technique%'
    )
    AND mr.completed_date > COALESCE(v.technical_control_date, '1900-01-01');

-- 3. Mise à jour des dates de tachygraphe
-- ----------------------------------------------------------------------------
UPDATE vehicles v
SET 
    tachy_control_date = mr.completed_date,
    updated_at = NOW()
FROM maintenance_records mr
WHERE mr.vehicle_id = v.id
    AND mr.status = 'TERMINEE'
    AND (
        LOWER(mr.description) LIKE '%tachygraphe%'
        OR LOWER(mr.description) LIKE '%tachy%'
    )
    AND mr.completed_date > COALESCE(v.tachy_control_date, '1900-01-01');

-- 4. Vérification après mise à jour
-- ----------------------------------------------------------------------------
SELECT 
    v.registration_number,
    v.technical_control_date,
    v.tachy_control_date,
    v.updated_at
FROM vehicles v
WHERE v.id = 'bb862a6e-121d-4a4b-af26-403a19345136';
