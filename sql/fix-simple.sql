-- =====================================================
-- FIX SIMPLE: Société + Alignement ID (avec FK user_appearance_settings)
-- =====================================================

-- 1. Créer la société (avec 'pro' au lieu de 'enterprise')
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers, created_at, updated_at, onboarding_completed)
VALUES ('18bd98ac-9c3b-4794-8729-218bf0e41927', 'FleetMaster Pro', '00000000000000', 'Adresse à définir', '75000', 'Paris', 'France', '+33 1 23 45 67 89', 'contact@fleet-master.fr', 'pro', 'active', 999, 999, NOW(), NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Mettre à jour user_appearance_settings d'abord (FK vers profiles)
UPDATE user_appearance_settings 
SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');

-- 3. Mettre à jour l'ID du profile
UPDATE profiles 
SET id = '1d519173-16d4-4cbd-a71f-6000cae39039'
WHERE email = 'contact@fleet-master.fr';

-- 4. Vérification
SELECT 'PROFILE' as type, id::text, email, company_id::text, role 
FROM profiles 
WHERE email = 'contact@fleet-master.fr';
