-- ============================================================
-- AUDIT FORENSIC COMPLET - Comparaison bit à bit
-- ============================================================

-- 1. STRUCTURE COMPLÈTE DES 5 USERS
SELECT 
    'STRUCTURE AUTH.USERS' as audit_type,
    u.email,
    u.id,
    u.aud,
    u.role,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.raw_app_meta_data->>'provider' as provider,
    u.raw_app_meta_data->'providers' as providers_array,
    length(u.encrypted_password) as pwd_length,
    u.is_sso_user,
    u.is_anonymous,
    i.provider as identity_provider,
    i.provider_id as identity_provider_id,
    CASE 
        WHEN u.email IN ('contact@fleet-master.fr', 'gebustephane04@gmail.com', 'gebus.stephane@gmail.com') 
        THEN '✅ USER QUI MARCHE' 
        ELSE '❌ USER PROBLÉMATIQUE' 
    END as category
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
ORDER BY category, u.email;

-- 2. DIFFÉRENCES SPÉCIFIQUES (users qui marchent vs qui marchent pas)
WITH working_users AS (
    SELECT * FROM auth.users 
    WHERE email IN ('contact@fleet-master.fr', 'gebustephane04@gmail.com', 'gebus.stephane@gmail.com')
),
problem_users AS (
    SELECT * FROM auth.users 
    WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')
)
SELECT 
    'ANALYSE DIFFÉRENCES' as audit_type,
    (SELECT string_agg(email, ', ') FROM working_users) as working_emails,
    (SELECT string_agg(email, ', ') FROM problem_users) as problem_emails,
    (SELECT AVG(length(encrypted_password)) FROM working_users) as avg_pwd_len_working,
    (SELECT AVG(length(encrypted_password)) FROM problem_users) as avg_pwd_len_problem,
    (SELECT COUNT(*) FROM working_users WHERE email_confirmed_at IS NOT NULL) as confirmed_working,
    (SELECT COUNT(*) FROM problem_users WHERE email_confirmed_at IS NOT NULL) as confirmed_problem;

-- 3. VÉRIFIER SI LES MOTS DE PASSE SONT BIEN CRYPTÉS
SELECT 
    'MOT DE PASSE ANALYSIS' as audit_type,
    email,
    encrypted_password,
    CASE 
        WHEN encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%' OR encrypted_password LIKE '$2y$%' 
        THEN '✅ FORMAT BCRYPT VALIDE'
        WHEN encrypted_password IS NULL 
        THEN '❌ NULL'
        ELSE '⚠️ FORMAT INCONNU'
    END as pwd_format,
    length(encrypted_password) as pwd_length
FROM auth.users
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com', 'contact@fleet-master.fr');

-- 4. VÉRIFIER LES COLONNES MANQUANTES OU NULL
SELECT 
    'COLONNES NULL' as audit_type,
    email,
    CASE WHEN confirmation_token IS NULL OR confirmation_token = '' THEN 'OK' ELSE 'A_TOKEN' END as confirmation,
    CASE WHEN recovery_token IS NULL OR recovery_token = '' THEN 'OK' ELSE 'A_TOKEN' END as recovery,
    CASE WHEN email_change_token_new IS NULL OR email_change_token_new = '' THEN 'OK' ELSE 'A_TOKEN' END as email_change
FROM auth.users
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com', 'contact@fleet-master.fr');

-- 5. TEST DE CONNEXION SIMULÉ (vérifier si les credentials sont valides)
-- On ne peut pas tester directement, mais on vérifie que tout est aligné
SELECT 
    'ALIGNEMENT FINAL' as audit_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    p.company_id,
    c.name as company_name,
    CASE 
        WHEN p.id = u.id 
         AND u.email_confirmed_at IS NOT NULL
         AND u.encrypted_password IS NOT NULL
         AND u.raw_app_meta_data->>'provider' = 'email'
        THEN '✅ PRÊT POUR CONNEXION'
        ELSE '❌ BLOQUANT: ' || 
             CASE WHEN p.id != u.id THEN 'ID_MISMATCH ' ELSE '' END ||
             CASE WHEN u.email_confirmed_at IS NULL THEN 'NOT_CONFIRMED ' ELSE '' END ||
             CASE WHEN u.encrypted_password IS NULL THEN 'NO_PASSWORD ' ELSE '' END ||
             CASE WHEN u.raw_app_meta_data->>'provider' IS NULL THEN 'NO_PROVIDER ' ELSE '' END
    END as ready_status
FROM profiles p
JOIN auth.users u ON u.email = p.email
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
