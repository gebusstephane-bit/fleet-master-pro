-- ============================================================
-- VÉRIFICATION TABLE IDENTITIES
-- ============================================================

-- 1. Vérifier si la table auth.identities existe
SELECT 
    'TABLE IDENTITIES' as check_type,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'identities'
    ) as exists;

-- 2. Si existe, comparer les identities
SELECT 
    i.user_id,
    u.email,
    i.provider,
    i.identity_data,
    i.last_sign_in_at
FROM auth.identities i
JOIN auth.users u ON u.id = i.user_id
WHERE u.email IN (
    'contact@fleet-master.fr',
    'fleet.master.contact@gmail.com',
    'gebus.emma@gmail.com'
);

-- 3. Vérifier si les users cassés ont des entrées dans identities
SELECT 
    'IDENTITIES COUNT' as check_type,
    u.email,
    (SELECT COUNT(*) FROM auth.identities WHERE user_id = u.id) as identity_count
FROM auth.users u
WHERE u.email IN (
    'contact@fleet-master.fr',
    'fleet.master.contact@gmail.com',
    'gebus.emma@gmail.com'
);
