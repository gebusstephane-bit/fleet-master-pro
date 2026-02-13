-- ============================================
-- MIGRATION: Ajout des échéances réglementaires
-- CT, Tachygraphe, ATP selon type véhicule
-- ============================================

-- 1. Ajouter les nouvelles colonnes pour les échéances réglementaires
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS technical_control_date DATE,
ADD COLUMN IF NOT EXISTS technical_control_expiry DATE,
ADD COLUMN IF NOT EXISTS tachy_control_date DATE,
ADD COLUMN IF NOT EXISTS tachy_control_expiry DATE,
ADD COLUMN IF NOT EXISTS atp_date DATE,
ADD COLUMN IF NOT EXISTS atp_expiry DATE,
ADD COLUMN IF NOT EXISTS dates_auto_calculated BOOLEAN DEFAULT true;

-- 2. Supprimer d'abord la contrainte check existante sur le type
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

-- 3. Mettre à jour les types existants vers les nouvelles valeurs
DO $$
BEGIN
    -- Mettre à jour les anciens types vers les nouvelles valeurs
    UPDATE vehicles 
    SET type = CASE type
        WHEN 'car' THEN 'VOITURE'
        WHEN 'van' THEN 'FOURGON'
        WHEN 'truck' THEN 'POIDS_LOURD'
        WHEN 'motorcycle' THEN 'VOITURE'  -- Les motos suivent les règles voiture
        WHEN 'trailer' THEN 'FOURGON'     -- Les remorques comme fourgon
        ELSE COALESCE(type, 'VOITURE')
    END
    WHERE type IN ('car', 'truck', 'van', 'motorcycle', 'trailer');
END $$;

-- 4. Ajouter la nouvelle contrainte check avec les types valides
ALTER TABLE vehicles ADD CONSTRAINT vehicles_type_check 
CHECK (type IN ('VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO'));

-- 5. Mettre à jour les véhicules existants qui ont une date CT
-- Calculer les dates d'expiration selon le type
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

-- 6. Ajouter les types d'alertes supplémentaires dans la table alerts
-- Vérifier si la contrainte existe et la modifier si nécessaire
DO $$
BEGIN
    -- Supprimer la contrainte existante si elle existe
    ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
    
    -- Ajouter la nouvelle contrainte avec les types supplémentaires
    ALTER TABLE alerts ADD CONSTRAINT alerts_type_check 
    CHECK (type IN (
        'insurance', 
        'vehicle_issue', 
        'maintenance', 
        'safety',
        'tachy_control',      -- Nouveau: contrôle tachygraphe
        'atp_expiry'          -- Nouveau: expiration ATP
    ));
EXCEPTION
    WHEN OTHERS THEN
        -- La contrainte n'existe pas ou autre erreur, ignorer
        NULL;
END $$;

-- 7. Créer une fonction pour calculer automatiquement les dates d'expiration
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

-- 8. Créer le trigger pour calculer automatiquement les dates
DROP TRIGGER IF EXISTS trigger_calculate_vehicle_dates ON vehicles;
CREATE TRIGGER trigger_calculate_vehicle_dates
    BEFORE INSERT OR UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_vehicle_expiry_dates();

-- 9. Créer une vue pour faciliter l'affichage des alertes
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

-- 10. Commentaires sur les colonnes
COMMENT ON COLUMN vehicles.type IS 'Type de véhicule: VOITURE, FOURGON, POIDS_LOURD, POIDS_LOURD_FRIGO';
COMMENT ON COLUMN vehicles.technical_control_date IS 'Date du dernier contrôle technique';
COMMENT ON COLUMN vehicles.technical_control_expiry IS 'Date d''expiration du CT (calculée auto: 2 ans VL, 1 an PL)';
COMMENT ON COLUMN vehicles.tachy_control_date IS 'Date du dernier contrôle tachygraphe (PL uniquement)';
COMMENT ON COLUMN vehicles.tachy_control_expiry IS 'Date d''expiration tachygraphe (+2 ans, calculée auto)';
COMMENT ON COLUMN vehicles.atp_date IS 'Date de l''attestation ATP (PL Frigo uniquement)';
COMMENT ON COLUMN vehicles.atp_expiry IS 'Date d''expiration ATP (+5 ans, calculée auto)';

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Exécuter cette migration dans Supabase SQL Editor
-- 2. Les véhicules existants avec une date CT seront automatiquement mis à jour
-- 3. Les nouvelles dates seront calculées automatiquement via le trigger
-- ============================================
