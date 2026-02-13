-- ============================================
-- CRÉER L'UTILISATEUR DANS AUTH (authentification)
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Créer l'utilisateur dans auth.users avec mot de passe Emilie57
-- Le mot de passe est hashé avec bcrypt

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'gebus.stephane@gmail.com',
  crypt('Emilie57', gen_salt('bf', 10)),  -- Hash du mot de passe
  NOW(),  -- Email déjà confirmé
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Stephane", "last_name": "Gebus"}',
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Emilie57', gen_salt('bf', 10)),
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
  updated_at = NOW();

-- 2. Créer l'identité pour l'authentification
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '{"sub": "33333333-3333-3333-3333-333333333333", "email": "gebus.stephane@gmail.com", "email_verified": true}',
  'email',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider_id, provider) DO NOTHING;

-- 3. Mettre à jour la table users publique avec le bon ID
UPDATE public.users 
SET id = '33333333-3333-3333-3333-333333333333'
WHERE email = 'gebus.stephane@gmail.com';

-- 4. Vérification
SELECT 
  'auth.users' as source,
  id,
  email,
  email_confirmed_at,
  CASE WHEN encrypted_password IS NOT NULL THEN 'OUI' ELSE 'NON' END as has_password
FROM auth.users 
WHERE email = 'gebus.stephane@gmail.com'

UNION ALL

SELECT 
  'public.users' as source,
  id,
  email,
  NULL,
  NULL
FROM public.users 
WHERE email = 'gebus.stephane@gmail.com';
