-- ============================================
-- FIX: Triggers de notification corrigés
-- Gère l'absence de company_id dans certaines tables
-- ============================================

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS column_exists(text, text);

-- Vérifier si la fonction column_exists existe
CREATE OR REPLACE FUNCTION column_exists(p_table text, p_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = p_table 
        AND c.column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. FONCTION: Notification maintenance (CORRIGÉE)
-- ============================================
CREATE OR REPLACE FUNCTION notify_maintenance_due()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_user RECORD;
    days_until INTEGER;
    has_company_id BOOLEAN;
    has_next_service BOOLEAN;
BEGIN
    -- Vérifier si next_service_date existe
    has_next_service := column_exists('maintenance_records', 'next_service_date');
    IF NOT has_next_service THEN
        RETURN NEW;
    END IF;
    
    -- Vérifier si la valeur est NULL
    IF NEW.next_service_date IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculer les jours jusqu'à la maintenance
    days_until := NEW.next_service_date - CURRENT_DATE;
    
    -- Notification uniquement pour 7j, 3j, 1j avant
    IF days_until NOT IN (7, 3, 1) THEN
        RETURN NEW;
    END IF;
    
    -- Récupérer company_id selon la structure disponible
    has_company_id := column_exists('vehicles', 'company_id');
    
    IF has_company_id THEN
        -- Structure avec company_id sur vehicles
        SELECT v.company_id INTO v_company_id 
        FROM vehicles v 
        WHERE v.id = NEW.vehicle_id;
    ELSE
        -- Fallback: chercher dans maintenance_records
        BEGIN
            SELECT company_id INTO v_company_id 
            FROM maintenance_records 
            WHERE id = NEW.id;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
    END IF;
    
    -- Si pas de company_id, on ne peut pas notifier
    IF v_company_id IS NULL THEN
        -- Créer une notification système sans company_id
        FOR v_user IN 
            SELECT id FROM profiles 
            WHERE role IN ('ADMIN', 'DIRECTEUR')
            LIMIT 10
        LOOP
            INSERT INTO notifications (
                user_id, company_id, type, title, message, data, priority
            ) VALUES (
                v_user.id,
                NULL, -- company_id inconnu
                'maintenance_due',
                'Maintenance prévue dans ' || days_until || ' jours',
                'Le véhicule nécessite une maintenance le ' || NEW.next_service_date,
                jsonb_build_object(
                    'vehicle_id', NEW.vehicle_id,
                    'maintenance_id', NEW.id,
                    'service_date', NEW.next_service_date,
                    'days_until', days_until
                ),
                CASE WHEN days_until = 1 THEN 'high' ELSE 'normal' END
            );
        END LOOP;
        RETURN NEW;
    END IF;
    
    -- Créer notification pour tous les admins/agents de l'entreprise
    FOR v_user IN 
        SELECT id FROM profiles 
        WHERE company_id = v_company_id 
        AND role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
    LOOP
        INSERT INTO notifications (
            user_id, company_id, type, title, message, data, priority
        ) VALUES (
            v_user.id,
            v_company_id,
            'maintenance_due',
            'Maintenance prévue dans ' || days_until || ' jours',
            'Le véhicule nécessite une maintenance le ' || NEW.next_service_date,
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'maintenance_id', NEW.id,
                'service_date', NEW.next_service_date,
                'days_until', days_until
            ),
            CASE WHEN days_until = 1 THEN 'high' ELSE 'normal' END
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FONCTION: Notification documents (CORRIGÉE)
-- ============================================
CREATE OR REPLACE FUNCTION notify_document_expiring()
RETURNS TRIGGER AS $$
DECLARE
    v_expiry_date DATE;
    v_days_until INTEGER;
    v_doc_type TEXT;
    v_title TEXT;
    v_record_id UUID;
    v_table TEXT;
BEGIN
    v_table := TG_TABLE_NAME;
    v_record_id := NEW.id;
    
    -- Détecter quel document est mis à jour selon la table
    IF v_table = 'drivers' THEN
        -- Vérifier si license_expiry existe
        IF column_exists('drivers', 'license_expiry') THEN
            v_expiry_date := NEW.license_expiry;
            v_doc_type := 'permis de conduire';
            
            -- Construire le nom
            IF column_exists('drivers', 'first_name') AND column_exists('drivers', 'last_name') THEN
                v_title := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
            ELSE
                v_title := 'Chauffeur ' || v_record_id::text;
            END IF;
        END IF;
        
    ELSIF v_table = 'vehicles' THEN
        -- Vérifier quelle colonne a changé
        IF column_exists('vehicles', 'insurance_expiry') AND 
           (TG_OP = 'INSERT' OR OLD.insurance_expiry IS DISTINCT FROM NEW.insurance_expiry) THEN
            v_expiry_date := NEW.insurance_expiry;
            v_doc_type := 'assurance';
            
        ELSIF column_exists('vehicles', 'technical_control_expiry') AND 
              (TG_OP = 'INSERT' OR OLD.technical_control_expiry IS DISTINCT FROM NEW.technical_control_expiry) THEN
            v_expiry_date := NEW.technical_control_expiry;
            v_doc_type := 'contrôle technique';
        END IF;
        
        -- Récupérer l'immatriculation
        IF column_exists('vehicles', 'registration_number') THEN
            v_title := COALESCE(NEW.registration_number, 'Véhicule ' || v_record_id::text);
        ELSE
            v_title := 'Véhicule ' || v_record_id::text;
        END IF;
    END IF;
    
    -- Si pas de date d'expiration, sortir
    IF v_expiry_date IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculer les jours restants
    v_days_until := v_expiry_date - CURRENT_DATE;
    
    -- Notifier 30j, 15j, 7j, 1j avant expiration
    IF v_days_until IN (30, 15, 7, 1) THEN
        
        -- Déterminer le company_id
        IF column_exists(v_table, 'company_id') AND NEW.company_id IS NOT NULL THEN
            -- Structure avec company_id sur la table
            INSERT INTO notifications (
                user_id, company_id, type, title, message, data, priority
            )
            SELECT 
                p.id,
                p.company_id,
                'document_expiring',
                v_doc_type || ' expire dans ' || v_days_until || ' jours',
                v_title || ' - ' || v_doc_type || ' expire le ' || v_expiry_date,
                jsonb_build_object(
                    'driver_id', CASE WHEN v_table = 'drivers' THEN v_record_id ELSE NULL END,
                    'vehicle_id', CASE WHEN v_table = 'vehicles' THEN v_record_id ELSE NULL END,
                    'document_type', v_doc_type,
                    'expiry_date', v_expiry_date,
                    'days_until', v_days_until
                ),
                CASE WHEN v_days_until <= 7 THEN 'high' ELSE 'normal' END
            FROM profiles p
            WHERE p.company_id = NEW.company_id
            AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC');
            
        ELSE
            -- Fallback: notifier tous les admins
            INSERT INTO notifications (
                user_id, company_id, type, title, message, data, priority
            )
            SELECT 
                p.id,
                NULL,
                'document_expiring',
                v_doc_type || ' expire dans ' || v_days_until || ' jours',
                v_title || ' - ' || v_doc_type || ' expire le ' || v_expiry_date,
                jsonb_build_object(
                    'driver_id', CASE WHEN v_table = 'drivers' THEN v_record_id ELSE NULL END,
                    'vehicle_id', CASE WHEN v_table = 'vehicles' THEN v_record_id ELSE NULL END,
                    'document_type', v_doc_type,
                    'expiry_date', v_expiry_date,
                    'days_until', v_days_until
                ),
                CASE WHEN v_days_until <= 7 THEN 'high' ELSE 'normal' END
            FROM profiles p
            WHERE p.role IN ('ADMIN', 'DIRECTEUR')
            LIMIT 10;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. SUPPRIMER ET RECRÉER LES TRIGGERS
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS tr_notify_maintenance ON maintenance_records;
DROP TRIGGER IF EXISTS tr_notify_license_expiry ON drivers;
DROP TRIGGER IF EXISTS tr_notify_vehicle_docs ON vehicles;

-- Recreate maintenance trigger (only if column exists)
DO $$
BEGIN
    IF column_exists('maintenance_records', 'next_service_date') THEN
        CREATE TRIGGER tr_notify_maintenance
            AFTER INSERT OR UPDATE OF next_service_date ON maintenance_records
            FOR EACH ROW
            EXECUTE FUNCTION notify_maintenance_due();
    END IF;
END $$;

-- Recreate drivers trigger (only if column exists)
DO $$
BEGIN
    IF column_exists('drivers', 'license_expiry') THEN
        CREATE TRIGGER tr_notify_license_expiry
            AFTER INSERT OR UPDATE OF license_expiry ON drivers
            FOR EACH ROW
            EXECUTE FUNCTION notify_document_expiring();
    END IF;
END $$;

-- Recreate vehicles trigger (only if columns exist)
DO $$
BEGIN
    IF column_exists('vehicles', 'insurance_expiry') OR 
       column_exists('vehicles', 'technical_control_expiry') THEN
        CREATE TRIGGER tr_notify_vehicle_docs
            AFTER INSERT OR UPDATE OF insurance_expiry, technical_control_expiry ON vehicles
            FOR EACH ROW
            EXECUTE FUNCTION notify_document_expiring();
    END IF;
END $$;

-- ============================================
-- 4. METTRE À JOUR LES POLICIES RLS
-- ============================================

-- Permettre company_id NULL dans notifications
ALTER TABLE notifications ALTER COLUMN company_id DROP NOT NULL;

SELECT 'Triggers de notification corrigés avec succès!' as status;
