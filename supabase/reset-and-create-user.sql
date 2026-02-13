-- ============================================
-- SCRIPT COMPLET : Reset + Création utilisateur
-- Exécuter ligne par ligne si nécessaire
-- ============================================

-- ============================================
-- ÉTAPE 1 : SUPPRESSION COMPLÈTE (dans l'ordre)
-- ============================================

-- Supprimer des tables filles d'abord (si existent)
DELETE FROM public.alerts WHERE company_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.maintenance_records WHERE company_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.vehicle_documents WHERE company_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.vehicles WHERE company_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.drivers WHERE company_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.users WHERE email = 'gebus.stephane@gmail.com';
DELETE FROM public.companies WHERE id = '22222222-2222-2222-2222-222222222222';

-- Supprimer de auth (très important !)
DELETE FROM auth.identities WHERE user_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM auth.users WHERE email = 'gebus.stephane@gmail.com';

-- ============================================
-- ÉTAPE 2 : CRÉATION ENTREPRISE
-- ============================================
INSERT INTO public.companies (
  id, name, siret, address, postal_code, city, country, 
  phone, email, subscription_plan, subscription_status, 
  max_vehicles, max_drivers
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
);

-- ============================================
-- ÉTAPE 3 : CRÉATION UTILISATEUR AUTH (avec mot de passe)
-- ============================================
-- Utilise la fonction crypt de pgcrypto

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmed_at,
  recovery_sent_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  email_change,
  email_change_sent_at,
  phone_change,
  phone_change_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'gebus.stephane@gmail.com',
  crypt('Emilie57', gen_salt('bf', 10)),
  NOW(),
  NOW(),
  NOW(),
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Stephane", "last_name": "Gebus"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- ============================================
-- ÉTAPE 4 : CRÉATION IDENTITÉ
-- ============================================
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  jsonb_build_object(
    'sub', '33333333-3333-3333-3333-333333333333',
    'email', 'gebus.stephane@gmail.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- ============================================
-- ÉTAPE 5 : CRÉATION UTILISATEUR PUBLIC (désactiver RLS temporairement)
-- ============================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  role,
  company_id,
  created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'gebus.stephane@gmail.com',
  'Stephane',
  'Gebus',
  'admin',
  '22222222-2222-2222-2222-222222222222',
  NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 6 : CRÉER VÉHICULES DÉMO
-- ============================================
INSERT INTO public.vehicles (
  id, company_id, registration_number, brand, model, year, type, fuel_type, 
  vin, color, mileage, status, next_maintenance_date, insurance_expiry
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'AA-123-AA', 'Renault', 'Master', 2022, 'van', 'diesel', 'VF1MA000000000001', 'Blanc', 45230, 'active', '2024-03-15', '2024-12-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'BB-456-BB', 'Mercedes', 'Sprinter', 2023, 'van', 'diesel', 'WDB90600000000001', 'Gris', 28450, 'active', '2024-04-20', '2024-11-30'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'CC-789-CC', 'Iveco', 'Daily', 2021, 'truck', 'diesel', 'ZCFD55A0000000001', 'Bleu', 67890, 'maintenance', '2024-02-01', '2024-10-15');

-- ============================================
-- ÉTAPE 7 : CRÉER CHAUFFEURS DÉMO
-- ============================================
INSERT INTO public.drivers (
  id, company_id, first_name, last_name, email, phone, status, 
  license_number, license_type, license_expiry, safety_score, fuel_efficiency_score
) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Pierre', 'Martin', 'pierre.martin@example.com', '0612345678', 'active', '123456789', 'C', '2026-03-15', 92, 88),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Jean', 'Dupont', 'jean.dupont@example.com', '0623456789', 'active', '987654321', 'C', '2027-07-22', 85, 82),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'Marie', 'Dubois', 'marie.dubois@example.com', '0634567890', 'active', '456789123', 'C1', '2028-11-08', 95, 91);

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT 
  '=== AUTHENTIFICATION ===' as section,
  id::text,
  email,
  CASE WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmé' ELSE '❌ Non confirmé' END as email_status,
  CASE WHEN encrypted_password IS NOT NULL THEN '✅ Password set' ELSE '❌ No password' END as password_status
FROM auth.users 
WHERE email = 'gebus.stephane@gmail.com'

UNION ALL

SELECT 
  '=== PUBLIC USERS ===' as section,
  id::text,
  email,
  role,
  company_id::text
FROM public.users 
WHERE email = 'gebus.stephane@gmail.com'

UNION ALL

SELECT 
  '=== COMPANY ===' as section,
  id::text,
  name,
  subscription_plan,
  subscription_status
FROM public.companies 
WHERE id = '22222222-2222-2222-2222-222222222222';
