-- ============================================================
-- VÉRIFICATION ALIGNEMENT APRÈS CRÉATION IDENTITIES
-- ============================================================

-- 1. Vérifier que les IDs sont toujours alignés
SELECT 
    'ALIGNEMENT AUTH ↔ PROFILES' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ' ELSE '❌ DIFFÉRENT' END as alignment,
    i.provider as identity_provider
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE p.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 2. Vérifier les données liées (véhicules, etc.)
SELECT 
    'DONNÉES PRÉSERVÉES' as check_type,
    p.email,
    p.company_id,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = p.company_id) as vehicules,
    (SELECT COUNT(*) FROM drivers WHERE company_id = p.company_id) as chauffeurs
FROM profiles p
WHERE p.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 3. Résumé complet
SELECT 
    'RÉSUMÉ FINAL' as info,
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    i.provider IS NOT NULL as has_identity,
    p.id = u.id as ids_aligned,
    p.company_id IS NOT NULL as has_company
FROM auth.users u
JOIN profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
