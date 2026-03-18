# Guide d'Onboarding FleetMaster Pro

> Document interne -- Parcours d'accompagnement des nouveaux clients
> Derniere mise a jour : 17 mars 2026

---

## Table des matieres

1. [Email de bienvenue](#1-email-de-bienvenue)
2. [Checklist onboarding J1](#2-checklist-onboarding-j1)
3. [Sequence emails J1 / J3 / J7 / J14](#3-sequence-emails-j1--j3--j7--j14)
4. [Guide "Demarrage en 15 minutes"](#4-guide-demarrage-en-15-minutes)
5. [Checklist avant la fin du trial](#5-checklist-avant-la-fin-du-trial)
6. [Script d'appel onboarding](#6-script-dappel-onboarding)

---

## 1. Email de bienvenue

Cet email est envoye automatiquement a la creation du compte via Resend (`/api/auth/register-with-trial`). Le template HTML complet est dans `src/lib/email/templates/welcome.ts`. Voici la version texte prete a copier-coller pour un envoi manuel ou un outil tiers.

### Objet

```
Bienvenue sur FleetMaster Pro -- votre essai de 14 jours commence maintenant
```

### Corps (texte)

```
Bonjour {prenom},

Felicitations ! Votre compte {nom_entreprise} est desormais actif sur FleetMaster Pro.

Vous disposez de 14 jours d'essai gratuit avec toutes les fonctionnalites du plan PRO -- sans carte bancaire requise.

Voici ce qui est inclus pendant votre essai :
- Jusqu'a 20 vehicules et 50 utilisateurs
- Gestion complete des vehicules et conducteurs
- Alertes documents et controles reglementaires
- Suivi carburant et couts
- Workflow de maintenance complet (demande, validation, realisation)
- Rapports et exports PDF/CSV
- QR codes pour les inspections terrain
- Maintenance predictive par IA
- Notifications push et email

Votre essai se termine le {date_fin_essai}.

Pour demarrer en 5 minutes :
1. Connectez-vous : https://fleetmaster.pro/dashboard
2. Completez l'assistant de configuration (entreprise, premier vehicule, premier chauffeur)
3. Importez votre flotte via CSV depuis la page Vehicules

Une question ? Repondez directement a cet email -- notre equipe vous repond sous 24h.

A tres vite,
L'equipe FleetMaster Pro
```

### Version HTML

Le template HTML est deja implemente dans l'application (`src/lib/email/templates/welcome.ts`). Il inclut :
- Un header avec gradient bleu
- Un encart visuel "14 jours d'essai gratuit" avec la date de fin
- La liste des fonctionnalites incluses
- Un bouton CTA "Acceder au tableau de bord"
- Un pied de page avec mention legale

---

## 2. Checklist onboarding J1

Les 5 actions que le nouvel utilisateur doit accomplir le premier jour.

### Action 1 : Confirmer son email et se connecter

- L'email est confirme automatiquement a l'inscription (`email_confirm: true` dans Supabase Auth)
- L'utilisateur est redirige vers l'assistant d'onboarding (`/onboarding`)
- Si l'utilisateur quitte, il peut se reconnecter a `/login`

### Action 2 : Completer l'assistant de configuration

L'assistant comporte 5 etapes (duree estimee : 5 minutes) :

| Etape | Contenu | Obligatoire |
|-------|---------|-------------|
| 1. Bienvenue | Presentation des fonctionnalites cles (maintenance predictive, reduction couts, gain de temps) | Oui |
| 2. Entreprise | Nom, SIRET (14 chiffres), taille de flotte, secteur d'activite | Oui |
| 3. Premier vehicule | Immatriculation (format AA-123-AA), marque, modele, kilometrage | Oui |
| 4. Premier chauffeur | Prenom, nom, email, telephone | Optionnel (peut etre ignore) |
| 5. Recapitulatif | Resume de la configuration + conseils pour la suite | Oui |

L'assistant est accessible a `/onboarding` et peut etre ignore completement via le bouton "Passer l'installation".

### Action 3 : Ajouter ses vehicules restants

Deux methodes disponibles :

**Methode manuelle :** Page `/vehicles/new` -- ajouter un vehicule a la fois
**Import CSV en masse :** Telecharger le modele CSV depuis la page vehicules, le remplir, et l'importer

Le modele CSV contient les colonnes :
`immatriculation ; marque ; modele ; annee ; type_vehicule ; carburant ; kilometrage ; vin ; date_mise_en_service ; date_controle_technique ; date_atp ; date_tachygraphe ; numero_serie`

Types de vehicules acceptes : `VOITURE`, `FOURGON`, `POIDS_LOURD`, `POIDS_LOURD_FRIGO`

### Action 4 : Configurer les alertes et notifications

- Aller dans `/settings/notifications`
- Activer les notifications push (navigateur)
- Verifier les preferences email : maintenances, documents, alertes

Les categories de notifications disponibles :
- Maintenances (nouvelles demandes et validations)
- Documents (expirations a venir)
- Alertes (anomalies detectees)

### Action 5 : Inviter un collaborateur

- Aller dans `/settings/users/new`
- Creer un utilisateur avec un des 4 roles :
  - **Administrateur** : Controle total de la plateforme
  - **Directeur** : Gestion operationnelle complete
  - **Agent de parc** : Operations terrain (inspections, maintenance, carburant)
  - **Exploitant** : Chauffeur / Operateur (tournees, inspections, signalements)

---

## 3. Sequence emails J1 / J3 / J7 / J14

### J1 -- Email de bienvenue (automatique)

> Envoye automatiquement a l'inscription. Voir section 1 ci-dessus.

**Objet :** `Bienvenue sur FleetMaster Pro -- votre essai commence maintenant`
**Objectif :** Confirmer l'inscription, presenter les fonctionnalites, diriger vers le dashboard.

---

### J3 -- Avez-vous ajoute votre flotte ?

**Objet :** `{prenom}, avez-vous ajoute vos vehicules ?`

```
Bonjour {prenom},

Ca fait 3 jours que vous avez rejoint FleetMaster Pro.
Vous avez encore 11 jours pour profiter de votre essai gratuit.

Ou en etes-vous ?

Si vous n'avez pas encore ajoute tous vos vehicules, voici comment faire
en 2 minutes :

1. Telechargez notre modele CSV depuis la page Vehicules
2. Remplissez-le avec vos immatriculations, marques et kilometres
3. Importez-le en un clic

Le modele accepte les voitures, fourgons, poids lourds et poids lourds
frigo. Les dates de controle technique et ATP sont prises en compte pour
les alertes automatiques.

  [Importer mes vehicules] --> https://fleetmaster.pro/vehicles

Astuce : pensez aussi a renseigner les dates de controle technique et
d'ATP -- FleetMaster Pro vous alertera automatiquement avant chaque
echeance.

Une question ? Repondez a cet email.

A bientot,
L'equipe FleetMaster Pro
```

---

### J7 -- Decouvrez la maintenance predictive

**Objet :** `La maintenance predictive pour {nom_entreprise} -- activee`

```
Bonjour {prenom},

Vous etes a mi-parcours de votre essai gratuit.
Avez-vous explore la maintenance predictive ?

FleetMaster Pro analyse les donnees de vos vehicules (kilometrage,
historique d'entretien, type de vehicule) pour predire les prochaines
maintenances necessaires.

3 outils a decouvrir :

1. PLANNING MAINTENANCE
   Visualisez toutes les maintenances a venir sur un calendrier.
   --> https://fleetmaster.pro/maintenance-planning

2. REGLES DE MAINTENANCE
   Personnalisez les seuils et intervalles par type de vehicule.
   --> https://fleetmaster.pro/settings/maintenance-rules

3. TABLEAU DE BORD
   Le widget "Urgences maintenance" affiche en temps reel les
   vehicules qui necessitent une intervention imminente.
   --> https://fleetmaster.pro/dashboard

Chaque vehicule dispose aussi de sa propre fiche avec les predictions
de maintenance sur sa page dediee.

  [Explorer la maintenance] --> https://fleetmaster.pro/maintenance-planning

Bon a savoir : les entreprises qui utilisent la maintenance predictive
reduisent en moyenne leurs couts de reparation de 30%.

Bonne decouverte,
L'equipe FleetMaster Pro
```

---

### J11 -- Rappel fin d'essai (J-3)

> Cet email est envoye automatiquement par le handler Stripe `trial_will_end` ou par le cron interne.

**Objet :** `Votre essai FleetMaster Pro se termine dans 3 jours`

Le template est deja implemente dans `src/lib/email/templates/trial-ending.ts`. Il contient :
- Un compteur visuel "3 jours restants"
- La date d'expiration
- Le plan actuel et son prix
- Un bouton CTA "Activer mon abonnement"
- Une note : sans activation, retrogradation au plan Essentiel (5 vehicules), donnees conservees

---

### J14 -- Dernier jour

**Objet :** `Dernier jour pour {nom_entreprise} -- ne perdez pas vos donnees`

```
Bonjour {prenom},

Votre essai gratuit FleetMaster Pro se termine aujourd'hui.

Voici ce que votre compte contient :
- {nb_vehicules} vehicules enregistres
- {nb_conducteurs} conducteurs configures
- {nb_maintenances} interventions de maintenance tracees

Si vous n'activez pas votre abonnement avant ce soir, votre compte
sera automatiquement retro grade au plan Essentiel :
- Limite a 5 vehicules
- 10 utilisateurs maximum
- Fonctionnalites de base uniquement

Vos donnees sont conservees. Vous pouvez reactiver un plan superieur
a tout moment.

Nos 3 plans :

  ESSENTIAL -- 29 euros/mois
  5 vehicules, 10 utilisateurs, maintenance basique, QR codes

  PRO -- 49 euros/mois (recommande)
  20 vehicules, 50 utilisateurs, IA predictive, rapports avances,
  webhooks, support prioritaire

  UNLIMITED -- 129 euros/mois
  Vehicules et utilisateurs illimites, API publique, assistant IA
  reglementaire, account manager dedie, SLA 99.9%

  [Choisir mon plan] --> https://fleetmaster.pro/settings/billing

Besoin d'aide pour choisir ? Repondez a cet email, on vous conseille.

Merci de votre confiance,
L'equipe FleetMaster Pro
```

---

## 4. Guide "Demarrage en 15 minutes"

Ce guide est destine a etre partage avec le client (en PDF ou par email). Il couvre les 3 actions essentielles pour etre operationnel.

---

### Etape 1 : Importer ses vehicules (5 minutes)

**Option A -- Import CSV (recommande pour 5+ vehicules)**

1. Connectez-vous a https://fleetmaster.pro/dashboard
2. Cliquez sur **Vehicules** dans le menu lateral
3. Cliquez sur **Importer** (bouton en haut a droite)
4. Telechargez le **modele CSV** propose
5. Ouvrez le fichier dans Excel ou Google Sheets
6. Remplissez une ligne par vehicule :
   - **Immatriculation** : format AB-123-CD (obligatoire)
   - **Marque** : ex. Renault, Mercedes, Iveco
   - **Modele** : ex. Master, Trafic, Sprinter
   - **Annee** : ex. 2022
   - **Type** : VOITURE, FOURGON, POIDS_LOURD ou POIDS_LOURD_FRIGO
   - **Carburant** : diesel, gasoline, electric, hybrid ou lpg
   - **Kilometrage** : nombre entier (ex. 45000)
   - **Dates de controle** : format AAAA-MM-JJ (ex. 2025-06-30)
7. Enregistrez le fichier en CSV (separateur point-virgule)
8. Importez le fichier dans FleetMaster Pro
9. Verifiez le resume et confirmez

> Les lignes commencant par `#` sont ignorees. Le BOM UTF-8 est gere automatiquement pour Excel.

**Option B -- Ajout manuel**

1. Page Vehicules > bouton **Ajouter un vehicule**
2. Remplissez le formulaire : immatriculation, marque, modele, kilometrage
3. Validez

---

### Etape 2 : Configurer les alertes (5 minutes)

**Alertes automatiques sur les documents :**

FleetMaster Pro surveille automatiquement les dates suivantes pour chaque vehicule :
- **Controle technique** : alerte 30 jours avant expiration
- **Attestation ATP** : alerte pour les poids lourds frigo
- **Tachygraphe** : alerte pour les poids lourds

Pour que ces alertes fonctionnent, assurez-vous d'avoir renseigne les dates lors de l'import.

**Regles de maintenance predictive :**

1. Allez dans **Parametres > Regles de maintenance** (`/settings/maintenance-rules`)
2. Les regles par defaut sont deja configurees pour chaque type de vehicule
3. Vous pouvez personnaliser :
   - Les intervalles de vidange (km et mois)
   - Les seuils de remplacement des plaquettes de frein
   - Les frequences de controle des pneus
4. Le systeme calculera automatiquement les prochaines maintenances

**Notifications :**

1. Allez dans **Parametres > Notifications** (`/settings/notifications`)
2. Activez les **notifications push** pour recevoir les alertes en temps reel dans votre navigateur
3. Les **notifications email** sont activees par defaut pour :
   - Les demandes de maintenance
   - Les validations de maintenance
   - Les expirations de documents

---

### Etape 3 : Inviter son premier chauffeur (5 minutes)

1. Allez dans **Parametres > Utilisateurs** (`/settings/users`)
2. Cliquez sur **Nouvel utilisateur**
3. Remplissez :
   - Prenom et nom
   - Adresse email (servira d'identifiant)
   - Telephone
   - Mot de passe temporaire
   - Role : choisissez **Exploitant** pour un chauffeur
4. Validez la creation

**Les roles en detail :**

| Role | Acces |
|------|-------|
| Administrateur | Tout (utilisateurs, facturation, configuration) |
| Directeur | Gestion operationnelle, validation maintenance, rapports |
| Agent de parc | Inspections, demandes de maintenance, carburant |
| Exploitant | Ses tournees, inspections, signalements |

**Import CSV de conducteurs :**

Pour importer plusieurs conducteurs d'un coup :
1. Page Conducteurs > **Importer**
2. Telechargez le modele CSV
3. Colonnes : `nom ; prenom ; email ; telephone ; numero_permis ; categorie_permis ; date_expiration_permis ; date_naissance ; date_embauche ; type_contrat`
4. Categories de permis acceptees : B, C, CE, D, BE, C1, C1E, D1, D1E
5. Types de contrat : CDI, CDD, Interim, Gerant, Autre

---

## 5. Checklist avant la fin du trial

Ce que l'utilisateur doit avoir configure pour passer en payant sereinement. A envoyer a J11 (3 jours avant la fin).

### Checklist complete

- [ ] **Flotte importee** -- Tous vos vehicules sont dans FleetMaster Pro
  - Verifiez le nombre sur le dashboard (widget "Vehicules")
  - Chaque vehicule a son immatriculation, type et kilometrage

- [ ] **Dates de controle renseignees** -- Pour recevoir les alertes automatiques
  - Controle technique
  - ATP (poids lourds frigo)
  - Tachygraphe (poids lourds)

- [ ] **Conducteurs ajoutes** -- Votre equipe a acces a la plateforme
  - Au moins les chauffeurs principaux avec le role Exploitant
  - Chacun a son email et mot de passe

- [ ] **Notifications activees** -- Vous ne raterez aucune echeance
  - Notifications push activees dans le navigateur
  - Preferences email verifiees dans Parametres > Notifications

- [ ] **Premier entretien planifie** -- La maintenance est en place
  - Au moins une intervention de maintenance creee ou planifiee
  - Regles de maintenance predictive verifiees dans Parametres

- [ ] **Plan choisi** -- Vous savez quel plan correspond a vos besoins
  - Comptez vos vehicules :
    - 1 a 5 vehicules --> Plan Essential (29 euros/mois)
    - 6 a 20 vehicules --> Plan Pro (49 euros/mois)
    - 21+ vehicules --> Plan Unlimited (129 euros/mois)
  - La facturation est dans Parametres > Facturation (`/settings/billing`)
  - Paiement annuel disponible avec reduction (~17%)

### Ce qui se passe a la fin de l'essai

| Scenario | Consequence |
|----------|-------------|
| Abonnement active | Acces continu, aucune interruption |
| Aucun abonnement | Retrogradation au plan Essentiel (5 vehicules, 10 utilisateurs) |
| Donnees | Conservees dans tous les cas -- rien n'est supprime |

---

## 6. Script d'appel onboarding

Duree cible : 5 minutes. A utiliser pour le premier appel telephonique au nouveau client, idealement a J1 ou J2.

---

### Introduction (30 secondes)

```
Bonjour {prenom}, c'est {votre_prenom} de FleetMaster Pro.

Je vous appelle pour vous souhaiter la bienvenue et m'assurer que
tout se passe bien avec votre essai gratuit. Vous avez 2 minutes ?
```

> Si non disponible : "Pas de souci, je peux vous rappeler. Quel creneau vous arrange cette semaine ?"

---

### Decouverte rapide (1 minute)

```
Pour bien vous accompagner, j'aimerais comprendre votre activite.

- Combien de vehicules avez-vous au total ?
- C'est surtout des fourgons, des poids lourds, un mix ?
- Aujourd'hui, comment vous gerez la maintenance et les documents
  reglementaires ? Excel, papier, un autre logiciel ?
- Qu'est-ce qui vous a donne envie de tester FleetMaster Pro ?
```

> **Ecouter attentivement.** Noter la taille de la flotte (oriente vers le bon plan), le type de vehicules, et la douleur principale.

---

### Verification de la configuration (1 minute 30)

```
Super, merci. Je vois que votre compte est cree.

- Est-ce que vous avez eu le temps de faire le petit assistant
  de configuration au debut ? Il vous guide pour ajouter votre
  premier vehicule.

[Si non :]
  Pas de probleme, ca prend 5 minutes. Je peux vous guider
  maintenant si vous etes devant votre ecran, ou vous le ferez
  a votre rythme.

[Si oui :]
  Parfait ! Et pour le reste de votre flotte, vous avez vu qu'on
  peut importer tous les vehicules d'un coup via un fichier CSV ?
  C'est dans la page Vehicules, bouton "Importer". On fournit un
  modele tout pret.
```

---

### Mise en valeur (1 minute)

Adapter selon la douleur identifiee :

**Si la douleur est la conformite / les documents :**
```
Ce qui va vraiment vous changer la vie, c'est les alertes
automatiques. Des que vous renseignez les dates de controle
technique et d'ATP, FleetMaster Pro vous previent 30 jours
avant chaque echeance. Plus de risque d'oubli.
```

**Si la douleur est la maintenance / les pannes :**
```
On a un systeme de maintenance predictive. En fonction du
kilometrage, du type de vehicule et de l'historique d'entretien,
l'application vous dit quand faire la prochaine vidange, quand
changer les plaquettes, etc. Vous avez un planning complet dans
le menu "Planning maintenance".
```

**Si la douleur est le suivi general / Excel :**
```
Le tableau de bord centralise tout : nombre de vehicules,
chauffeurs, maintenances en cours, alertes. Vous avez aussi
des rapports hebdomadaires par email qui vous donnent l'etat
de sante de votre flotte. Fini les fichiers Excel partout.
```

---

### Prochaine etape et cloture (1 minute)

```
Pour resumer, voici ce que je vous conseille de faire cette
semaine :

1. Importez tous vos vehicules -- si besoin je vous envoie
   le modele CSV par email
2. Renseignez les dates de controle technique pour activer
   les alertes
3. Invitez votre agent de parc ou votre adjoint pour qu'il
   ait aussi acces

Vous avez encore {jours_restants} jours d'essai, donc prenez
le temps d'explorer. Et si vous avez la moindre question,
vous pouvez repondre directement a nos emails, on est reactifs.

Est-ce qu'il y a autre chose que je peux faire pour vous ?
```

> Si question sur les prix :
```
On a 3 plans. Pour {nb_vehicules} vehicules, le plan
{plan_recommande} a {prix} euros par mois serait le mieux
adapte. Mais vous avez tout le temps d'y reflechir, on vous
enverra un recapitulatif par email avant la fin de l'essai.
```

### Fin d'appel

```
Merci {prenom}, je vous laisse decouvrir la plateforme.
N'hesitez vraiment pas a nous ecrire si besoin. Bonne
continuation et a bientot !
```

---

## Annexes

### Grille tarifaire de reference

| Plan | Prix mensuel | Prix annuel | Vehicules | Utilisateurs | Fonctionnalites cles |
|------|-------------|-------------|-----------|-------------|----------------------|
| Essential | 29 euros | 290 euros | 5 | 10 | Dashboard, maintenance basique, QR codes, conformite de base |
| Pro | 49 euros | 490 euros | 20 | 50 | + IA predictive, rapports avances, webhooks, support prioritaire |
| Unlimited | 129 euros | 1 290 euros | Illimite | Illimite | + API publique, assistant IA reglementaire, account manager, SLA 99.9% |

### Fichiers source de reference

| Fichier | Contenu |
|---------|---------|
| `src/lib/email/templates/welcome.ts` | Template email de bienvenue (HTML + texte) |
| `src/lib/email/templates/trial-ending.ts` | Template rappel fin d'essai J-3 |
| `src/lib/email/client.ts` | Client Resend pour l'envoi d'emails |
| `src/app/api/auth/register-with-trial/route.ts` | API inscription avec essai 14 jours |
| `src/app/(onboarding)/page.tsx` | Wizard onboarding (5 etapes) |
| `src/lib/onboarding/constants.ts` | Textes et configuration des etapes |
| `src/lib/plans.ts` | Plans, prix, limites, features |
| `src/lib/import-templates.ts` | Modeles CSV vehicules et conducteurs |
| `src/app/(dashboard)/settings/users/new/page.tsx` | Creation d'utilisateur (invitations) |
| `src/app/(dashboard)/settings/notifications/page.tsx` | Configuration notifications |
| `src/app/(dashboard)/settings/maintenance-rules/page.tsx` | Regles maintenance predictive |
| `src/app/(dashboard)/settings/billing/page.tsx` | Facturation et changement de plan |
