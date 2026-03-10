-- ============================================================
-- Migration : Documents réglementaires conducteurs
-- Date      : 2026-02-28
-- Toutes les colonnes utilisent IF NOT EXISTS (idempotent).
-- ============================================================

-- ── Colonnes "historiques" potentiellement absentes ──────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'address') THEN
        ALTER TABLE drivers ADD COLUMN address TEXT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'city') THEN
        ALTER TABLE drivers ADD COLUMN city TEXT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'birth_date') THEN
        ALTER TABLE drivers ADD COLUMN birth_date DATE NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'hire_date') THEN
        ALTER TABLE drivers ADD COLUMN hire_date DATE NULL;
    END IF;
END $$;

-- CQC
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'cqc_card_number') THEN
        ALTER TABLE drivers ADD COLUMN cqc_card_number TEXT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'cqc_expiry') THEN
        ALTER TABLE drivers ADD COLUMN cqc_expiry DATE NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'cqc_category') THEN
        ALTER TABLE drivers ADD COLUMN cqc_category TEXT NULL
            CHECK (cqc_category IN ('PASSENGER', 'GOODS', 'BOTH'));
    END IF;
END $$;

-- Formations
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'fimo_expiry') THEN
        ALTER TABLE drivers ADD COLUMN fimo_expiry DATE NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'fcos_expiry') THEN
        ALTER TABLE drivers ADD COLUMN fcos_expiry DATE NULL;
    END IF;
END $$;

-- Aptitude médicale
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'medical_certificate_expiry') THEN
        ALTER TABLE drivers ADD COLUMN medical_certificate_expiry DATE NULL;
    END IF;
END $$;

-- ADR
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'adr_certificate_expiry') THEN
        ALTER TABLE drivers ADD COLUMN adr_certificate_expiry DATE NULL;
    END IF;
END $$;

-- Scores
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'safety_score') THEN
        ALTER TABLE drivers ADD COLUMN safety_score NUMERIC(5,2) NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'fuel_efficiency_score') THEN
        ALTER TABLE drivers ADD COLUMN fuel_efficiency_score NUMERIC(5,2) NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'total_distance_driven') THEN
        ALTER TABLE drivers ADD COLUMN total_distance_driven NUMERIC NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'avatar_url') THEN
        ALTER TABLE drivers ADD COLUMN avatar_url TEXT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'current_vehicle_id') THEN
        ALTER TABLE drivers ADD COLUMN current_vehicle_id UUID NULL;
    END IF;
END $$;

-- ── Nouveaux champs réglementaires ────────────────────────────────────────────

-- Carte conducteur numérique (tachographe)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'driver_card_number') THEN
        ALTER TABLE drivers ADD COLUMN driver_card_number TEXT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'driver_card_expiry') THEN
        ALTER TABLE drivers ADD COLUMN driver_card_expiry DATE NULL;
    END IF;
END $$;

-- FIMO — date d'obtention (distinct de fimo_expiry)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'fimo_date') THEN
        ALTER TABLE drivers ADD COLUMN fimo_date DATE NULL;
    END IF;
END $$;

-- Certificat ADR — classes (tableau de matières dangereuses)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'adr_classes') THEN
        ALTER TABLE drivers ADD COLUMN adr_classes TEXT[] NULL;
    END IF;
END $$;

-- Qualification Initiale conducteur (QI)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'qi_date') THEN
        ALTER TABLE drivers ADD COLUMN qi_date DATE NULL;
    END IF;
END $$;

-- Nationalité
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'nationality') THEN
        ALTER TABLE drivers ADD COLUMN nationality TEXT NULL;
    END IF;
END $$;

-- Numéro de sécurité sociale
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'social_security_number') THEN
        ALTER TABLE drivers ADD COLUMN social_security_number TEXT NULL;
    END IF;
END $$;

-- Type de contrat
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'contract_type') THEN
        ALTER TABLE drivers ADD COLUMN contract_type TEXT NULL
            CHECK (contract_type IN ('CDI', 'CDD', 'Intérim', 'Gérant', 'Autre'));
    END IF;
END $$;

-- Statut actif/inactif (booléen)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active') THEN
        ALTER TABLE drivers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- ── Index (après création de toutes les colonnes) ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_drivers_license_expiry      ON drivers (license_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_driver_card_expiry  ON drivers (driver_card_expiry)          WHERE driver_card_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_fimo_date           ON drivers (fimo_date)                   WHERE fimo_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_fcos_expiry         ON drivers (fcos_expiry)                 WHERE fcos_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_medical_expiry      ON drivers (medical_certificate_expiry)   WHERE medical_certificate_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_adr_expiry          ON drivers (adr_certificate_expiry)       WHERE adr_certificate_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_qi_date             ON drivers (qi_date)                     WHERE qi_date IS NOT NULL;

-- ── Commentaires ─────────────────────────────────────────────────────────────

COMMENT ON COLUMN drivers.driver_card_number      IS 'Numéro de la carte conducteur numérique (tachographe)';
COMMENT ON COLUMN drivers.driver_card_expiry      IS 'Date d''expiration de la carte conducteur';
COMMENT ON COLUMN drivers.fimo_date               IS 'Date d''obtention FIMO (Formation Initiale Minimum Obligatoire)';
COMMENT ON COLUMN drivers.fcos_expiry             IS 'Date d''expiration FCO (Formation Continue Obligatoire, validité 5 ans)';
COMMENT ON COLUMN drivers.adr_classes             IS 'Classes ADR autorisées (transport matières dangereuses)';
COMMENT ON COLUMN drivers.qi_date                 IS 'Date d''obtention de la Qualification Initiale conducteur';
COMMENT ON COLUMN drivers.nationality             IS 'Nationalité du conducteur';
COMMENT ON COLUMN drivers.social_security_number  IS 'Numéro de sécurité sociale (à chiffrer via Supabase Vault en production)';
COMMENT ON COLUMN drivers.contract_type           IS 'Type de contrat : CDI, CDD, Intérim, Gérant, Autre';
COMMENT ON COLUMN drivers.is_active               IS 'Conducteur actif (complémentaire au champ status)';
