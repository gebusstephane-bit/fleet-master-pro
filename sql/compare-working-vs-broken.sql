-- ============================================================
-- COMPARAISON: User qui marche vs User cassé
-- ============================================================

-- 1. Comparer toutes les colonnes pertinentes
SELECT 
    'USER QUI MARCHE' as type,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    encrypted_password LIKE '%$%' as has_password
FROM auth.users 
WHERE email = 'contact@fleet-master.fr'

UNION ALL

SELECT 
    'USER CASSÉ 1',
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    encrypted_password LIKE '%$%' as has_password
FROM auth.users 
WHERE email = 'fleet.master.contact@gmail.com'

UNION ALL

SELECT 
    'USER CASSÉ 2',
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    encrypted_password LIKE '%$%' as has_password
FROM auth.users 
WHERE email = 'gebus.emma@gmail.com';

-- 2. Lister TOUTES les colonnes de auth.users pour voir ce qui diffère
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Vérifier s'il y a des colonnes spécifiques à comparer
SELECT 
    'DIFFÉRENCES' as check_type,
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL) as unconfirmed_count,
    (SELECT COUNT(*) FROM auth.users WHERE raw_app_meta_data IS NULL) as no_app_meta_count,
    (SELECT COUNT(*) FROM auth.users WHERE encrypted_password IS NULL) as no_password_count;
