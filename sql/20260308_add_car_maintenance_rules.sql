-- ============================================================
-- MIGRATION : Règles de maintenance préventive pour VOITURES
-- FICHIER : 20260308_add_car_maintenance_rules.sql
-- DATE : 2026-03-08
-- CORRECTION : Intervalles ajustés selon données réalistes constructeurs
-- ============================================================

-- ============================================================
-- RÈGLES SYSTÈME — VOITURE (VL < 3,5T)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
-- Moteur
(gen_random_uuid(), 'Vidange moteur — Voiture', 
 'Huile moteur + filtre. Essence : 15 000-20 000 km. Diesel : 15 000-30 000 km ou 12-24 mois selon usage.', 
 'moteur', 'both', 20000, 12, ARRAY['VOITURE'], 2000, 30, true, 'high', true, NOW()),

-- Filtration
(gen_random_uuid(), 'Filtre à air — Voiture', 
 'Remplacement filtre à air moteur. Intervalle réduit en environnement poussiéreux.', 
 'filtration', 'both', 30000, 24, ARRAY['VOITURE'], 3000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Filtre à carburant — Voiture', 
 'Remplacement filtre à carburant (gasoil ou essence). Dépend fortement du type de moteur.', 
 'filtration', 'km', 40000, NULL, ARRAY['VOITURE'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Filtre d''habitacle — Voiture', 
 'Filtre pollen/air habitacle. Confort et qualité air intérieur.', 
 'filtration', 'both', 30000, 24, ARRAY['VOITURE'], 3000, 30, true, 'low', true, NOW()),

-- Freinage
(gen_random_uuid(), 'Contrôle freins — Voiture', 
 'Contrôle garnitures AV/AR, disques, niveau liquide. Plaquettes AV : 30-40 000 km. AR : jusqu''à 70 000 km. Plus fréquent en usage urbain intensif.', 
 'freinage', 'km', 40000, NULL, ARRAY['VOITURE'], 4000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Liquide de frein — Voiture', 
 'Remplacement liquide de frein (DOT 4). Hygroscopique : à remplacer tous les 24 mois maximum.', 
 'freinage', 'time', NULL, 24, ARRAY['VOITURE'], NULL, 60, true, 'critical', true, NOW()),

-- Transmission
(gen_random_uuid(), 'Contrôle embrayage — Voiture', 
 'Contrôle usure embrayage. Durée de vie moyenne 100 000-150 000 km selon utilisation (urbain = usure plus rapide).', 
 'transmission', 'km', 100000, NULL, ARRAY['VOITURE'], 10000, 60, true, 'medium', true, NOW()),

-- Distribution
(gen_random_uuid(), 'Courroie de distribution — Voiture', 
 'Remplacement courroie de distribution et galets. Valeur sûre générique : 80-180 000 km / 5-10 ans.', 
 'moteur', 'both', 120000, 72, ARRAY['VOITURE'], 5000, 90, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Courroie accessoires — Voiture', 
 'Courroie alternateur, pompe direction, climatisation. Souvent couplée à la distribution.', 
 'moteur', 'km', 60000, NULL, ARRAY['VOITURE'], 6000, 30, true, 'medium', true, NOW()),

-- Pneumatiques
(gen_random_uuid(), 'Pneumatiques (rotation/contrôle) — Voiture', 
 'Rotation pneus AV/AR, équilibrage, parallélisme. Contrôle profil et pression.', 
 'pneumatique', 'km', 20000, NULL, ARRAY['VOITURE'], 2000, 30, true, 'high', true, NOW()),

-- Refroidissement
(gen_random_uuid(), 'Liquide de refroidissement — Voiture', 
 'Remplacement liquide refroidissement (antigel). Protection corrosion et surchauffe.', 
 'moteur', 'both', 100000, 48, ARRAY['VOITURE'], 5000, 60, true, 'medium', true, NOW()),

-- Électricité
(gen_random_uuid(), 'Batterie — Voiture', 
 'Test batterie et alternateur. Durée de vie moyenne 4-5 ans (48-60 mois).', 
 'electricite', 'time', NULL, 48, ARRAY['VOITURE'], NULL, 60, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Éclairage et feux — Voiture', 
 'Contrôle fonctionnement tous les feux (phares, clignotants, stop, plaque) à chaque révision.', 
 'electricite', 'km', 30000, NULL, ARRAY['VOITURE'], 3000, 30, true, 'low', true, NOW()),

-- Réglementaire
(gen_random_uuid(), 'Contrôle technique — Voiture', 
 'CT obligatoire. Première fois à 4 ans, puis tous les 2 ans (24 mois).', 
 'reglementaire', 'time', NULL, 24, ARRAY['VOITURE'], NULL, 60, true, 'critical', true, NOW());

-- ============================================================
-- VÉRIFICATION
-- ============================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM maintenance_rules
    WHERE is_system_rule = true
    AND applicable_vehicle_types @> ARRAY['VOITURE']
    AND created_at >= '2026-03-08'::date;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RÈGLES VOITURE AJOUTÉES : %', v_count;
    RAISE NOTICE '========================================';
END $$;
