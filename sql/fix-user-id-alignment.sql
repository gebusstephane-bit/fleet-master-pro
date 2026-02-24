-- =====================================================
-- FIX: Alignement ID Auth <-> Profile + Création société
-- =====================================================

-- -----------------------------------------------------
-- ÉTAPE 1: Créer la société manquante
-- -----------------------------------------------------
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
    stripe_customer_id,
    stripe_subscription_id,
    max_vehicles,
    max_drivers,
    created_at,
    updated_at,
    logo_url,
    onboarding_completed
) VALUES (
    '18bd98ac-9c3b-4794-8729-218bf0e41927',
    'FleetMaster Pro',
    '00000000000000',
    'Adresse à définir',
    '75000',
    'Paris',
    'France',
    '+33 1 23 45 67 89',
    'contact@fleet-master.fr',
    'enterprise',
    'active',
    NULL,
    NULL,
    999,
    999,
    NOW(),
    NOW(),
    NULL,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- -----------------------------------------------------
-- ÉTAPE 2: Aligner l'ID du profile avec l'ID Auth
-- -----------------------------------------------------
-- Récupérer l'ancien ID et mettre à jour
DO $$
DECLARE
    old_profile_id UUID;
    new_profile_id UUID := '1d519173-16d4-4cbd-a71f-6000cae39039'::UUID;
    profile_email TEXT := 'contact@fleet-master.fr';
BEGIN
    -- Récupérer l'ancien ID du profile
    SELECT id INTO old_profile_id 
    FROM profiles 
    WHERE email = profile_email;
    
    IF old_profile_id IS NULL THEN
        RAISE EXCEPTION 'Profile non trouvé pour l email %', profile_email;
    END IF;
    
    -- Si l'ID est déjà correct, ne rien faire
    IF old_profile_id = new_profile_id THEN
        RAISE NOTICE 'ID déjà aligné';
        RETURN;
    END IF;
    
    -- Vérifier si un profile existe déjà avec le nouvel ID
    IF EXISTS (SELECT 1 FROM profiles WHERE id = new_profile_id) THEN
        DELETE FROM profiles WHERE id = old_profile_id;
        RAISE NOTICE 'Ancien profile supprimé (doublon)';
    ELSE
        UPDATE profiles SET id = new_profile_id WHERE id = old_profile_id;
        RAISE NOTICE 'ID du profile mis à jour';
    END IF;
END $$;

-- -----------------------------------------------------
-- VÉRIFICATION
-- -----------------------------------------------------
SELECT 'PROFILE' as type, id::text, email, company_id::text, role 
FROM profiles 
WHERE email = 'contact@fleet-master.fr'
UNION ALL
SELECT 'COMPANY' as type, id::text, email, NULL, NULL
FROM companies 
WHERE id = '18bd98ac-9c3b-4794-8729-218bf0e41927';
