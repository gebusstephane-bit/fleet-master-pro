-- ============================================
-- Création utilisateur : gebus.stephane@gmail.com
-- Mot de passe : Emilie57
-- 
-- IMPORTANT : Exécuter ce script dans l'ordre
-- Étape 1 : Créer l'entreprise
-- Étape 2 : Créer l'utilisateur dans auth.users (via l'interface)
-- Étape 3 : Lier l'utilisateur à l'entreprise
-- ============================================

-- ============================================
-- ÉTAPE 1 : Créer l'entreprise
-- ============================================
INSERT INTO companies (
  id,
  name, 
  siret, 
  address, 
  postal_code, 
  city, 
  country, 
  phone, 
  email,
  subscription_plan,
  subscription_status,
  max_vehicles,
  max_drivers
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
) ON CONFLICT (id) DO NOTHING;

-- Vérifier que l'entreprise est créée
SELECT id, name FROM companies WHERE id = '22222222-2222-2222-2222-222222222222';

-- ============================================
-- ÉTAPE 2 : Créer l'utilisateur dans auth.users
-- ============================================
-- ⚠️ CETTE ÉTAPE DOIT ÊTRE FAITE MANUELLEMENT DANS L'INTERFACE SUPABASE
--
-- 1. Va dans Authentication → Users
-- 2. Clique "New user"
-- 3. Email: gebus.stephane@gmail.com
-- 4. Password: Emilie57
-- 5. Coche "Auto-confirm email"
-- 6. Clique "Create user"
-- 7. Note l'UUID généré (ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
--
-- ============================================

-- ============================================
-- ÉTAPE 3 : Lier l'utilisateur à l'entreprise
-- REMPLACER [USER_UUID] par l'UUID de l'étape 2
-- ============================================

-- Désactiver temporairement RLS pour cette insertion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insérer l'utilisateur (remplace [USER_UUID] par le vrai UUID)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  role,
  company_id,
  created_at
) VALUES (
  '[USER_UUID]',  -- ← REMPLACER ICI (ex: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  'gebus.stephane@gmail.com',
  'Stephane',
  'Gebus',
  'admin',
  '22222222-2222-2222-2222-222222222222',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : Créer des véhicules de démo
-- ============================================
INSERT INTO vehicles (
  company_id, registration_number, brand, model, year, type, fuel_type, 
  vin, color, mileage, status, next_maintenance_date, insurance_expiry
) VALUES
  ('22222222-2222-2222-2222-222222222222', 'AA-123-AA', 'Renault', 'Master', 2022, 'van', 'diesel', 'VF1MA000000000001', 'Blanc', 45230, 'active', '2024-03-15', '2024-12-31'),
  ('22222222-2222-2222-2222-222222222222', 'BB-456-BB', 'Mercedes', 'Sprinter', 2023, 'van', 'diesel', 'WDB90600000000001', 'Gris', 28450, 'active', '2024-04-20', '2024-11-30'),
  ('22222222-2222-2222-2222-222222222222', 'CC-789-CC', 'Iveco', 'Daily', 2021, 'truck', 'diesel', 'ZCFD55A0000000001', 'Bleu', 67890, 'maintenance', '2024-02-01', '2024-10-15')
ON CONFLICT DO NOTHING;

-- ============================================
-- ÉTAPE 5 : Créer des chauffeurs de démo
-- ============================================
INSERT INTO drivers (
  company_id, first_name, last_name, email, phone, status, 
  license_number, license_type, license_expiry, safety_score, fuel_efficiency_score
) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Pierre', 'Martin', 'pierre.martin@example.com', '0612345678', 'active', '123456789', 'C', '2026-03-15', 92, 88),
  ('22222222-2222-2222-2222-222222222222', 'Jean', 'Dupont', 'jean.dupont@example.com', '0623456789', 'active', '987654321', 'C', '2027-07-22', 85, 82),
  ('22222222-2222-2222-2222-222222222222', 'Marie', 'Dubois', 'marie.dubois@example.com', '0634567890', 'active', '456789123', 'C1', '2028-11-08', 95, 91)
ON CONFLICT DO NOTHING;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  c.name as company_name,
  c.subscription_plan
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'gebus.stephane@gmail.com';
