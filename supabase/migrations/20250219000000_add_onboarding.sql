-- Migration: Ajout du système d'onboarding
-- Date: 2026-02-19
-- Description: Ajoute la colonne onboarding_completed à la table companies

-- Étape 1: Ajouter la colonne avec DEFAULT FALSE pour les nouvelles entreprises
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Étape 2: Backfill - Les entreprises existantes sont considérées comme ayant complété l'onboarding
UPDATE companies 
SET onboarding_completed = TRUE 
WHERE onboarding_completed IS NULL;

-- Étape 3: Ajouter des colonnes optionnelles pour enrichir le profil entreprise (si pas déjà présentes)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS fleet_size INTEGER,
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Étape 4: Créer un index pour optimiser les vérifications d'onboarding
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed 
ON companies(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Étape 5: Mettre à jour le trigger de création d'entreprise pour initialiser onboarding_started_at
CREATE OR REPLACE FUNCTION tr_create_starter_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer l'abonnement Starter
    INSERT INTO subscriptions (
        company_id,
        plan,
        status,
        vehicle_limit,
        user_limit,
        features
    ) VALUES (
        NEW.id,
        'STARTER',
        'ACTIVE',
        5,
        2,
        '{"basic_features": true}'::jsonb
    );
    
    -- Initialiser l'onboarding
    NEW.onboarding_started_at := NOW();
    NEW.onboarding_completed := FALSE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vérification
SELECT 
    'Migration appliquée avec succès' as status,
    COUNT(*) as total_companies,
    COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed,
    COUNT(*) FILTER (WHERE onboarding_completed = FALSE) as pending
FROM companies;
