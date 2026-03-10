-- ============================================================
-- MIGRATION : Règles de maintenance préventive spécifiques par type de remorque
-- FICHIER : 20260308_maintenance_rules_trailer_specific.sql
-- DATE : 2026-03-08
-- AUTEUR : FleetMaster Pro
-- ============================================================

-- ============================================================
-- ÉTAPE 0 : Modifier la contrainte CHECK pour accepter les nouvelles catégories
-- ============================================================

-- Supprimer l'ancienne contrainte
ALTER TABLE maintenance_rules DROP CONSTRAINT IF EXISTS maintenance_rules_category_check;

-- Recréer avec les nouvelles catégories
ALTER TABLE maintenance_rules ADD CONSTRAINT maintenance_rules_category_check 
CHECK (category IN (
    'moteur', 'filtration', 'freinage', 'transmission', 'suspension', 
    'electricite', 'carrosserie', 'refrigeration', 'attelage',
    'pneumatique', 'reglementaire', 'autre',
    -- Nouvelles catégories pour les remorques spécifiques
    'roulement',        -- Moyeux, roulements, joints SPI
    'geometrie',        -- Alignement, parallélisme essieux
    'bequilles',        -- Béquilles, vérins hydrauliques
    'securite',         -- EBS, ABS, équipements sécurité
    'structure',        -- Châssis, soudures, corrosion
    'divers',           -- Équipements divers, arrimage
    'conteneur'         -- Twistlocks, verrous spécifiques containers
));

-- ============================================================
-- ÉTAPE 1 : RÈGLES REMORQUE TAUTLINER (11 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle visuel freins — Tautliner', 
 'Inspection visuelle des freins, garnitures, disques/tambours. Longue distance = freinage régulier.', 
 'freinage', 'km', 30000, NULL, ARRAY['REMORQUE_TAUTLINER'], 3000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Tautliner', 
 'Mesure précise épaisseur garnitures. Remplacement si < 20% restant.', 
 'freinage', 'km', 90000, NULL, ARRAY['REMORQUE_TAUTLINER'], 9000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Arbre à cames/régleurs auto — Tautliner', 
 'Contrôle et graissage arbre de freinage (S-Cam) et régleurs de jeu automatiques.', 
 'transmission', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Moyeux et roulements — Tautliner', 
 'Contrôle jeu axial, étanchéité joints SPI, niveau huile moyeux.', 
 'roulement', 'km', 90000, NULL, ARRAY['REMORQUE_TAUTLINER'], 9000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Soufflets, brides et essieux — Tautliner', 
 'Inspection soufflets suspension pneumatique, brides fixation, état essieux.', 
 'suspension', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Alignement essieux — Tautliner', 
 'Contrôle et réglage parallélisme essieux. Prévient usure irrégulière pneus.', 
 'geometrie', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'EBS/ABS remorque — Tautliner', 
 'Diagnostic électronique EBS et ABS. Test capteurs et actionneurs.', 
 'securite', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Béquilles (jeu et graissage) — Tautliner', 
 'Contrôle jeu mécanismes béquilles, graissage vérins et axes.', 
 'bequilles', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis (fissures/corrosion) — Tautliner', 
 'Inspection complète châssis : fissures, corrosion, soudures cassées.', 
 'structure', 'km', 120000, NULL, ARRAY['REMORQUE_TAUTLINER'], 12000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Plancher/bâche/rails — Tautliner', 
 'Contrôle plancher bois/métal, intégrité bâche et rideaux coulissants.', 
 'carrosserie', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Équipements sécurité — Tautliner', 
 'Vérification extincteurs, sangles d''arrimage, coins protection, feux.', 
 'divers', 'km', 60000, NULL, ARRAY['REMORQUE_TAUTLINER'], 6000, 30, true, 'medium', true, NOW());

-- ============================================================
-- ÉTAPE 2 : RÈGLES REMORQUE FOURGON (10 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle freins (ville) — Fourgon', 
 'Inspection freins et circuit air. Usage ville = freinage fréquent.', 
 'freinage', 'km', 20000, NULL, ARRAY['REMORQUE_FOURGON'], 2000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Fourgon', 
 'Mesure garnitures. Remplacement anticipé vs tautliner (usage intensif).', 
 'freinage', 'km', 60000, NULL, ARRAY['REMORQUE_FOURGON'], 6000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Moyeux — Fourgon', 
 'Contrôle moyeux. Usage ville = sollicitation aux manœuvres.', 
 'roulement', 'km', 60000, NULL, ARRAY['REMORQUE_FOURGON'], 6000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Suspension/amortisseurs — Fourgon', 
 'Contrôle amortisseurs. Routes urbaines dégradées = usure accélérée.', 
 'suspension', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Alignement — Fourgon', 
 'Parallélisme essieux. Vérifié fréquemment (dos d''âne, nids-de-poule).', 
 'geometrie', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'EBS/ABS + ISO 7638 — Fourgon', 
 'Diagnostic EBS/ABS et contrôle connecteur ISO 7638.', 
 'securite', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Béquilles — Fourgon', 
 'Graissage et contrôle béquilles. Manutention fréquente.', 
 'bequilles', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis — Fourgon', 
 'Inspection châssis. Attention chocs livraisons urbaines.', 
 'structure', 'km', 80000, NULL, ARRAY['REMORQUE_FOURGON'], 8000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Plancher/parois/portes — Fourgon', 
 'Contrôle plancher, parois, portes arrière et serrures.', 
 'carrosserie', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Équipements intérieurs — Fourgon', 
 'Barres rangement, rails arrimage, anneaux fixation.', 
 'divers', 'km', 40000, NULL, ARRAY['REMORQUE_FOURGON'], 4000, 30, true, 'low', true, NOW());

-- ============================================================
-- ÉTAPE 3 : RÈGLES REMORQUE PLATEAU (10 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle freins — Plateau', 
 'Inspection freins. Charges lourdes/vrac = sollicitation importante.', 
 'freinage', 'km', 30000, NULL, ARRAY['REMORQUE_PLATEAU'], 3000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Plateau', 
 'Usure fréquente avec charges importantes (bois, vrac).', 
 'freinage', 'km', 90000, NULL, ARRAY['REMORQUE_PLATEAU'], 9000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Moyeux — Plateau', 
 'Contrôle moyeux avec graissage. Charges lourdes = attention roulements.', 
 'roulement', 'km', 90000, NULL, ARRAY['REMORQUE_PLATEAU'], 9000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Suspension lourde — Plateau', 
 'Suspension renforcée charges lourdes. Inspection lames et soufflets.', 
 'suspension', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Alignement — Plateau', 
 'Géométrie essieux. Charges asymétriques fréquentes.', 
 'geometrie', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'EBS/ABS — Plateau', 
 'Système freinage électronique. Diagnostic complet.', 
 'securite', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Béquilles — Plateau', 
 'Béquilles sollicitées par charges lourdes. Contrôle renforcé.', 
 'bequilles', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis (soudures) — Plateau', 
 'Inspection soudures et longerons. Points flexion sous charge.', 
 'structure', 'km', 120000, NULL, ARRAY['REMORQUE_PLATEAU'], 12000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Plancher bois/acier — Plateau', 
 'État plancher (bois ou acier) et traverses. Usure frottement charges.', 
 'carrosserie', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Points arrimage/ridelles — Plateau', 
 'Ridelles, ranchers, coins arrimage. Solidité et fonctionnement.', 
 'divers', 'km', 60000, NULL, ARRAY['REMORQUE_PLATEAU'], 6000, 30, true, 'high', true, NOW());

-- ============================================================
-- ÉTAPE 4 : RÈGLES REMORQUE CHANTIER & BENNE TP (6 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle freins (hors route) — Chantier', 
 'Freins sollicités conditions difficiles (poussière, boue).', 
 'freinage', 'km', 20000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 2000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Chantier', 
 'Usure accélérée environnement poussiéreux.', 
 'freinage', 'km', 60000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 6000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Moyeux — Chantier', 
 'Contrôle renforcé roulements. Ingressions poussière/sable.', 
 'roulement', 'km', 60000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 6000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Suspension chantier — Chantier', 
 'Suspension sollicitée terrain accidenté. Inspection renforcée.', 
 'suspension', 'km', 40000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 4000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Béquilles/supports — Chantier', 
 'Béquilles et supports. Sollicitation importante terrain meuble.', 
 'bequilles', 'km', 40000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 4000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis (soudures) — Chantier', 
 'Inspection soudures. Conditions sévères = risque fissuration.', 
 'structure', 'km', 80000, NULL, ARRAY['REMORQUE_CHANTIER', 'REMORQUE_BENNE_TP'], 8000, 30, true, 'critical', true, NOW());

-- ============================================================
-- ÉTAPE 5 : RÈGLES REMORQUE PORTE-CONTENEUR (8 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle freins — Porte-conteneur', 
 'Inspection freins. Containers lourds = freinage sollicité.', 
 'freinage', 'km', 30000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 3000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Porte-conteneur', 
 'Usure freins avec charges containers maritimes lourdes.', 
 'freinage', 'km', 90000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 9000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Moyeux — Porte-conteneur', 
 'Contrôle moyeux. Charges concentrées containers.', 
 'roulement', 'km', 90000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 9000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Suspension — Porte-conteneur', 
 'Suspension adaptée charges lourdes et réparties.', 
 'suspension', 'km', 60000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'EBS/ABS — Porte-conteneur', 
 'Diagnostic système freinage électronique.', 
 'securite', 'km', 60000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 6000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Béquilles — Porte-conteneur', 
 'Contrôle béquilles stabilisation chargement/déchargement.', 
 'bequilles', 'km', 60000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis — Porte-conteneur', 
 'Inspection châssis. Points fixation twistlocks.', 
 'structure', 'km', 120000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 12000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Verrous tournants/Twistlocks — Porte-conteneur', 
 'Contrôle mécanisme twistlocks et verrous tournants. Sécurité containers.', 
 'conteneur', 'km', 60000, NULL, ARRAY['REMORQUE_PORTE_CONTENEUR'], 6000, 30, true, 'critical', true, NOW());

-- ============================================================
-- ÉTAPE 6 : RÈGLES FRIGO - PARTIE CHÂSSIS (6 règles)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Contrôle visuel freins — Remorque Frigo', 
 'Inspection freins châssis remorque frigorifique.', 
 'freinage', 'km', 30000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 3000, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Mesure épaisseur plaquettes — Remorque Frigo', 
 'Mesure usure freins châssis.', 
 'freinage', 'km', 90000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 9000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Suspension — Remorque Frigo', 
 'Contrôle suspension châssis frigo.', 
 'suspension', 'km', 60000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Béquilles — Remorque Frigo', 
 'Graissage et contrôle béquilles.', 
 'bequilles', 'km', 60000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 6000, 30, true, 'medium', true, NOW()),

(gen_random_uuid(), 'Châssis — Remorque Frigo', 
 'Inspection châssis corrosion/fissures.', 
 'structure', 'km', 120000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 12000, 30, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Plancher frigo/seuil — Remorque Frigo', 
 'État plancher caisse frigorifique et seuil porte.', 
 'refrigeration', 'km', 60000, NULL, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], 6000, 30, true, 'medium', true, NOW());

-- ============================================================
-- ÉTAPE 7 : RÈGLES FRIGO - PARTIE GROUPE FROID (5 règles en MOIS)
-- ============================================================
INSERT INTO maintenance_rules
(id, name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority, is_active, created_at)
VALUES
(gen_random_uuid(), 'Entretien groupe froid — Remorque Frigo', 
 'Entretien annuel groupe froid : nettoyage évaporateur, contrôle courroies, filtres GF.', 
 'refrigeration', 'time', NULL, 12, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], NULL, 45, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Étanchéité F-Gaz — Remorque Frigo', 
 'Contrôle étanchéité annuel réglementation F-Gaz UE 517/2014.', 
 'refrigeration', 'time', NULL, 12, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], NULL, 45, true, 'critical', true, NOW()),

(gen_random_uuid(), 'Contrôle caisse/joints — Remorque Frigo', 
 'Inspection joints porte, panneaux isolation caisse.', 
 'refrigeration', 'time', NULL, 6, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], NULL, 30, true, 'high', true, NOW()),

(gen_random_uuid(), 'Calibration sondes — Remorque Frigo', 
 'Vérification/calibration sondes température enregistreur.', 
 'refrigeration', 'time', NULL, 12, ARRAY['REMORQUE_FRIGO_MONO', 'REMORQUE_FRIGO_MULTI'], NULL, 30, true, 'critical', true, NOW());

-- ============================================================
-- ÉTAPE 8 : DÉSACTIVATION RÈGLES GÉNÉRIQUES REMORQUE_FRIGO
-- ============================================================
DO $$
DECLARE
    v_count_desactivated INTEGER;
BEGIN
    UPDATE maintenance_rules
    SET is_active = false,
        updated_at = NOW()
    WHERE is_system_rule = true
    AND is_active = true
    AND applicable_vehicle_types = ARRAY['REMORQUE_FRIGO']
    AND created_at < '2026-03-08';
    
    GET DIAGNOSTICS v_count_desactivated = ROW_COUNT;
    RAISE NOTICE '✅ % règles génériques REMORQUE_FRIGO désactivées', v_count_desactivated;
END $$;

-- ============================================================
-- RÉCAPITULATIF
-- ============================================================
DO $$
DECLARE
    v_count_new INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_new
    FROM maintenance_rules
    WHERE is_system_rule = true
    AND created_at >= '2026-03-08'::date;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Nouvelles règles créées : %', v_count_new;
    RAISE NOTICE 'Catégories ajoutées : roulement, geometrie, bequilles, securite, structure, divers, conteneur';
    RAISE NOTICE '========================================';
END $$;
