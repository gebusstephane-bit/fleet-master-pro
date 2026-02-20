-- ============================================
-- SEED: Exemples de règles d'urgence V3.2
-- REMPLACEZ les UUID par votre vrai user_id
-- ============================================

-- ÉTAPE 1: Trouver votre user_id
-- Exécutez cette requête dans l'éditeur SQL Supabase:
-- SELECT id FROM auth.users LIMIT 5;
-- 
-- OU si vous êtes connecté via l'app:
-- SELECT auth.uid();

-- ÉTAPE 2: Remplacez 'VOTRE_USER_ID_ICI' par votre vrai UUID

-- ============================================
-- EXEMPLE 1: Contrat Euromaster Pneu 24/7
-- ============================================
INSERT INTO emergency_rules (
  user_id, 
  name, 
  rule_type, 
  applies_to_breakdown_types, 
  applies_if_immobilized,
  applies_on_highway,
  phone_number, 
  contact_name,
  contract_reference,
  instructions,
  display_color,
  priority,
  is_active
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ← REMPLACEZ ICI
  'Euromaster Pneu 24/24',
  'contract_24_7',
  ARRAY['tire'],
  null,  -- s'applique que le véhicule soit immobilisé ou non
  false, -- hors autoroute uniquement
  '06.12.34.56.78',
  'Service dépannage Euromaster',
  'CTR-EURO-2024-001',
  '1. Restez à l''arrêt en sécurité
2. Appuyez sur le bouton SOS dans l''application ou appelez directement
3. Indiquez votre position exacte (kilomètre, autoroute, sens)
4. Précisez les dimensions du pneu si possible
5. Attendez l''intervention sur place',
  'green',
  0,
  true
);

-- ============================================
-- EXEMPLE 2: Assurance pour remorquage
-- ============================================
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  applies_if_immobilized,
  applies_on_highway,
  phone_number,
  contact_name,
  contract_reference,
  instructions,
  display_color,
  priority,
  is_active
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ← REMPLACEZ ICI
  'Assurance Groupama',
  'insurance',
  ARRAY['mechanical', 'tire', 'electric'], -- tous types sauf frigo spécifique
  true,  -- UNIQUEMENT si immobilisé
  null,  -- peu importe autoroute ou non
  '01.23.45.67.89',
  'Assistance 24/24',
  'POL-GRP-789456',
  'Véhicule immobilisé sans contrat de dépannage spécifique.
Contactez votre assurance pour organiser le remorquage.
Numéro de contrat à donner: POL-GRP-789456',
  'orange',
  1,
  true
);

-- ============================================
-- EXEMPLE 3: Direction pour problème hayon
-- ============================================
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  applies_if_immobilized,
  applies_on_highway,
  phone_number,
  contact_name,
  instructions,
  display_color,
  priority,
  is_active
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ← REMPLACEZ ICI
  'Direction Technique',
  'management',
  ARRAY['tailgate'],  -- UNIQUEMENT pour les problèmes de hayon
  null,
  null,
  '06.98.76.54.32',
  'Directeur Technique',
  'Problème hayon élévateur:

⚠️ NE CONTACTEZ PAS DE GARAGE EXTÉRIEUR SANS AUTORISATION

1. Décrivez le problème au directeur
2. Attendez ses instructions
3. Il vous indiquera le garage agréé à contacter si nécessaire',
  'blue',
  0,
  true
);

-- ============================================
-- EXEMPLE 4: Contrat Carrier Frigo 24/7
-- ============================================
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  applies_if_immobilized,
  applies_on_highway,
  phone_number,
  contact_name,
  contract_reference,
  instructions,
  display_color,
  priority,
  is_active
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ← REMPLACEZ ICI
  'Assistance Carrier Frigo',
  'contract_24_7',
  ARRAY['frigo'],
  null,
  false,
  '08.00.XX.XX.XX',
  'Support technique Carrier',
  'CTR-CARRIER-2024',
  '🥶 IMPORTANT - GROUPE FRIGO EN PANNE:

1. NE COUPEZ PAS LE GROUPE FRIGO
2. Notez le code erreur affiché sur le groupe
3. Vérifiez le niveau de carburant du groupe
4. Appelez le support
5. Décrivez: marque groupe, code erreur, température actuelle

Le véhicule peut rouler tant que le groupe tourne.',
  'green',
  0,
  true
);

-- ============================================
-- EXEMPLE 5: Garage partenaire généraliste
-- ============================================
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  applies_if_immobilized,
  applies_on_highway,
  phone_number,
  contact_name,
  contract_reference,
  instructions,
  display_color,
  priority,
  is_active
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ← REMPLACEZ ICI
  'Garage Dupont - Partenaire',
  'garage_partner',
  ARRAY['mechanical', 'bodywork'],
  false,  -- UNIQUEMENT si le véhicule peut rouler
  false,
  '04.78.12.34.56',
  'M. Dupont',
  'REF-DUPONT-123',
  'Véhicule roulant - Rendez-vous possible.

Horaires: Lun-Ven 8h-18h, Sam 8h-12h
Adresse: 12 rue des Garages, Lyon

⚠️ Vérifier disponibilité avant de se déplacer',
  'blue',
  5,
  true
);

-- ============================================
-- VÉRIFICATION: Afficher les règles créées
-- ============================================
-- SELECT * FROM emergency_rules WHERE user_id = 'VOTRE_USER_ID_ICI';
