-- Créer un compte de test manuellement (bypass Supabase Auth rate limiting)
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Créer l'entreprise
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers)
VALUES (
  gen_random_uuid(),
  'Transport Test',
  '12345678900012',
  '1 rue de Test',
  '75000',
  'Paris',
  'France',
  '0612345678',
  'test@fleetmaster.pro',
  'starter',
  'trialing',
  1,
  1
)
RETURNING id;

-- 2. Créer l'utilisateur dans auth.users (nécessite admin)
-- Note: Ce script doit être exécuté avec les privilèges admin Supabase
-- ou via l'API admin

-- Alternative: Utiliser la fonction RPC
-- SELECT create_test_user('test@fleetmaster.pro', 'password123');
