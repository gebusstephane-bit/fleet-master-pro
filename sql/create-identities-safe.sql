-- ============================================================
-- CRÉATION DES IDENTITIES (sans ON CONFLICT)
-- ============================================================

-- 1. Vérifier les identities existantes
SELECT 
    'IDENTITIES EXISTANTES' as check_type,
    u.email,
    i.provider,
    i.user_id
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 2. Supprimer les identities existantes pour ces users (évite doublon)
DELETE FROM auth.identities 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
);

-- 3. Créer les identities propres
INSERT INTO auth.identities (
    id,
    user_id, 
    provider, 
    identity_data, 
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id, 
    'email', 
    jsonb_build_object('sub', id::text, 'email', email),
    NOW(),
    NOW(),
    NOW()
FROM auth.users
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 4. Vérification finale
SELECT 
    'APRÈS CRÉATION' as check_type,
    u.email,
    i.provider,
    i.identity_data->>'email' as identity_email
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
