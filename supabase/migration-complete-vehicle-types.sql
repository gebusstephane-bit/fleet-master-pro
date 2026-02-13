-- ============================================
-- MIGRATION COMPLÈTE : Harmonisation des types véhicules
-- Objectif : Unifier tous les types vers VOITURE/FOURGON/POIDS_LOURD/POIDS_LOURD_FRIGO
-- ============================================

-- Étape 0 : Désactiver temporairement les contraintes pour éviter les erreurs
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

-- Étape 1 : Mettre à jour les véhicules existants
-- On convertit les anciens types vers les nouveaux
UPDATE vehicles 
SET type = CASE type
    WHEN 'car' THEN 'VOITURE'
    WHEN 'van' THEN 'FOURGON'  
    WHEN 'truck' THEN 'POIDS_LOURD'
    WHEN 'motorcycle' THEN 'VOITURE'  -- Les motos suivent les règles voiture
    WHEN 'trailer' THEN 'FOURGON'     -- Les remorques comme fourgon
    ELSE 'VOITURE'  -- Valeur par défaut si type inconnu
END/
SET type = 'VOITURE'
WHERE type IS NULL OR type = '';

-- Étape 3 : Ajouter la nouvelle contrainte CHECK avec les 4 types valides
ALTER TABLE vehicles ADD CONSTRAINT vehicles_type_check 
CHECK (type IN ('VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO'));

-- ============================================
-- AJOUT DES ÉCHÉANCES RÉGLEMENTAIRES (si pas déjà fait)
-- ============================================

-- Ajouter les colonnes pour les échéances
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS technical_control_date DATE,
ADD COLUMN IF NOT EXISTS technical_control_expiry DATE,
ADD COLUMN IF NOT EXISTS tachy_control_date DATE,
ADD COLUMN IF NOT EXISTS tachy_control_expiry DATE,
ADD COLUMN IF NOT EXISTS atp_date DATE,
ADD COLUMN IF NOT EXISTS atp_expiry DATE,
ADD COLUMN IF NOT EXISTS dates_auto_calculated BOOLEAN DEFAULT true;

-- Mettre à jour les véhicules existants qui ont une date CT
-- Calculer les expirations selon le type
UPDATE vehicles 
SET 
    technical_control_expiry = CASE
        WHEN type IN ('POIDS_LOURD', 'POIDS_LOURD_FRIGO') 
        THEN technical_control_date + INTERVAL '1 year'
        ELSE technical_control_date + INTERVAL '2 years'
    END,
    dates_auto_calculated = true
WHERE technical_control_date IS NOT NULL 
  AND technical_control_expiry IS NULL;

-- ============================================
-- FONCTION TRIGGER POUR CALCUL AUTO
-- ============================================

-- Créer la fonction de calcul automatique
CREATE OR REPLACE FUNCTION calculate_vehicle_expiry_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer l'expiration CT selon le type
    IF NEW.technical_control_date IS NOT NULL THEN
        IF NEW.type IN ('POIDS_LOURD', 'POIDS_LOURD_FRIGO') THEN
            NEW.technical_control_expiry := NEW.technical_control_date + INTERVAL '1 year';
        ELSE
            NEW.technical_control_expiry := NEW.technical_control_date + INTERVAL '2 years';
        END IF;
    END IF;
    
    -- Calculer l'expiration tachygraphe (+2 ans)
    IF NEW.tachy_control_date IS NOT NULL THEN
        NEW.tachy_control_expiry := NEW.tachy_control_date + INTERVAL '2 years';
    END IF;
    
    -- Calculer l'expiration ATP (+5 ans)
    IF NEW.atp_date IS NOT NULL THEN
        NEW.atp_expiry := NEW.atp_date + INTERVAL '5 years';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_calculate_vehicle_dates ON vehicles;
CREATE TRIGGER trigger_calculate_vehicle_dates
    BEFORE INSERT OR UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_vehicle_expiry_dates();

-- ============================================
-- MISE À JOUR DES ALERTES - Ajouter les nouveaux types
-- ============================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;

-- Ajouter la nouvelle contrainte avec les types d'échéances réglementaires
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check 
CHECK (type IN (
    'insurance', 
    'vehicle_issue', 
    'maintenance', 
    'safety',
    'tachy_control',      -- Contrôle tachygraphe
    'atp_expiry',         -- Expiration ATP
    'technical_control'   -- Contrôle technique
));

-- ============================================
-- VUE POUR LES ALERTES RÉGLEMENTAIRES
-- ============================================

CREATE OR REPLACE VIEW vehicle_regulatory_alerts AS
SELECT 
    v.id as vehicle_id,
    v.registration_number,
    v.brand,
    v.model,
    v.type,
    v.company_id,
    
    -- CT
    v.technical_control_date,
    v.technical_control_expiry,
    CASE 
        WHEN v.technical_control_expiry IS NULL THEN NULL
        WHEN v.technical_control_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN v.technical_control_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'URGENT'
        WHEN v.technical_control_expiry <= CURRENT_DATE + INTERVAL '60 days' THEN 'WARNING'
        ELSE 'OK'
    END as ct_status,
    
    -- Tachy
    v.tachy_control_date,
    v.tachy_control_expiry,
    CASE 
        WHEN v.tachy_control_expiry IS NULL THEN NULL
        WHEN v.tachy_control_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN v.tachy_control_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'URGENT'
        WHEN v.tachy_control_expiry <= CURRENT_DATE + INTERVAL '60 days' THEN 'WARNING'
        ELSE 'OK'
    END as tachy_status,
    
    -- ATP
    v.atp_date,
    v.atp_expiry,
    CASE 
        WHEN v.atp_expiry IS NULL THEN NULL
        WHEN v.atp_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN v.atp_expiry <= CURRENT_DATE + INTERVAL '90 days' THEN 'URGENT'
        WHEN v.atp_expiry <= CURRENT_DATE + INTERVAL '180 days' THEN 'WARNING'
        ELSE 'OK'
    END as atp_status
    
FROM vehicles v
WHERE v.status = 'active';

-- ============================================
-- COMMENTAIRES DOCUMENTATION
-- ============================================

COMMENT ON COLUMN vehicles.type IS 'Type de véhicule: VOITURE (CT 2ans), FOURGON (CT 2ans), POIDS_LOURD (CT 1an + Tachy 2ans), POIDS_LOURD_FRIGO (CT 1an + Tachy 2ans + ATP 5ans)';
COMMENT ON COLUMN vehicles.technical_control_date IS 'Date du dernier contrôle technique effectué';
COMMENT ON COLUMN vehicles.technical_control_expiry IS 'Date d''expiration du CT (calculée auto: 2 ans VL, 1 an PL)';
COMMENT ON COLUMN vehicles.tachy_control_date IS 'Date du dernier contrôle tachygraphe (PL uniquement)';
COMMENT ON COLUMN vehicles.tachy_control_expiry IS 'Date d''expiration tachygraphe (+2 ans, calculée auto)';
COMMENT ON COLUMN vehicles.atp_date IS 'Date de l''attestation ATP (PL Frigo uniquement)';
COMMENT ON COLUMN vehicles.atp_expiry IS 'Date d''expiration ATP (+5 ans, calculée auto)';

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que tous les véhicules ont un type valide
SELECT 
    type, 
    COUNT(*) as count,
    CASE 
        WHEN type IN ('VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO') 
        THEN '✅ VALIDE' 
        ELSE '❌ INVALIDE' 
    END as status
FROM vehicles 
GROUP BY type;
