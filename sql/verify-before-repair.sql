-- ============================================================
-- VÉRIFICATION PRÉ-RÉPARATION
-- Exécuter CE SCRIPT D'ABORD pour voir l'état actuel
-- ============================================================

-- 1. Vérifier si les profils existent
SELECT 
    'PROFILS EXISTANTS' as check_type,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM profiles 
WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- 2. Vérifier si les auth.users existent déjà
SELECT 
    'AUTH.USERS EXISTANTS' as check_type,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 3. Détail complet
SELECT 
    'DÉTAIL' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ ORPHELIN - PAS DE COMPTE AUTH'
        WHEN u.id = p.id THEN '✅ ALIGNÉ'
        ELSE '⚠️ IDS DIFFÉRENTS'
    END as statut,
    p.company_id,
    c.name as company_name,
    c.subscription_status
FROM profiles p
LEFT JOIN auth.users u ON u.email = p.email OR u.id = p.id
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- 4. Compter les données liées
SELECT 
    'DONNÉES LIÉES' as check_type,
    p.email,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = p.company_id) as nb_vehicles,
    (SELECT COUNT(*) FROM drivers WHERE company_id = p.company_id) as nb_drivers,
    (SELECT COUNT(*) FROM maintenance_records mr 
     JOIN vehicles v ON v.id = mr.vehicle_id 
     WHERE v.company_id = p.company_id) as nb_maintenance
FROM profiles p
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');
