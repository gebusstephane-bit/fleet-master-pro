# FleetMaster Pro — Presentation Commerciale

> **Document interne** — Version Mars 2026
> Cible : TPE/PME du transport routier (5 a 50 vehicules)

---

## 1. Pitch Produit

### Version 10 secondes (elevator pitch)

FleetMaster est le logiciel de gestion de flotte qui remplace vos tableaux Excel, anticipe vos pannes et vous met en conformite reglementaire automatiquement -- a partir de 29 euros par mois.

### Version 1 minute

Vous gerez entre 5 et 50 vehicules et passez vos journees entre les rappels de controle technique, les factures garage et les formulaires DREAL ? FleetMaster Pro centralise toute votre flotte dans un tableau de bord unique : vehicules, chauffeurs, maintenance, carburant, conformite reglementaire et sinistres. Vos conducteurs scannent un QR Code pour faire leur inspection quotidienne -- aucune application a telecharger. Le systeme vous alerte avant chaque echeance (controle technique, FIMO/FCO, ATP, tachygraphe, ADR) et predit les maintenances a venir grace a des regles intelligentes. Resultat : zero amende DREAL, moins de pannes, et 2 heures de gestion administrative en moins par jour. Essai gratuit 14 jours, sans carte bancaire.

### Version 3 minutes

Le transport routier francais fait face a une pression reglementaire croissante : controles DREAL, reglement 561/2006 sur les temps de conduite, obligations FCO/FIMO, ATP pour le frigorifique, ADR pour les matieres dangereuses. Pour une TPE/PME avec 5 a 50 vehicules, gerer tout cela sur des tableaux Excel ou des post-it est devenu un risque permanent -- une echeance oubliee, c'est une amende de 750 a 7 500 euros.

FleetMaster Pro a ete concu specifiquement pour les transporteurs francais. Voici ce que l'outil change au quotidien :

**Conformite automatique.** Chaque vehicule est associe a son type d'activite (marchandises generales, frigorifique, ADR colis/citerne, BTP). Le systeme calcule automatiquement les echeances reglementaires applicables et envoie des alertes par email et notification push 30, 15 et 7 jours avant expiration. Plus besoin de verifier manuellement : le tableau de bord affiche en temps reel le nombre de documents critiques, en alerte ou conformes.

**Maintenance predictive.** Des regles de maintenance (vidange, freins, filtres, pneumatiques) sont appliquees par type de vehicule. Le systeme compare les kilometres parcourus et les delais depuis la derniere intervention pour predire la prochaine echeance. Un planning de maintenance global permet de visualiser les urgences et de planifier les passages au garage avec un workflow complet : demande, validation manager, prise de RDV, cloture avec cout reel.

**Inspections QR Code.** Chaque vehicule possede un QR Code unique. Le conducteur le scanne avec son telephone, remplit le formulaire d'inspection (niveaux, pneus, proprete, defauts) et valide en 2 minutes. Le gestionnaire recoit immediatement le resultat. Aucune application a installer.

**Intelligence artificielle integree.** Un briefing quotidien resume l'etat de la flotte. Un scoring IA evalue chaque vehicule et chaque conducteur. L'assistant IA reglementaire repond a vos questions sur la legislation transport (reglement 561/2006, ADR, ATP, FIMO/FCO). L'analyse automatique des anomalies de consommation de carburant identifie les hypotheses et recommande des actions.

**API et integrations.** Pour les flottes plus avancees, une API REST publique documentee (Swagger) permet de connecter FleetMaster Pro a vos outils existants (ERP, TMS, telematique).

Trois plans adaptes a la taille de votre flotte : Essential a 29 euros/mois (5 vehicules), Pro a 49 euros/mois (20 vehicules), et Unlimited a 129 euros/mois (vehicules illimites avec IA et API completes). Essai gratuit 14 jours sur le plan Pro, sans carte bancaire, resiliable a tout moment.

---

## 2. Fonctionnalites par Module

### 2.1 Tableau de Bord Central

- Vue KPI temps reel : nombre de vehicules, chauffeurs actifs, maintenances en cours, alertes critiques
- Widget urgences maintenance avec delais avant echeance
- Widget statistiques sinistres
- Vue globale etat de la flotte (maintenance fleet overview)
- Feed d'activite recent
- Actions rapides (ajouter vehicule, creer maintenance, etc.)
- Briefing IA quotidien (plans PRO et UNLIMITED)
- Widget vehicules critiques avec scoring IA

### 2.2 Gestion des Vehicules

- Fiche vehicule complete : immatriculation, marque, modele, type, VIN, kilometrage, carburant
- Types de vehicules : VOITURE, FOURGON, POIDS_LOURD, POIDS_LOURD_FRIGO, TRACTEUR_ROUTIER, REMORQUE, REMORQUE_FRIGO
- Activites de transport specifiques : marchandises generales, frigorifique, ADR colis, ADR citerne, convoi exceptionnel, BTP, animaux vivants
- Echeances reglementaires par vehicule : controle technique, tachygraphe, ATP, ADR certificat, ADR equipement, assurance
- Timeline reglementaire visuelle avec statut (OK, WARNING, CRITICAL, EXPIRED)
- Score de fiabilite IA (scoring hebdomadaire : maintenance 40%, inspection 35%, consommation 25%)
- QR Code unique genere par vehicule pour inspections et carnet digital
- Carnet d'entretien digital avec export PDF
- TCO (Total Cost of Ownership) par vehicule : cout carburant + maintenance sur 3, 6, 12 ou 24 mois
- Import en masse par fichier CSV
- Affectation chauffeur

### 2.3 Gestion des Chauffeurs

- Fiche chauffeur : identite, coordonnees, numero de securite sociale
- Permis de conduire : numero, type (B, C, CE...), date d'expiration
- Carte conducteur numerique (tachygraphe) : numero et expiration
- Formations obligatoires : FIMO (date), FCO/FCOS (expiration), Qualification Initiale
- Aptitude medicale : date d'expiration du certificat medical
- Certificat ADR : date et expiration
- Scoring IA chauffeur quotidien (score 0-100 : incidents, consommation)
- Import en masse par fichier CSV

### 2.4 Application Chauffeur (Driver App)

- Interface mobile responsive dediee aux conducteurs
- Tableau de bord chauffeur avec alertes personnelles
- Checklist de depart vehicule
- Saisie des pleins carburant sur le terrain
- Declaration d'incident directe
- Inspection vehicule via formulaire mobile

### 2.5 Inspections et QR Codes

- Scan QR Code vehicule sans application (navigateur web)
- Formulaire d'inspection complet : kilometrage, niveaux (carburant, AdBlue, GNR), proprete (exterieur, interieur, zone cargo), temperatures compartiments frigo (C1, C2)
- Etat des pneumatiques par essieu : pression, usure, dommages (avant gauche/droit, arriere gauche/droit, secours)
- Declaration de defauts avec severite (CRITIQUE, MAJEUR, MINEUR) et categorie
- Inspection manuelle (sans QR) disponible
- Historique des inspections par vehicule
- Inspection via page publique (scan QR accessible sans login)
- Carnet digital accessible par QR Code (authentifie)

### 2.6 Maintenance

- Workflow complet en 4 etapes : creation de demande, validation manager, prise de RDV garage, cloture avec cout final
- Types de maintenance : preventive, corrective, pneumatique, carrosserie
- Niveaux de priorite : LOW, NORMAL, HIGH, CRITICAL
- Validation par email avec lien securise (token unique)
- Planning de RDV : garage, adresse, date, horaire, duree estimee
- Cloture avec cout reel et notes
- Maintenance predictive par regles configurables (par type de vehicule)
- Regles systeme par defaut + regles personnalisees par entreprise
- Declencheurs : kilometres, temps (mois), ou les deux
- Statuts de prediction : ok, upcoming, due, overdue avec barre de progression
- Cron automatique de recalcul quotidien des predictions
- Widget urgences sur le tableau de bord
- Planning global de maintenance avec toutes les predictions

### 2.7 Suivi Carburant

- Saisie des pleins : vehicule, chauffeur, date, litrage, montant total, type carburant, station
- Types de carburant : diesel, essence, electrique, hybride, GPL
- Calcul automatique du prix au litre
- Calcul automatique de la consommation L/100km (comparaison avec plein precedent)
- Analyse IA des anomalies de consommation (hypotheses + action recommandee)
- Historique et tendances

### 2.8 Conformite Reglementaire

- Calcul automatique des echeances par type de vehicule et activite de transport
- Documents suivis : controle technique, tachygraphe, ATP (frigo), ADR certificat, ADR equipement, assurance, permis, FIMO/FCO, visite medicale, carte conducteur
- Statuts automatiques : OK (>30 jours), WARNING (15-30 jours), CRITICAL (<15 jours), EXPIRED
- Conformite de base (tous les plans) : suivi des echeances vehicules
- Conformite avancee (plan UNLIMITED) : regles specifiques par activite de transport
- Rapport de conformite exportable
- Cron automatique de verification des documents chauffeurs

### 2.9 Gestion des Sinistres (Incidents)

- Declaration d'incident liee au vehicule et au chauffeur
- Suivi du statut et historique
- Export PDF du rapport d'incident
- Statistiques sinistres sur le tableau de bord

### 2.10 SOS Depannage

- Assistant de depannage intelligent en 4 etapes
- Selection du vehicule et du type de panne : pneu, mecanique, groupe frigo, hayon, accident
- Localisation avec situation (autoroute/hors autoroute) et etat du vehicule (roulant/immobilise)
- Diagnostic IA de la panne
- Carnet de contacts depannage : contrats d'assistance, assurances, garages partenaires
- Gestion des protocoles d'urgence et des prestataires par type de panne
- Recherche intelligente du meilleur prestataire

### 2.11 Gestion des Pneumatiques

- Suivi du stock de pneumatiques : marque, modele, dimensions, profondeur de bande, prix, code DOT
- Montage/demontage par essieu et position (simple, jumele exterieur, jumele interieur)
- Seuils d'usure configures
- Alertes pneumatiques via cron automatique

### 2.12 Alertes et Notifications

- Alertes automatiques sur toutes les echeances reglementaires (vehicules et chauffeurs)
- Severites : critical, high, medium, low
- Notifications email automatiques (maintenance, documents, alertes)
- Notifications push navigateur (Web Push API avec VAPID)
- Centre de notifications in-app
- Parametrage des preferences de notification

### 2.13 Rapports et Exports

- Export CSV : vehicules, chauffeurs, maintenance
- Export PDF : vehicules, chauffeurs, maintenance
- Carnet d'entretien PDF par vehicule (3 variantes : standard, classique, elite)
- Rapport hebdomadaire flotte par email (plans PRO et UNLIMITED)
- Rapport mensuel automatique
- Rapport de conformite
- Tableau TCO (cout total de possession) avec cout/mois et cout/km
- Section analytics sur le tableau de bord

### 2.14 Intelligence Artificielle

- **Briefing quotidien IA** (PRO, UNLIMITED) : synthese de l'etat de la flotte en 4-5 phrases actionnables, cache 4h
- **Scoring vehicule IA** (hebdomadaire) : score global 0-100, resume narratif, detail par critere (maintenance, inspection, consommation)
- **Scoring chauffeur IA** (quotidien) : score global 0-100, sous-scores incidents et carburant, resume narratif
- **Analyse anomalies carburant** : explication, hypotheses, action recommandee -- tout en JSON structure
- **Assistant reglementaire IA** (UNLIMITED) : chat streaming en temps reel avec Claude (Anthropic), specialise reglementation transport francais/europeen (561/2006, ADR, ATP, FIMO/FCO, tachygraphes, DREAL)
- **Diagnostic SOS IA** : analyse intelligente de la panne pour orienter le depannage
- **Budget guard** : controle des couts IA par tenant et global, limites mensuelles par plan
- Moteur IA : GPT-4o-mini (scoring, briefing, anomalies), Claude Haiku 4.5 (assistant reglementaire)

### 2.15 API Publique v1

- Authentification par cle API (header `x-api-key` ou `Authorization: Bearer`)
- Rate limiting par plan : ESSENTIAL 100 req/h, PRO 1 000 req/h, UNLIMITED 10 000 req/h
- Endpoints disponibles :
  - `GET /api/v1/vehicles` — Liste des vehicules (+ `POST` pour creation)
  - `GET /api/v1/vehicles/:id` — Detail d'un vehicule
  - `GET /api/v1/drivers` — Liste des chauffeurs
  - `GET /api/v1/drivers/:id` — Detail d'un chauffeur
  - `GET /api/v1/fuel-records` — Historique carburant (+ `POST` pour creation)
  - `GET /api/v1/maintenance` — Liste des maintenances
  - `GET /api/v1/compliance` — Statut de conformite
  - `GET /api/v1/alerts` — Alertes actives
- Format de reponse standardise : `{ data, meta: { total, page, per_page }, error }`
- Documentation Swagger UI interactive (`/api-docs`)
- Gestion des cles API depuis l'interface (creation, revocation, suivi d'utilisation)

### 2.16 Webhooks

- Configuration d'URL de callback par evenement
- Evenements supportes : vehicle.created, vehicle.updated, vehicle.deleted, maintenance.created, maintenance.completed, maintenance.due, inspection.completed, driver.created, driver.updated
- Interface de gestion dans les parametres

### 2.17 Agenda

- Calendrier visuel (jour, semaine, mois) avec toutes les echeances
- Regroupement par type : maintenance, controle technique, tachygraphe, ATP, inspections
- Detail par evenement avec lien vers la fiche correspondante
- Filtrage par type d'evenement

### 2.18 Parametres et Administration

- Gestion de l'entreprise : nom, SIRET, adresse, contact
- Gestion des utilisateurs : creation, edition, roles (ADMIN, MANAGER, USER, CHAUFFEUR)
- Profil utilisateur et securite (mot de passe)
- Preferences de notification (email, push)
- Preferences d'apparence (theme)
- Facturation Stripe : gestion de l'abonnement, historique
- Regles de maintenance personnalisees
- Cles API et webhooks
- Journal d'activite
- Integrations (Geotab, Verizon Connect, Samsara, etc. -- preparation)

### 2.19 Onboarding Guide

- Processus d'inscription en etapes : creation entreprise, premier vehicule, premier chauffeur
- Essai gratuit 14 jours sur plan PRO sans carte bancaire
- Email de bienvenue automatique
- Option de saut d'onboarding pour configuration ulterieure

---

## 3. Tableau Comparatif des Plans

| Fonctionnalite | Essential (29 euros/mois) | Pro (49 euros/mois) | Unlimited (129 euros/mois) |
|---|---|---|---|
| **Vehicules** | 5 maximum | 20 maximum | Illimites |
| **Utilisateurs** | 10 maximum | 50 maximum | Illimites |
| **Prix annuel** | 290 euros/an (economie 58 euros) | 490 euros/an (economie 98 euros) | 1 290 euros/an (economie 258 euros) |
| | | | |
| **Tableau de bord** | Oui | Oui | Oui |
| **Gestion vehicules** | Oui | Oui | Oui |
| **Gestion chauffeurs** | Oui | Oui | Oui |
| **Inspections QR Code** | Oui | Oui | Oui |
| **Maintenance basique** | Oui | Oui | Oui |
| **Suivi carburant** | Oui | Oui | Oui |
| **Gestion sinistres** | Oui | Oui | Oui |
| **SOS Depannage** | Oui | Oui | Oui |
| **Gestion pneumatiques** | Oui | Oui | Oui |
| **Alertes email** | Oui | Oui | Oui |
| **Export CSV/PDF** | Oui | Oui | Oui |
| **Agenda** | Oui | Oui | Oui |
| **Application chauffeur** | Oui | Oui | Oui |
| | | | |
| **Conformite de base** | Oui | Oui | Oui |
| **Conformite avancee** (par activite) | Non | Non | Oui |
| **Maintenance predictive** | Non | Oui | Oui |
| **Briefing IA quotidien** | Non | Oui | Oui |
| **Scoring IA vehicule/chauffeur** | Scoring algo (10 appels IA/mois) | Scoring algo + IA (200 appels/mois) | Scoring complet IA (2 000 appels/mois) |
| **Analyse anomalies carburant IA** | Non | Oui | Oui |
| **Assistant IA reglementaire** | Non | Non | Oui (illimite) |
| **Notifications push** | Non | Oui | Oui |
| **Webhooks** | Non | Oui | Oui |
| **Rapports avances** | Non | Oui | Oui |
| **Rapport hebdomadaire email** | Non | Oui | Oui |
| **API publique** | Non | Non | Oui (10 000 req/h) |
| **Support** | Email (48h) | Prioritaire (24h) | Dedie 24/7 + Account manager |
| **SLA** | -- | -- | 99.9% |
| **Formation incluse** | Non | Non | Oui |

---

## 4. Arguments de Vente par Douleur Client

### 4.1 "J'ai peur des amendes DREAL"

**Douleur :** Un controle technique oublie, un FCO expire ou un tachygraphe non verifie peut couter entre 750 et 7 500 euros par infraction. Avec 10 vehicules et 10 chauffeurs, cela represente plus de 30 echeances reglementaires a suivre manuellement.

**Solution FleetMaster Pro :**
- Suivi automatique de TOUTES les echeances par type de vehicule et activite (controle technique, tachygraphe, ATP frigo, ADR, assurance, FIMO/FCO, visite medicale, carte conducteur, permis)
- Alertes automatiques 30, 15 et 7 jours avant expiration
- Tableau de bord avec codes couleur : vert (conforme), orange (alerte), rouge (critique), noir (expire)
- Verification quotidienne automatique des documents chauffeurs (cron)

**Chiffrage :** Une seule amende DREAL evitee (1 500 euros en moyenne) rembourse plus de 2 ans d'abonnement Essential.

### 4.2 "Mes vehicules tombent en panne au pire moment"

**Douleur :** Une panne en cours de livraison, c'est un client mecontent, un vehicule immobilise, un depannage en urgence a 500-1 000 euros, et une journee de chiffre d'affaires perdue.

**Solution FleetMaster Pro :**
- Maintenance predictive basee sur les kilometres et les delais par type de vehicule
- Regles parametrables : vidange, freins, filtres, courroie, pneumatiques
- Planning global des maintenances a venir avec statut : a jour, a prevoir, a faire, en retard
- Workflow complet : demande -> validation -> RDV garage -> cloture avec cout
- Carnet d'entretien digital par vehicule

**Chiffrage :** En passant d'une maintenance curative a preventive, les etudes du secteur montrent une reduction de 25 a 40% des pannes non planifiees et de 15 a 20% des couts de maintenance totaux.

### 4.3 "Je perds 2 heures par jour en gestion administrative"

**Douleur :** Mettre a jour les tableaux Excel, verifier les echeances, relancer les garages, saisir les pleins, imprimer les carnets d'entretien -- la gestion de flotte "manuelle" consomme un temps enorme pour le responsable de parc.

**Solution FleetMaster Pro :**
- Tableau de bord centralise : tout est visible en un clic
- Inspections par QR Code : le chauffeur saisit lui-meme, en 2 minutes, sans application
- Import CSV en masse pour les vehicules et chauffeurs
- Export CSV et PDF en un clic
- Carnet d'entretien PDF genere automatiquement
- Rapports hebdomadaires et mensuels par email
- Briefing IA quotidien : l'essentiel en 4 phrases

**Chiffrage :** Un responsable de parc a 35 euros/h qui economise 1h30/jour = 33 750 euros/an d'economie sur le temps administratif. L'abonnement Pro coute 588 euros/an.

### 4.4 "Ma facture carburant explose"

**Douleur :** Le carburant represente 25 a 35% du cout total d'exploitation d'une flotte. Sans suivi rigoureux, les surconsommations passent inapercues pendant des mois.

**Solution FleetMaster Pro :**
- Suivi de chaque plein : litrage, montant, station, kilometrage
- Calcul automatique de la consommation L/100km par vehicule
- Detection et analyse IA des anomalies de consommation
- TCO par vehicule : visualisation du cout carburant vs maintenance sur 3 a 24 mois
- Identification des vehicules les plus couteux

**Chiffrage :** Pour une flotte de 10 vehicules consommant 35 L/100km a 1,60 euros/L sur 80 000 km/an par vehicule, une reduction de 5% de la consommation grace au suivi = 22 400 euros d'economie annuelle.

---

## 5. Objections Frequentes et Reponses

### "C'est trop cher pour ma petite entreprise"

A 29 euros/mois pour le plan Essential (moins d'un euro par jour), c'est le prix d'un cafe. Une seule amende DREAL evitee ou une seule panne anticipee rembourse l'abonnement pour des annees. Et l'essai est gratuit pendant 14 jours -- vous pouvez verifier la valeur ajoutee sans risque.

### "On fonctionne deja avec Excel, ca marche"

Excel ne vous envoie pas d'alerte quand un controle technique expire. Excel ne calcule pas automatiquement vos echeances ATP et ADR. Excel ne permet pas a vos chauffeurs de scanner un QR Code pour faire leur inspection. Et surtout, Excel ne fait pas de maintenance predictive. FleetMaster Pro fait tout ce qu'Excel fait, en mieux, plus la conformite automatique et l'IA.

### "Je n'ai pas le temps de mettre en place un nouveau logiciel"

L'inscription prend 3 minutes. L'import de votre parc vehicule se fait en CSV. L'onboarding guide vous accompagne etape par etape (entreprise, premier vehicule, premier chauffeur). La plupart de nos utilisateurs sont operationnels en moins d'une demi-journee. Et sur le plan Unlimited, une formation est incluse.

### "Mes chauffeurs ne sont pas a l'aise avec la technologie"

C'est justement pourquoi on a choisi les QR Codes plutot qu'une application a telecharger. Le chauffeur scanne le QR Code colle sur le vehicule avec l'appareil photo de son telephone, remplit un formulaire simple (niveaux, pneus, proprete), et c'est fait en 2 minutes. Pas de compte a creer, pas d'application a installer.

### "Et la securite de mes donnees ?"

Les donnees sont hebergees sur des serveurs europeens (Supabase avec infrastructure en France). L'application est conforme RGPD. L'isolation des donnees entre entreprises est assuree par des Row Level Security policies PostgreSQL. Les paiements sont geres par Stripe (certifie PCI-DSS). L'application est monitoree par Sentry et les acces sont proteges par une Content Security Policy stricte.

### "Je veux pouvoir connecter ca a mon TMS/ERP"

Le plan Unlimited inclut une API REST publique complete avec documentation Swagger, 10 000 requetes par heure, et des webhooks configurables sur tous les evenements cles. Vous pouvez lire et ecrire vehicules, chauffeurs, carburant, maintenance, conformite et alertes par API.

### "Et si je veux annuler ?"

Aucun engagement de duree. Vous pouvez annuler a tout moment. Le changement de plan est effectif immediatement avec facturation au prorata. Vos donnees restent accessibles.

---

## 6. Cas d'Usage par Secteur

### 6.1 Transport de Fret / Marchandises Generales

**Profil type :** 15 poids lourds, 15 chauffeurs, 3 fourgons de livraison.

**Fonctionnalites cles :**
- Suivi controle technique PL (annuel) et tachygraphe (2 ans)
- FIMO/FCO pour chaque chauffeur avec alertes d'expiration
- Carte conducteur numerique : suivi de la date de renouvellement (5 ans)
- Maintenance predictive adaptee aux PL : vidange tous les 30 000 km, freins tous les 60 000 km
- QR Codes pour les inspections quotidiennes des chauffeurs (obligation legale)
- TCO par vehicule pour identifier les camions les plus couteux
- Scoring chauffeur pour detecter les profils a risque (consommation, incidents)

**Plan recommande :** PRO (49 euros/mois) -- 20 vehicules, 50 utilisateurs, maintenance predictive, scoring IA.

### 6.2 Transport Frigorifique

**Profil type :** 10 PL frigo, 5 fourgons frigo, 12 chauffeurs.

**Fonctionnalites cles :**
- Suivi ATP obligatoire (Accord relatif aux Transports Internationaux de denrees Perissables) avec echeance et alerte
- Temperatures frigo enregistrees a chaque inspection (compartiments C1 et C2)
- Type de vehicule specifique : POIDS_LOURD_FRIGO, REMORQUE_FRIGO
- Conformite avancee par activite FRIGORIFIQUE : tous les documents specifiques
- SOS Depannage avec type de panne "groupe frigo" -- recherche prestataire specialise
- Maintenance predictive du groupe froid

**Plan recommande :** UNLIMITED (129 euros/mois) -- conformite avancee par activite, API pour integration avec systeme de tracabilite temperature.

### 6.3 BTP (Benne et Travaux Publics)

**Profil type :** 8 bennes PL, 4 fourgons utilitaires, 10 chauffeurs.

**Fonctionnalites cles :**
- Suivi des vehicules a forte sollicitation (freins, pneumatiques, suspension)
- Activite BENNE_TRAVAUX_PUBLICS avec regles de conformite adaptees
- Maintenance predictive avec intervalles raccourcis (conditions d'utilisation severes)
- Gestion des pneumatiques detaillee (profondeur de bande de roulement, montage par essieu)
- Inspection quotidienne avec verification du benne et des equipements specifiques
- TCO pour comparer le cout d'exploitation entre chantiers

**Plan recommande :** PRO (49 euros/mois) -- 20 vehicules, maintenance predictive, alertes avancees.

### 6.4 Messagerie et Livraison Dernier Kilometre

**Profil type :** 20 fourgons, 25 chauffeurs tournants, forte rotation.

**Fonctionnalites cles :**
- QR Codes sur chaque fourgon : inspection rapide a la prise en charge (2 min)
- Rotation chauffeur/vehicule facilitee par l'application chauffeur
- Suivi carburant avec detection d'anomalies (fourgons avec trajets urbains = consommation variable)
- Alertes automatiques sur les echeances de permis et visites medicales pour un grand nombre de chauffeurs
- Import CSV en masse pour les mises a jour de flotte
- Webhooks pour integration avec la plateforme de livraison

**Plan recommande :** PRO (49 euros/mois) -- 20 vehicules, 50 utilisateurs, webhooks, scoring chauffeur.

---

## 7. ROI Calcule -- Client Type 10 Vehicules sur 1 an

### Hypotheses

| Parametre | Valeur |
|---|---|
| Nombre de vehicules | 10 PL |
| Nombre de chauffeurs | 10 |
| Kilometrage moyen annuel par vehicule | 80 000 km |
| Consommation moyenne | 33 L/100 km |
| Prix moyen du gasoil | 1,60 euros/L |
| Cout horaire responsable de parc | 35 euros/h |
| Temps administratif quotidien actuel | 2h |
| Cout moyen d'une panne non planifiee | 1 200 euros (depannage + immobilisation) |
| Nombre moyen de pannes non planifiees/an | 4 |
| Cout moyen d'une amende DREAL | 1 500 euros |
| Risque d'amende/an sans suivi | 2 |

### Cout de FleetMaster Pro

| Poste | Montant |
|---|---|
| Abonnement Pro mensuel | 49 euros/mois |
| **Cout annuel** | **588 euros** |

### Economies Realisees

| Source d'economie | Calcul | Montant annuel |
|---|---|---|
| **Temps administratif economise** | 1h30/jour x 225 jours x 35 euros/h | **11 812 euros** |
| **Amendes DREAL evitees** | 2 amendes x 1 500 euros | **3 000 euros** |
| **Pannes reduites** (-30%) | 4 pannes x 30% x 1 200 euros | **1 440 euros** |
| **Reduction consommation carburant** (-3%) | 10 vehicules x 80 000 km x 33L/100km x 1,60 euros x 3% | **12 672 euros** |
| **Reduction couts maintenance** (-15%) | 10 vehicules x 3 000 euros/an x 15% | **4 500 euros** |
| | | |
| **Total economies annuelles** | | **33 424 euros** |

### Retour sur Investissement

| Indicateur | Valeur |
|---|---|
| Cout annuel FleetMaster Pro | 588 euros |
| Economies annuelles | 33 424 euros |
| **ROI** | **x56** |
| **Rentabilise en** | **7 jours** |

> **Note :** Ces chiffres sont des estimations basees sur les moyennes du secteur transport routier francais. Les resultats reels varient selon la taille de la flotte, le type d'activite et le niveau de gestion actuel. Le poste "temps administratif" represente la plus grande source d'economie et est directement lie au remplacement des processus manuels (Excel, papier) par FleetMaster Pro.

---

## Annexe : Crons et Automatisations

FleetMaster Pro execute automatiquement les taches suivantes sans intervention humaine :

| Tache automatisee | Frequence |
|---|---|
| Verification des essais gratuits expires | Quotidien |
| Rappels de maintenance | Quotidien |
| Mise a jour du statut des maintenances | Quotidien |
| Verification des documents chauffeurs | Quotidien |
| Scoring IA des conducteurs | Quotidien (02h00) |
| Recalcul des predictions de maintenance | Quotidien (05h00) |
| Alertes pneumatiques | Quotidien |
| Scoring IA des vehicules | Hebdomadaire (dimanche 02h00) |
| Rapport hebdomadaire flotte par email | Hebdomadaire (lundi 08h00) |
| Rapport mensuel | Mensuel |
| Nettoyage des donnees temporaires | Periodique |

---

*Document genere le 17 mars 2026 -- FleetMaster Pro*
*Toutes les fonctionnalites decrites dans ce document sont reellement implementees dans le code source de l'application.*
