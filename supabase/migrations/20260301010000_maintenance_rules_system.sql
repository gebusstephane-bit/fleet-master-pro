-- ============================================================
-- MIGRATION : Système de règles de maintenance préventive
-- Prompt #13 V2 — Types véhicules adaptés aux valeurs DB réelles
-- DB vehicle types: VOITURE | FOURGON | POIDS_LOURD | POIDS_LOURD_FRIGO
-- ============================================================

-- ============================================================
-- TABLE 1 : RÈGLES DE MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = règle système globale (non modifiable par les clients)
  -- Rempli = règle personnalisée d'un client
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN (
    'moteur', 'filtration', 'freinage', 'transmission', 'suspension',
    'electricite', 'carrosserie', 'refrigeration', 'attelage',
    'pneumatique', 'reglementaire', 'autre'
  )),

  -- Déclencheur
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('km', 'time', 'both')),
  interval_km INTEGER,
  interval_months INTEGER,

  -- Applicabilité — NULL = s'applique à tous
  -- Valeurs exactes de vehicles.type : VOITURE | FOURGON | POIDS_LOURD | POIDS_LOURD_FRIGO
  applicable_vehicle_types TEXT[],
  applicable_fuel_types TEXT[],

  -- Alertes
  alert_km_before INTEGER DEFAULT 2000,
  alert_days_before INTEGER DEFAULT 30,

  -- Méta
  is_active BOOLEAN DEFAULT true,
  is_system_rule BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE maintenance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_rules_readable_by_all" ON maintenance_rules
  FOR SELECT USING (
    company_id IS NULL OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_rules_manageable" ON maintenance_rules
  FOR ALL USING (
    company_id IS NOT NULL AND
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "system_rules_immutable" ON maintenance_rules
  FOR UPDATE USING (company_id IS NOT NULL);

-- Index
CREATE INDEX IF NOT EXISTS idx_maintenance_rules_vehicle_types
  ON maintenance_rules USING gin(applicable_vehicle_types);
CREATE INDEX IF NOT EXISTS idx_maintenance_rules_active
  ON maintenance_rules(is_active) WHERE is_active = true;

-- ============================================================
-- TABLE 2 : PRÉDICTIONS CALCULÉES (cache cron quotidien)
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES maintenance_rules(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dernière maintenance trouvée pour cette règle
  last_maintenance_id UUID REFERENCES maintenance_records(id),
  last_maintenance_date DATE,
  last_maintenance_km INTEGER,

  -- Prédiction calculée
  current_km INTEGER NOT NULL,
  estimated_due_km INTEGER,
  estimated_due_date DATE,
  km_until_due INTEGER,
  days_until_due INTEGER,

  -- Statut calculé
  status TEXT NOT NULL CHECK (status IN ('ok', 'upcoming', 'due', 'overdue')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Anti-doublon alertes
  alert_sent_at TIMESTAMPTZ,
  alert_acknowledged_at TIMESTAMPTZ,

  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(vehicle_id, rule_id)
);

-- RLS
ALTER TABLE maintenance_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_predictions" ON maintenance_predictions
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_status
  ON maintenance_predictions(status, priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_vehicle
  ON maintenance_predictions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_company
  ON maintenance_predictions(company_id, status);

-- ============================================================
-- RÈGLES SYSTÈME — POIDS LOURD (POIDS_LOURD)
-- Couvre : tracteur routier, porteur, semi-remorque (camion rigide ou articulé)
-- ============================================================

INSERT INTO maintenance_rules
(name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority)
VALUES

('Vidange moteur — Poids Lourd',
 'Huile moteur + filtre à huile. Tracteur longue distance Euro VI : 80 000-100 000 km ou 24 mois. '
 'Porteur régional : 50 000 km ou 12 mois. Usage intensif ville : 30 000 km. '
 'Source : Renault Trucks, Volvo FH, Mercedes Actros.',
 'moteur', 'both', 80000, 18,
 ARRAY['POIDS_LOURD'], 3000, 45, true, 'high'),

('Filtre à carburant — Poids Lourd',
 'Filtre principal + préfiltre séparateur eau. Remplacement tous les 60 000 km. '
 'Risque injection HS si négligé. Porteur urbain : 30 000 km.',
 'filtration', 'km', 60000, null,
 ARRAY['POIDS_LOURD'], 2000, 30, true, 'high'),

('Filtre à air — Poids Lourd',
 'Nettoyage tous les 30 000 km, remplacement tous les 60 000 km. '
 'Plus fréquent sur chantier ou routes poussiéreuses.',
 'filtration', 'km', 60000, null,
 ARRAY['POIDS_LOURD'], 2000, 30, true, 'medium'),

('Filtre AdBlue / SCR — Poids Lourd',
 'Obligatoire Euro VI. Remplacement tous les 60 000 km. '
 'Colmatage = panne moteur en mode dégradé.',
 'filtration', 'km', 60000, null,
 ARRAY['POIDS_LOURD'], 2000, 30, true, 'high'),

('Freins — Poids Lourd',
 'Contrôle garnitures, disques/tambours, ABS, EBS. '
 'Porteur régional : remplacement tous les 80 000-100 000 km. '
 'Tracteur longue distance : 150 000-200 000 km.',
 'freinage', 'km', 100000, null,
 ARRAY['POIDS_LOURD'], 5000, 45, true, 'critical'),

('Distribution / Chaîne de distribution — Poids Lourd',
 'Chaîne : contrôle tension à 200 000 km, remplacement préventif à 600 000 km. '
 'Courroie (si applicable) : remplacement à 200 000 km.',
 'moteur', 'km', 200000, null,
 ARRAY['POIDS_LOURD'], 5000, 60, true, 'critical'),

('Embrayage — Poids Lourd',
 'Longue distance : 400 000-600 000 km. '
 'Régional / messagerie : 200 000-300 000 km. '
 'Chantier / stop-and-go : 100 000-200 000 km.',
 'transmission', 'km', 300000, null,
 ARRAY['POIDS_LOURD'], 10000, 60, true, 'high'),

('Liquide de refroidissement — Poids Lourd',
 'Remplacement tous les 2 ans ou 200 000 km. '
 'Vérification pH et concentration antigel 2 fois par an.',
 'moteur', 'both', 200000, 24,
 ARRAY['POIDS_LOURD'], 5000, 45, true, 'medium'),

('Huile boîte de vitesses — Poids Lourd',
 'BV manuelle : 200 000 km ou 4 ans. '
 'BV automatique/robotisée (Opticruise, PowerShift) : voir constructeur, souvent 200 000 km.',
 'transmission', 'both', 200000, 48,
 ARRAY['POIDS_LOURD'], 5000, 60, true, 'medium'),

('Huile pont / différentiel — Poids Lourd',
 'Pont arrière : 200 000 km ou 4 ans. '
 'Pont tandem : vérifier niveau intercardan à chaque entretien.',
 'transmission', 'both', 200000, 48,
 ARRAY['POIDS_LOURD'], 5000, 60, true, 'medium'),

('Graissage cinquième roue / pivot d''attelage',
 'Plaque d''attelage (tracteur) : graissage toutes les 2 semaines ou 5 000 km. '
 'Pivot kingpin (semi-remorque) : graissage tous les 5 000 km. '
 'Inspection complète annuelle. Usure = danger attelage.',
 'attelage', 'km', 5000, null,
 ARRAY['POIDS_LOURD'], 500, 7, true, 'critical'),

('Soufflets suspension pneumatique — Poids Lourd',
 'Inspection fuites et fissures tous les 100 000 km. '
 'Roulement de moyeux : contrôle jeu axial tous les 50 000 km ou 1 an. '
 'Source : BPW ECO Unit.',
 'suspension', 'km', 100000, null,
 ARRAY['POIDS_LOURD'], 3000, 30, true, 'medium'),

('Faisceau électrique / éclairage — Poids Lourd',
 'Contrôle connexions 7/15 broches, feux arrière, stop, clignotants tous les 50 000 km. '
 'Vérifier câbles anti-traîne et prises.',
 'electricite', 'km', 50000, null,
 ARRAY['POIDS_LOURD'], 2000, 30, true, 'medium'),

('Inspection châssis / longerons — Poids Lourd',
 'Inspection soudures, longerons, traverses et fixations tous les 100 000 km ou 12 mois. '
 'Rechercher fissures, rouille, déformations.',
 'carrosserie', 'both', 100000, 12,
 ARRAY['POIDS_LOURD'], 3000, 30, true, 'medium'),

('Pneumatiques — Poids Lourd',
 'Contrôle pression hebdomadaire. '
 'Contrôle profil et état tous les 10 000 km. '
 'Durée de vie : 150 000-200 000 km. Limite légale : 1,6 mm de profil.',
 'pneumatique', 'km', 10000, null,
 ARRAY['POIDS_LOURD'], 500, 14, true, 'high'),

('Graissage béquilles / train d''atterrissage — Semi-remorque',
 'Béquilles de semi-remorque : graissage et contrôle tous les 3 mois ou 25 000 km. '
 'Vérifier mécanisme de manivelle et patins.',
 'attelage', 'both', 25000, 3,
 ARRAY['POIDS_LOURD'], 1000, 14, true, 'medium'),

('Contrôle technique annuel — Poids Lourd',
 'Obligatoire tous les 12 mois. PTAC > 3,5T = TRM = annuel. '
 'Convocation DREAL si dépassement.',
 'reglementaire', 'time', null, 12,
 ARRAY['POIDS_LOURD'], null, 60, true, 'critical'),

('Calibration tachygraphe numérique — Poids Lourd',
 'Obligatoire tous les 2 ans (24 mois). '
 'Centre agréé DREAL. Infraction = immobilisation véhicule.',
 'reglementaire', 'time', null, 24,
 ARRAY['POIDS_LOURD'], null, 60, true, 'critical');

-- ============================================================
-- RÈGLES SYSTÈME — POIDS LOURD FRIGORIFIQUE (POIDS_LOURD_FRIGO)
-- Les règles PL standard ci-dessus s'appliquent aussi via un INSERT séparé
-- + règles spécifiques groupe frigorifique + ATP
-- ============================================================

-- D'abord, répliquer les règles PL standard pour POIDS_LOURD_FRIGO
INSERT INTO maintenance_rules
(name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority)
VALUES

('Vidange moteur — PL Frigorifique (châssis)',
 'Identique PL standard. Véhicule frigo = tracteur/porteur + groupe frigo. '
 'Vidange châssis : 80 000 km ou 18 mois (moteur tracteur).',
 'moteur', 'both', 80000, 18,
 ARRAY['POIDS_LOURD_FRIGO'], 3000, 45, true, 'high'),

('Freins — PL Frigorifique (châssis)',
 'Identique PL standard. Contrôle tous les 100 000 km ou selon usage.',
 'freinage', 'km', 100000, null,
 ARRAY['POIDS_LOURD_FRIGO'], 5000, 45, true, 'critical'),

('Graissage cinquième roue / pivot — PL Frigorifique',
 'Identique PL standard. Graissage tous les 5 000 km.',
 'attelage', 'km', 5000, null,
 ARRAY['POIDS_LOURD_FRIGO'], 500, 7, true, 'critical'),

('Contrôle technique annuel — PL Frigorifique',
 'Obligatoire tous les 12 mois (PTAC > 3,5T = TRM).',
 'reglementaire', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 60, true, 'critical'),

('Calibration tachygraphe — PL Frigorifique',
 'Obligatoire tous les 24 mois. Centre agréé DREAL.',
 'reglementaire', 'time', null, 24,
 ARRAY['POIDS_LOURD_FRIGO'], null, 60, true, 'critical'),

-- Groupe frigorifique
('Entretien annuel groupe frigorifique',
 'Entretien annuel obligatoire : nettoyage évaporateur et condenseur, contrôle courroies, '
 'tension, remplacement filtres GF, vérification niveaux huile moteur GF, test thermostat. '
 'Source : Thermo King, Carrier Transicold, SBR, Froid & Services.',
 'refrigeration', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 45, true, 'critical'),

('Vidange huile moteur groupe frigorifique',
 'Le groupe a son propre moteur diesel. Vidange selon heures moteur GF : '
 '1 000-1 500 heures (≈ 12-18 mois selon usage). '
 'Thermo King : 1 200 h, Carrier : 1 500 h.',
 'refrigeration', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 30, true, 'high'),

('Filtre carburant groupe frigorifique',
 'Remplacement tous les 1 000-1 500 heures ou lors de l''entretien annuel du GF.',
 'refrigeration', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 30, true, 'medium'),

('Courroies groupe frigorifique',
 'Contrôle tension et état tous les 6 mois. '
 'Remplacement préventif tous les 2 ans ou selon indicateur d''usure. '
 'Rupture courroie = arrêt groupe = perte cargaison.',
 'refrigeration', 'time', null, 6,
 ARRAY['POIDS_LOURD_FRIGO'], null, 30, true, 'critical'),

('Contrôle fluide frigorigène — Attestation annuelle F-Gaz',
 'OBLIGATOIRE : réglementation F-Gaz (UE 517/2014). '
 'Contrôle étanchéité annuel par opérateur certifié. '
 'Si charge > 5 tCO2 : contrôle 2x/an. '
 'Attestation à conserver 5 ans. Amendes DREAL si non conforme.',
 'refrigeration', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 45, true, 'critical'),

('Joints portes compartiment frigorifique',
 'Inspection état joints d''étanchéité tous les 3 mois. '
 'Joints abîmés = fuite de froid = non-conformité ATP = perte cargaison.',
 'refrigeration', 'time', null, 3,
 ARRAY['POIDS_LOURD_FRIGO'], null, 14, true, 'high'),

('Nettoyage / désinfection caisse frigorifique',
 'Nettoyage intérieur avec produits HACCP certifiés tous les 3 mois minimum. '
 'Obligatoire pour transport alimentaire. Traçabilité recommandée.',
 'refrigeration', 'time', null, 3,
 ARRAY['POIDS_LOURD_FRIGO'], null, 14, true, 'high'),

('Vérification enregistreur de température',
 'Obligatoire pour transport de surgelés. '
 'Enregistreur homologué + vérification/calibration annuelle par organisme agréé.',
 'refrigeration', 'time', null, 12,
 ARRAY['POIDS_LOURD_FRIGO'], null, 30, true, 'critical'),

('Préparation renouvellement attestation ATP',
 'Attestation ATP : valable 6 ans (neuf), puis tous les 3 ans (renouvellement). '
 'Test obligatoire en centre CEMAFROID agréé. Coût : ~500€ HT. '
 'Durée de vie totale engin frigo : 12 ans (6 + 3 + 3). '
 'Planifier le test 3 mois avant expiration. '
 'COMPLÉMENTAIRE à l''alerte document ATP du module conformité.',
 'reglementaire', 'time', null, 36,
 ARRAY['POIDS_LOURD_FRIGO'], null, 90, true, 'critical');

-- ============================================================
-- RÈGLES SYSTÈME — FOURGON / UTILITAIRE (FOURGON)
-- VUL < 3,5T et fourgons de livraison
-- ============================================================

INSERT INTO maintenance_rules
(name, description, category, trigger_type, interval_km, interval_months,
 applicable_vehicle_types, alert_km_before, alert_days_before, is_system_rule, priority)
VALUES

('Vidange moteur — Fourgon / Utilitaire',
 'Messagerie/livraison (démarrages fréquents) : 15 000-20 000 km ou 1 an. '
 'Fourgon longue distance : 20 000-30 000 km ou 1 an. '
 'Ne pas dépasser 1 an même si le kilométrage n''est pas atteint.',
 'moteur', 'both', 20000, 12,
 ARRAY['FOURGON'], 1000, 30, true, 'high'),

('Filtre à carburant — Fourgon',
 'Remplacement tous les 30 000 km ou 2 ans.',
 'filtration', 'km', 30000, null,
 ARRAY['FOURGON'], 1000, 30, true, 'medium'),

('Filtre à air — Fourgon',
 'Inspection tous les 15 000 km. '
 'Remplacement tous les 30 000-40 000 km selon environnement.',
 'filtration', 'km', 30000, null,
 ARRAY['FOURGON'], 1000, 30, true, 'medium'),

('Freins — Fourgon / Utilitaire',
 'Messagerie : contrôle tous les 30 000 km, remplacement moyen 40 000-60 000 km. '
 'Plus usant qu''un VL classique (poids + démarrages fréquents).',
 'freinage', 'km', 40000, null,
 ARRAY['FOURGON'], 2000, 30, true, 'critical'),

('Courroie accessoires — Fourgon',
 'Inspection tous les 60 000 km. '
 'Remplacement préventif à 120 000-150 000 km selon constructeur.',
 'moteur', 'km', 120000, null,
 ARRAY['FOURGON'], 2000, 30, true, 'medium'),

('Distribution — Fourgon',
 'Courroie : remplacement préventif à 120 000-180 000 km selon constructeur. '
 'Chaîne : contrôle tension à 150 000 km.',
 'moteur', 'km', 150000, null,
 ARRAY['FOURGON'], 3000, 45, true, 'critical'),

('Contrôle technique — Fourgon / Utilitaire',
 'VUL < 3,5T : première CT à 4 ans, puis tous les 2 ans. '
 'VUL > 3,5T = contrôle annuel (TRM). '
 'VUL PTAC entre 3,5T et 3,85T (catégorie N1) : voir cas particulier.',
 'reglementaire', 'time', null, 24,
 ARRAY['FOURGON'], null, 60, true, 'critical');
