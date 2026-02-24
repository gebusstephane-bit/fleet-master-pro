-- ============================================================
-- AUDIT CHAMPS CRITIQUES - Les 3 requêtes essentielles
-- ============================================================

-- REQUÊTE 1: Mots de passe et confirmation
SELECT 
    'REQUETE 1: PASSWORDS' as info,
    email,
    CASE 
        WHEN encrypted_password LIKE '$2%' THEN '✅ BCRYPT'
        ELSE '❌ PROBLEME'
    END as pwd_format,
    email_confirmed_at IS NOT NULL as confirmed,
    length(encrypted_password) as pwd_len
FROM auth.users
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com', 'contact@fleet-master.fr');

-- REQUÊTE 2: Champs critiques auth
SELECT 
    'REQUETE 2: AUTH FIELDS' as info,
    email,
    raw_app_meta_data->>'provider' as provider,
    raw_app_meta_data->'providers'->>0 as providers_0,
    is_sso_user,
    role,
    aud
FROM auth.users
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com', 'contact@fleet-master.fr');

-- REQUÊTE 3: Comparaison avec user qui marche
SELECT 
    'REQUETE 3: COMPARAISON' as info,
    u.email,
    u.id = p.id as id_match,
    u.email_confirmed_at IS NOT NULL as confirmed,
    u.encrypted_password IS NOT NULL as has_pwd,
    i.provider IS NOT NULL as has_identity
FROM auth.users u
JOIN profiles p ON p.email = u.email
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com', 'contact@fleet-master.fr');
