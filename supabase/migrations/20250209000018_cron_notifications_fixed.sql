-- ============================================
-- CRON JOBS POUR NOTIFICATIONS AUTOMATIQUES
-- FleetMaster Pro - VERSION CORRIGÉE
-- ============================================

-- Vérifier que l'extension pg_cron est active
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 1. FONCTION: Vérifier maintenances dues
-- ============================================
CREATE OR REPLACE FUNCTION check_maintenance_due()
RETURNS void AS $$
DECLARE
    v_maintenance RECORD;
    v_user RECORD;
    days_until INTEGER;
    v_type TEXT;
BEGIN
    -- Parcourir les maintenances avec rdv_date (date de rendezous)
    FOR v_maintenance IN 
        SELECT 
            m.id,
            m.vehicle_id,
            m.rdv_date as next_service_date,
            m.type as maintenance_type,
            v.registration_number as vehicle_name
        FROM maintenance_records m
        LEFT JOIN vehicles v ON v.id = m.vehicle_id
        WHERE m.rdv_date IS NOT NULL
        AND m.status NOT IN ('TERMINEE', 'completed')
    LOOP
        -- Calculer jours restants
        days_until := v_maintenance.next_service_date - CURRENT_DATE;
        
        -- Notifications pour 7j, 3j, 1j avant et retard
        IF days_until IN (7, 3, 1, 0, -1, -3) OR days_until < -7 THEN
            -- Type de maintenance
            v_type := COALESCE(v_maintenance.maintenance_type, 'Maintenance');
            
            FOR v_user IN 
                SELECT id FROM profiles 
                WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
            LOOP
                -- Vérifier si notification déjà envoyée aujourd'hui
                IF NOT EXISTS (
                    SELECT 1 FROM notifications 
                    WHERE user_id = v_user.id
                    AND type = CASE WHEN days_until < 0 THEN 'maintenance_overdue' ELSE 'maintenance_due' END
                    AND data->>'maintenance_id' = v_maintenance.id::text
                    AND created_at > CURRENT_DATE
                ) THEN
                    INSERT INTO notifications (
                        user_id, type, title, message, data, priority
                    ) VALUES (
                        v_user.id,
                        CASE WHEN days_until < 0 THEN 'maintenance_overdue' ELSE 'maintenance_due' END,
                        CASE 
                            WHEN days_until < 0 THEN 'Maintenance EN RETARD de ' || ABS(days_until) || ' jours'
                            ELSE 'Maintenance dans ' || days_until || ' jours'
                        END,
                        COALESCE(v_maintenance.vehicle_name, 'Véhicule') || ' - ' || v_type || 
                        CASE 
                            WHEN days_until < 0 THEN ' (depuis le ' || v_maintenance.next_service_date || ')'
                            ELSE ' prévue le ' || v_maintenance.next_service_date
                        END,
                        jsonb_build_object(
                            'maintenance_id', v_maintenance.id,
                            'vehicle_id', v_maintenance.vehicle_id,
                            'vehicle_name', v_maintenance.vehicle_name,
                            'service_type', v_type,
                            'due_date', v_maintenance.next_service_date,
                            'days_until', days_until
                        ),
                        CASE 
                            WHEN days_until < 0 OR days_until = 1 THEN 'high'
                            WHEN days_until <= 3 THEN 'medium'
                            ELSE 'normal'
                        END
                    );
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FONCTION: Vérifier documents expirants
-- ============================================
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS void AS $$
DECLARE
    v_doc RECORD;
    v_user RECORD;
    days_until INTEGER;
BEGIN
    -- Vérifier les permis de conduire
    IF column_exists('drivers', 'license_expiry') THEN
        FOR v_doc IN 
            SELECT 
                d.id,
                d.id as driver_id,
                NULL as vehicle_id,
                d.license_expiry as expiry_date,
                'Permis de conduire' as doc_type,
                COALESCE(d.first_name || ' ' || d.last_name, 'Chauffeur') as entity_name
            FROM drivers d
            WHERE d.license_expiry IS NOT NULL
        LOOP
            days_until := v_doc.expiry_date - CURRENT_DATE;
            
            IF days_until IN (30, 15, 7, 1, 0, -1) THEN
                FOR v_user IN 
                    SELECT id FROM profiles 
                    WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
                LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM notifications 
                        WHERE user_id = v_user.id
                        AND type = CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END
                        AND data->>'driver_id' = v_doc.driver_id::text
                        AND data->>'document_type' = v_doc.doc_type
                        AND created_at > CURRENT_DATE - INTERVAL '7 days'
                    ) THEN
                        INSERT INTO notifications (
                            user_id, type, title, message, data, priority
                        ) VALUES (
                            v_user.id,
                            CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END,
                            v_doc.doc_type || CASE WHEN days_until < 0 THEN ' EXPIRÉ' ELSE ' expire dans ' || days_until || ' jours' END,
                            v_doc.entity_name || ' - ' || v_doc.doc_type || 
                            CASE 
                                WHEN days_until < 0 THEN ' a expiré le ' || v_doc.expiry_date
                                ELSE ' expire le ' || v_doc.expiry_date
                            END,
                            jsonb_build_object(
                                'driver_id', v_doc.driver_id,
                                'document_type', v_doc.doc_type,
                                'expiry_date', v_doc.expiry_date,
                                'entity_name', v_doc.entity_name,
                                'days_until', days_until
                            ),
                            CASE WHEN days_until <= 7 THEN 'high' ELSE 'medium' END
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    
    -- Vérifier assurances véhicules
    IF column_exists('vehicles', 'insurance_expiry') THEN
        FOR v_doc IN 
            SELECT 
                v.id as vehicle_id,
                v.insurance_expiry as expiry_date,
                'Assurance' as doc_type,
                COALESCE(v.registration_number, 'Véhicule ' || v.id::text) as entity_name
            FROM vehicles v
            WHERE v.insurance_expiry IS NOT NULL
        LOOP
            days_until := v_doc.expiry_date - CURRENT_DATE;
            
            IF days_until IN (30, 15, 7, 1, 0, -1) THEN
                FOR v_user IN 
                    SELECT id FROM profiles 
                    WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
                LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM notifications 
                        WHERE user_id = v_user.id
                        AND type = CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END
                        AND data->>'vehicle_id' = v_doc.vehicle_id::text
                        AND data->>'document_type' = v_doc.doc_type
                        AND created_at > CURRENT_DATE - INTERVAL '7 days'
                    ) THEN
                        INSERT INTO notifications (
                            user_id, type, title, message, data, priority
                        ) VALUES (
                            v_user.id,
                            CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END,
                            v_doc.doc_type || CASE WHEN days_until < 0 THEN ' EXPIRÉE' ELSE ' expire dans ' || days_until || ' jours' END,
                            v_doc.entity_name || ' - ' || v_doc.doc_type || 
                            CASE 
                                WHEN days_until < 0 THEN ' a expiré le ' || v_doc.expiry_date
                                ELSE ' expire le ' || v_doc.expiry_date
                            END,
                            jsonb_build_object(
                                'vehicle_id', v_doc.vehicle_id,
                                'document_type', v_doc.doc_type,
                                'expiry_date', v_doc.expiry_date,
                                'entity_name', v_doc.entity_name,
                                'days_until', days_until
                            ),
                            CASE WHEN days_until <= 7 THEN 'high' ELSE 'medium' END
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    
    -- Vérifier contrôles techniques
    IF column_exists('vehicles', 'technical_control_expiry') THEN
        FOR v_doc IN 
            SELECT 
                v.id as vehicle_id,
                v.technical_control_expiry as expiry_date,
                'Contrôle technique' as doc_type,
                COALESCE(v.registration_number, 'Véhicule ' || v.id::text) as entity_name
            FROM vehicles v
            WHERE v.technical_control_expiry IS NOT NULL
        LOOP
            days_until := v_doc.expiry_date - CURRENT_DATE;
            
            IF days_until IN (30, 15, 7, 1, 0, -1) THEN
                FOR v_user IN 
                    SELECT id FROM profiles 
                    WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
                LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM notifications 
                        WHERE user_id = v_user.id
                        AND type = CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END
                        AND data->>'vehicle_id' = v_doc.vehicle_id::text
                        AND data->>'document_type' = v_doc.doc_type
                        AND created_at > CURRENT_DATE - INTERVAL '7 days'
                    ) THEN
                        INSERT INTO notifications (
                            user_id, type, title, message, data, priority
                        ) VALUES (
                            v_user.id,
                            CASE WHEN days_until < 0 THEN 'document_expired' ELSE 'document_expiring' END,
                            v_doc.doc_type || CASE WHEN days_until < 0 THEN ' EXPIRÉ' ELSE ' expire dans ' || days_until || ' jours' END,
                            v_doc.entity_name || ' - ' || v_doc.doc_type || 
                            CASE 
                                WHEN days_until < 0 THEN ' a expiré le ' || v_doc.expiry_date
                                ELSE ' expire le ' || v_doc.expiry_date
                            END,
                            jsonb_build_object(
                                'vehicle_id', v_doc.vehicle_id,
                                'document_type', v_doc.doc_type,
                                'expiry_date', v_doc.expiry_date,
                                'entity_name', v_doc.entity_name,
                                'days_until', days_until
                            ),
                            CASE WHEN days_until <= 7 THEN 'high' ELSE 'medium' END
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. SUPPRIMER LES ANCIENS CRON JOBS
-- ============================================
SELECT cron.unschedule('check-maintenance-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-maintenance-daily');
SELECT cron.unschedule('check-documents-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-documents-daily');

-- ============================================
-- 4. CRÉER LES NOUVEAUX CRON JOBS
-- ============================================

-- Job: Vérifier maintenances tous les jours à 8h
SELECT cron.schedule(
    'check-maintenance-daily',
    '0 8 * * *',  -- Tous les jours à 8h00
    'SELECT check_maintenance_due()'
);

-- Job: Vérifier documents tous les jours à 9h
SELECT cron.schedule(
    'check-documents-daily',
    '0 9 * * *',  -- Tous les jours à 9h00
    'SELECT check_document_expiry()'
);

-- ============================================
-- 5. VÉRIFICATION
-- ============================================
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname IN ('check-maintenance-daily', 'check-documents-daily');

SELECT 'Cron jobs configurés avec succès!' as status;
