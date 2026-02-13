-- ============================================
-- SCRIPT COMPLET - Création/Correction utilisateur
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Supprimer l'utilisateur existant si besoin
-- (Décommenter si tu veux repartir de zéro)
-- ============================================
-- DELETE FROM auth.users WHERE email = 'gebus.stephane@gmail.com';
-- DELETE FROM users WHERE email = 'gebus.stephane@gmail.com';

-- ============================================
-- ÉTAPE 2 : Créer l'entreprise
-- ============================================
INSERT INTO public.companies (
  id, name, siret, address, postal_code, city, country, phone, email,
  subscription_plan, subscription_status, max_vehicles, max_drivers
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Transport Gebus',
  '12345678900012',
  '123 Rue de la Logistics',
  '75001',
  'Paris',
  'France',
  '0123456789',
  'contact@gebus-transport.fr',
  'pro',
  'active',
  20,
  30
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_plan = EXCLUDED.subscription_plan,
  updated_at = NOW();

-- ============================================
-- ÉTAPE 3 : Créer l'utilisateur dans auth.users
-- ============================================
-- Note: Le mot de passe sera "Emilie57"
-- Le hash est généré avec bcrypt 10 rounds

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  new_email,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'gebus.stephane@gmail.com',
  '$2a$10$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu', -- Placeholder, on va le mettre à jour
  NOW(), -- Email déjà confirmé
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Stephane", "last_name": "Gebus"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
  updated_at = NOW();

-- ============================================
-- ÉTAPE 4 : Mettre à jour le mot de passe avec la fonction auth
-- ============================================
-- Cette fonction permet de hasher correctement le mot de passe

-- D'abord, on supprime l'utilisateur existant pour éviter les conflits
DELETE FROM auth.users WHERE id = '33333333-3333-3333-3333-333333333333';

-- Recréer avec le bon hash
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'gebus.stephane@gmail.com',
  crypt('Emilie57', gen_salt('bf', 10)), -- Hash correct du mot de passe
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Stephane", "last_name": "Gebus"}',
  NOW(),
  NOW()
);

-- ============================================
-- ÉTAPE 5 : Créer l'utilisateur dans la table publique
-- ============================================
-- Désactiver RLS temporairement
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

INSERT INTO public.users (
  id, email, first_name, last_name, role, company_id, created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'gebus.stephane@gmail.com',
  'Stephane',
  'Gebus',
  'admin',
  '22222222-2222-2222-2222-222222222222',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  updated_at = NOW();

-- Réactiver RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 6 : Créer les identités
-- ============================================
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
  '{"sub": "33333333-3333-3333-3333-333333333333", "email": "gebus.stephane@gmail.com"}',
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 'auth.users' as table_name, id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'gebus.stephane@gmail.com'
UNION ALL
SELECT 'public.users' as table_name, id, email, NULL, created_at 
FROM public.users 
WHERE email = 'gebus.stephane@gmail.com';
