# FleetMaster Pro -- Documentation Technique

> **Version** : 0.1.0
> **Derniere mise a jour** : 17 mars 2026
> **Statut** : Production
> **URL** : https://fleetmaster.pro

---

## Table des matieres

1. [Stack technique](#1-stack-technique)
2. [Architecture de l'application](#2-architecture-de-lapplication)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Schema de base de donnees](#4-schema-de-base-de-donnees)
5. [API publique v1](#5-api-publique-v1)
6. [PWA -- Service Worker](#6-pwa--service-worker)
7. [Systeme de notifications](#7-systeme-de-notifications)
8. [Cron jobs](#8-cron-jobs)
9. [Roles et permissions](#9-roles-et-permissions)
10. [Guide de deploiement Vercel](#10-guide-de-deploiement-vercel)

---

## 1. Stack technique

### Framework et runtime

| Technologie | Version | Role |
|---|---|---|
| **Next.js** | ^14.2.35 | Framework React full-stack (App Router) |
| **React** | 18.2.0 | Bibliotheque UI |
| **React DOM** | 18.2.0 | Rendu DOM |
| **TypeScript** | ^5 | Typage statique |
| **Tailwind CSS** | ^3.4.1 | Framework CSS utilitaire |
| **PostCSS** | ^8 | Transformation CSS |

### Backend et BaaS

| Technologie | Version | Role |
|---|---|---|
| **Supabase JS** | ^2.94.0 | Client Supabase (queries, auth, storage) |
| **Supabase SSR** | ^0.8.0 | Auth cote serveur (cookies) |
| **Supabase Auth Helpers** | ^0.15.0 | Helpers auth Next.js |
| **Stripe** | ^20.3.0 | Paiements serveur |
| **Stripe JS** | ^8.7.0 | Paiements client |
| **Stripe React** | ^5.6.0 | Composants Stripe React |
| **Resend** | ^6.9.1 | Envoi d'emails transactionnels |
| **web-push** | ^3.6.7 | Push notifications (protocole VAPID) |

### IA et Machine Learning

| Technologie | Version | Role |
|---|---|---|
| **@anthropic-ai/sdk** | ^0.78.0 | Assistant IA reglementaire (Claude Haiku) |
| **openai** | ^6.25.0 | Scoring IA vehicules/conducteurs (GPT-4o-mini) |

### UI et composants

| Technologie | Version | Role |
|---|---|---|
| **Radix UI** | Divers ^1.x-2.x | Primitives d'accessibilite (Dialog, Select, Tabs, Toast...) |
| **Lucide React** | ^0.563.0 | Icones SVG |
| **Recharts** | ^3.7.0 | Graphiques et visualisations |
| **Framer Motion** | ^12.33.0 | Animations |
| **React Big Calendar** | ^1.19.4 | Calendrier/agenda |
| **React Day Picker** | ^9.13.1 | Selecteur de date |
| **React Hook Form** | ^7.71.1 | Gestion de formulaires |
| **@hookform/resolvers** | ^5.2.2 | Validation Zod pour RHF |
| **@dnd-kit** | core ^6.3.1, sortable ^10.0.0 | Drag & Drop |
| **Sonner** | ^2.0.7 | Notifications toast |
| **next-themes** | ^0.4.6 | Theme clair/sombre |
| **class-variance-authority** | ^0.7.1 | Gestion de variantes CSS |
| **clsx** | ^2.1.1 | Concatenation de classes |
| **tailwind-merge** | ^3.4.0 | Fusion intelligente de classes Tailwind |

### Utilitaires

| Technologie | Version | Role |
|---|---|---|
| **Zod** | ^4.3.6 | Validation de schemas |
| **date-fns** | ^4.1.0 | Manipulation de dates |
| **pdf-lib** | ^1.17.1 | Generation de PDF (carnets, rapports) |
| **@pdf-lib/fontkit** | ^1.1.1 | Support polices personnalisees PDF |
| **papaparse** | ^5.5.3 | Parsing CSV |
| **xlsx** | ^0.18.5 | Import/export Excel |
| **html5-qrcode** | ^2.3.8 | Scan QR codes camera |
| **qrcode.react** | ^4.2.0 | Generation QR codes React |
| **uuid** | ^13.0.0 | Generation d'identifiants uniques |
| **iconv-lite** | ^0.7.2 | Encodage caracteres |
| **next-safe-action** | ^8.0.11 | Server Actions typees et securisees |

### Monitoring et analytics

| Technologie | Version | Role |
|---|---|---|
| **@sentry/nextjs** | ^10.39.0 | Error tracking et performance |
| **posthog-js** | ^1.351.3 | Analytics produit (instance EU -- RGPD) |

### Rate Limiting

| Technologie | Version | Role |
|---|---|---|
| **@upstash/ratelimit** | ^2.0.8 | Rate limiting distribue (Redis) |
| **@upstash/redis** | ^1.36.2 | Client Redis serverless |

### API Documentation

| Technologie | Version | Role |
|---|---|---|
| **swagger-ui-react** | ^5.32.0 | Interface interactive API docs |

### Tests

| Technologie | Version | Role |
|---|---|---|
| **Jest** | ^30.2.0 | Tests unitaires |
| **@testing-library/react** | ^16.3.2 | Tests composants React |
| **@playwright/test** | ^1.58.2 | Tests end-to-end |
| **ts-jest** | ^29.4.6 | Support TypeScript Jest |

### Build et optimisation

| Technologie | Version | Role |
|---|---|---|
| **sharp** | ^0.34.5 | Optimisation d'images |
| **ESLint** | ^8 | Linting (desactive au build) |
| **eslint-config-next** | ^14.2.3 | Config ESLint Next.js |

---

## 2. Architecture de l'application

### Structure des dossiers

```
src/
  app/
    (dashboard)/          # Layout authentifie (sidebar, header)
      dashboard/          # Tableau de bord principal
      vehicles/           # CRUD vehicules + detail + edition
      drivers/            # CRUD conducteurs + detail + edition
      fuel/               # Suivi carburant
      maintenance/        # Gestion maintenance (workflow complet)
      maintenance-planning/  # Planning maintenance predictive
      compliance/         # Conformite reglementaire
      incidents/          # Gestion incidents
      inspection/         # Inspections vehicules
      inspections/        # Liste inspections
      alerts/             # Centre d'alertes
      agenda/             # Calendrier / agenda
      fleet-costs/        # Analyse couts flotte (TCO)
      notifications/      # Centre de notifications
      support/            # Support client (tickets)
      sos/                # Module SOS Garage (recherche, protocoles)
      settings/
        page.tsx          # Vue d'ensemble parametres
        profile/          # Profil utilisateur
        company/          # Parametres entreprise
        billing/          # Facturation Stripe
        users/            # Gestion utilisateurs (CRUD)
        security/         # Securite (logs, sessions)
        notifications/    # Preferences notifications
        appearance/       # Theme et personnalisation
        webhooks/         # Cles API et webhooks
        maintenance-rules/  # Regles maintenance predictive
        integrations/     # Integrations tierces
        emails/           # Parametres email
        activity/         # Journal d'activite
        sos/              # Parametres SOS
      unauthorized/       # Page acces refuse
    (auth)/               # Layout non authentifie
      login/              # Connexion
      register/           # Inscription
      forgot-password/    # Mot de passe oublie
    (onboarding)/         # Flux d'onboarding
    api/                  # Routes API (voir section dediee)
    api-docs/             # Swagger UI (documentation API interactive)
    driver-app/           # Application chauffeur (interface simplifiee)
    scan/                 # Scan QR codes vehicules (public)
    superadmin/           # Interface superadmin
  components/
    ui/                   # Composants Radix UI / shadcn
    dashboard/            # Widgets dashboard
    vehicles/             # Composants vehicules
    drivers/              # Composants conducteurs
    maintenance/          # Composants maintenance
    ai/                   # Assistant IA reglementaire
    analytics/            # PostHog provider
  lib/
    supabase/             # Clients Supabase (server, client, admin)
    email/                # Client Resend + templates
    notifications/        # Systeme de notifications multi-canal
    push/                 # Web Push (VAPID, subscriptions)
    security/             # Rate limiting, CSRF, tenant guard
    stripe/               # Handlers Stripe (checkout, webhook, invoice)
    export/               # Generateurs PDF et CSV
    ai/                   # Scoring IA, budget guard, client OpenAI
    openapi/              # Specification OpenAPI 3.0
    compliance/           # Calcul echeances conformite
    pdf/                  # Helpers PDF (couleurs, polices)
    vehicle/              # Types vehicules, calcul dates
    onboarding/           # Constantes et validation onboarding
    activity/             # Formatters journal d'activite
    api/                  # Protection debug endpoints
  types/
    supabase.ts           # Types Database generes/maintenus manuellement
  constants/
    enums.ts              # Enumerations centralisees (roles, statuts)
  hooks/                  # Hooks React personnalises
  actions/                # Server Actions (next-safe-action)
```

### Pages principales (dashboard)

| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord principal avec KPIs |
| `/vehicles` | Liste des vehicules avec filtres et tri |
| `/vehicles/[id]` | Detail vehicule (documents, maintenance, inspections) |
| `/vehicles/new` | Ajout vehicule |
| `/drivers` | Liste des conducteurs |
| `/drivers/[id]` | Detail conducteur (documents, affectations) |
| `/fuel` | Suivi carburant (saisie, historique, anomalies) |
| `/maintenance` | Liste maintenances avec workflow |
| `/maintenance/[id]` | Detail maintenance |
| `/maintenance-planning` | Planning maintenance predictive |
| `/compliance` | Tableau de conformite reglementaire |
| `/incidents` | Gestion des incidents/sinistres |
| `/inspection` | Inspections vehicules (QR code) |
| `/alerts` | Centre d'alertes (documents, maintenance, carburant) |
| `/agenda` | Calendrier des evenements |
| `/fleet-costs` | Analyse TCO (Total Cost of Ownership) |
| `/sos` | Module SOS Garage (urgences mecaniques) |
| `/notifications` | Centre de notifications in-app |
| `/support` | Tickets de support |
| `/settings/*` | Parametres (profil, entreprise, facturation, utilisateurs, etc.) |

### Routes API internes

| Route | Methode | Description |
|---|---|---|
| `/api/auth/register` | POST | Inscription utilisateur |
| `/api/auth/register-with-trial` | POST | Inscription avec trial |
| `/api/auth/logout` | POST | Deconnexion |
| `/api/dashboard` | GET | Donnees tableau de bord |
| `/api/vehicles` | GET | Liste vehicules (interne) |
| `/api/vehicles/[id]` | GET/PATCH/DELETE | CRUD vehicule |
| `/api/vehicles/[id]/carnet/pdf` | GET | Export PDF carnet d'entretien |
| `/api/vehicles/[id]/maintenance-predictions` | GET | Predictions maintenance vehicule |
| `/api/maintenance/validate` | POST | Validation workflow maintenance |
| `/api/maintenance-predictions/all` | GET | Toutes les predictions |
| `/api/maintenance-predictions/top` | GET | Urgences maintenance (widget) |
| `/api/maintenance-predictions/reset` | POST | Reset predictions |
| `/api/calendar/events` | GET | Evenements calendrier |
| `/api/export/csv` | POST | Export CSV |
| `/api/export/pdf` | POST | Export PDF |
| `/api/incidents/[id]/pdf` | GET | Export PDF incident |
| `/api/reports/compliance` | GET | Rapport conformite |
| `/api/push/subscribe` | POST | Souscription push |
| `/api/push/unsubscribe` | POST | Desinscription push |
| `/api/ai/regulatory-assistant` | GET/POST | Assistant IA reglementaire |
| `/api/stripe/create-checkout-session` | POST | Creation session Stripe |
| `/api/stripe/webhook` | POST | Webhook Stripe |
| `/api/stripe/checkout-success` | GET | Succes paiement |
| `/api/sos/*` | Divers | Module SOS Garage (recherche, contacts, protocoles) |
| `/api/onboarding/*` | Divers | Flux d'onboarding (company, vehicle, driver, complete) |
| `/api/support/*` | Divers | Tickets et messages support |
| `/api/admin/create-superadmin` | POST | Creation superadmin (protege par secret) |
| `/api/admin/reset-user-password` | POST | Reset mot de passe (protege par secret) |
| `/api/docs` | GET | Specification OpenAPI JSON |
| `/api/health` | GET | Health check |
| `/api/email/unsubscribe-reports` | GET | Desinscription rapports email |

---

## 3. Variables d'environnement

### Application

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Oui | URL de l'application (ex: `https://fleetmaster.pro`) |

### Supabase

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Cle anonyme Supabase (cote client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Cle service role (bypass RLS -- serveur uniquement) |

### Stripe (Paiements)

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Oui | Cle publique Stripe |
| `STRIPE_SECRET_KEY` | Oui | Cle secrete Stripe |
| `STRIPE_WEBHOOK_SECRET` | Oui | Secret webhook Stripe (`whsec_...`) |
| `STRIPE_PRICE_ID_ESSENTIAL` | Oui | Price ID plan Essential mensuel |
| `STRIPE_PRICE_ID_ESSENTIAL_YEARLY` | Oui | Price ID plan Essential annuel |
| `STRIPE_PRICE_ID_PRO` | Oui | Price ID plan Pro mensuel |
| `STRIPE_PRICE_ID_PRO_YEARLY` | Oui | Price ID plan Pro annuel |
| `STRIPE_PRICE_ID_UNLIMITED` | Oui | Price ID plan Unlimited mensuel |
| `STRIPE_PRICE_ID_UNLIMITED_YEARLY` | Oui | Price ID plan Unlimited annuel |

### Email (Resend)

| Variable | Obligatoire | Description |
|---|---|---|
| `RESEND_API_KEY` | Oui | Cle API Resend (`re_...`) |
| `RESEND_FROM_EMAIL` | Non | Adresse expediteur (defaut: `onboarding@resend.dev`) |

### Push Notifications (VAPID)

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Oui | Cle publique VAPID (base64url) |
| `VAPID_PRIVATE_KEY` | Oui | Cle privee VAPID (base64url) |
| `VAPID_SUBJECT` | Oui | Sujet VAPID (`mailto:contact@fleet-master.fr`) |

Generation des cles VAPID :
```bash
node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys()))"
```

### Notifications (configuration)

| Variable | Obligatoire | Description |
|---|---|---|
| `MAX_EMAILS_PER_DAY` | Non | Limite emails/jour (defaut: 10) |
| `NOTIFICATIONS_ENABLED` | Non | Activer les notifications (defaut: true) |
| `EMAIL_NOTIFICATIONS_ENABLED` | Non | Activer les emails (defaut: true) |
| `PUSH_NOTIFICATIONS_ENABLED` | Non | Activer le push (defaut: true) |

### Securite

| Variable | Obligatoire | Description |
|---|---|---|
| `SUPERADMIN_EMAIL` | Oui | Email du superadmin |
| `SUPERADMIN_SETUP_SECRET` | Oui | Secret pour les endpoints admin (32+ caracteres) |
| `CRON_SECRET` | Oui | Secret pour authentifier les cron jobs Vercel |

### Sentry (Error Tracking)

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Oui | DSN Sentry (client) |
| `SENTRY_DSN` | Oui | DSN Sentry (serveur) |
| `SENTRY_ORG` | Non | Organisation Sentry (defaut: `fleetmaster`) |
| `SENTRY_PROJECT` | Non | Projet Sentry (defaut: `fleetmaster-pro`) |
| `SENTRY_AUTH_TOKEN` | Oui (CI) | Token pour upload source maps |

### Upstash Redis (Rate Limiting)

| Variable | Obligatoire | Description |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Recommande | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Recommande | Token Upstash Redis |

> Si non configure, le rate limiting tombe en fallback memoire (non distribue).

### IA

| Variable | Obligatoire | Description |
|---|---|---|
| `OPENAI_API_KEY` | Oui | Cle API OpenAI (scoring vehicules/conducteurs) |
| `ANTHROPIC_API_KEY` | Oui | Cle API Anthropic (assistant IA reglementaire) |

### Analytics

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Recommande | Cle projet PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | Non | Host PostHog (defaut: `https://eu.posthog.com`) |

---

## 4. Schema de base de donnees

Base de donnees PostgreSQL hebergee sur **Supabase** avec Row Level Security (RLS) active.

### Tables principales

#### `companies`
Entreprises clientes de la plateforme.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `name` | text | Nom de l'entreprise |
| `siret` | text | Numero SIRET |
| `address`, `postal_code`, `city`, `country` | text | Adresse complete |
| `phone`, `email` | text | Contact |
| `subscription_plan` | text | Plan actif (ESSENTIAL, PRO, UNLIMITED) |
| `subscription_status` | text | Statut (trialing, active, past_due, canceled...) |
| `stripe_customer_id` | text | ID client Stripe |
| `stripe_subscription_id` | text | ID abonnement Stripe |
| `max_vehicles`, `max_drivers` | integer | Limites du plan |
| `onboarding_completed` | boolean | Onboarding termine |
| `monthly_report_enabled` | boolean | Rapport mensuel active |
| `monthly_report_day` | integer | Jour d'envoi du rapport |
| `monthly_report_recipients` | text | Destinataires du rapport |
| `created_at`, `updated_at` | timestamptz | Horodatage |

#### `profiles`
Profils utilisateurs (lies a `auth.users` de Supabase).

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK, FK -> auth.users) | ID utilisateur |
| `email` | text | Email |
| `first_name`, `last_name` | text | Nom complet |
| `company_id` | uuid (FK -> companies) | Entreprise |
| `role` | enum | ADMIN, DIRECTEUR, AGENT_DE_PARC, EXPLOITANT, CHAUFFEUR |
| `is_active` | boolean | Compte actif |
| `phone` | text | Telephone |
| `avatar_url` | text | URL avatar |
| `email_notifications` | boolean | Recevoir emails |
| `notify_maintenance` | boolean | Alertes maintenance |
| `created_by` | uuid | Cree par (invitation) |
| `last_login` | timestamptz | Derniere connexion |

#### `vehicles`
Parc de vehicules.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `company_id` | uuid (FK) | Entreprise proprietaire |
| `registration_number` | text | Immatriculation (ex: AB-123-CD) |
| `brand`, `model` | text | Marque et modele |
| `year` | integer | Annee de mise en circulation |
| `type` | text | Type (VOITURE, FOURGON, POIDS_LOURD, POIDS_LOURD_FRIGO) |
| `fuel_type` | enum | diesel, gasoline, electric, hybrid, lpg |
| `vin` | text | Numero de chassis (VIN) |
| `mileage` | integer | Kilometrage actuel |
| `status` | enum | ACTIF, INACTIF, EN_MAINTENANCE, ARCHIVE |
| `technical_control_expiry` | date | Expiration controle technique |
| `insurance_expiry` | date | Expiration assurance |
| `tachy_control_expiry` | date | Expiration controle tachygraphe |
| `atp_expiry` | date | Expiration ATP (frigo) |
| `assigned_driver_id` | uuid (FK -> drivers) | Chauffeur affecte |
| `qr_code_url`, `qr_code_data` | text | QR Code du vehicule |
| `current_latitude`, `current_longitude` | numeric | Position GPS |
| `deleted_at` | timestamptz | Soft delete |

#### `drivers`
Conducteurs de la flotte.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `company_id` | uuid (FK) | Entreprise |
| `first_name`, `last_name` | text | Nom complet |
| `email`, `phone` | text | Contact |
| `status` | enum | active, inactive, on_leave, suspended, terminated |
| `license_number` | text | Numero de permis |
| `license_type` | text | Categorie (B, C, C+E...) |
| `license_expiry` | date | Expiration permis |
| `medical_certificate_expiry` | date | Expiration visite medicale |
| `fimo_expiry` | date | Expiration FIMO |
| `fcos_expiry` | date | Expiration FCOS |
| `adr_certificate_expiry` | date | Expiration ADR |
| `cqc_expiry_date` | date | Expiration CQC |
| `driver_card_number` | text | Numero carte conducteur |
| `driver_card_expiry` | date | Expiration carte conducteur |
| `contract_type` | enum | CDI, CDD, Interim, Gerant, Autre |
| `safety_score` | numeric | Score securite (IA) |
| `fuel_efficiency_score` | numeric | Score eco-conduite (IA) |
| `current_vehicle_id` | uuid (FK -> vehicles) | Vehicule affecte |
| `user_id` | uuid (FK -> auth.users) | Compte utilisateur lie |
| `has_app_access` | boolean | Acces application chauffeur |

#### `maintenance_records`
Demandes et interventions de maintenance.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `company_id` | uuid (FK) | Entreprise |
| `vehicle_id` | uuid (FK -> vehicles) | Vehicule concerne |
| `requested_by` | uuid (FK -> profiles) | Demandeur |
| `type` | text | Type (VIDANGE, FREINS, PNEUS...) |
| `description` | text | Description du probleme |
| `priority` | enum | LOW, NORMAL, HIGH, CRITICAL |
| `status` | text | Statut workflow (DEMANDEE, VALIDEE, RDV_PLANIFIE, EN_COURS, TERMINEE...) |
| `requested_at` | timestamptz | Date demande |
| `validated_at` | timestamptz | Date validation |
| `completed_at` | timestamptz | Date completion |
| `garage_name`, `garage_address`, `garage_phone` | text | Infos garage |
| `rdv_date`, `rdv_time` | text | Rendez-vous |
| `estimated_cost`, `final_cost` | numeric | Couts |
| `mileage_at_maintenance` | integer | Kilometrage a la maintenance |
| `parts_replaced` | text[] | Pieces remplacees |
| `photos_before`, `photos_after` | text[] | Photos avant/apres |

#### `fuel_records`
Enregistrements de pleins de carburant.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `company_id` | uuid (FK) | Entreprise |
| `vehicle_id` | uuid (FK -> vehicles) | Vehicule |
| `driver_id` | uuid (FK -> drivers) | Conducteur |
| `date` | date | Date du plein |
| `quantity_liters` | numeric | Quantite (litres) |
| `price_total` | numeric | Prix total |
| `price_per_liter` | numeric | Prix au litre |
| `mileage_at_fill` | integer | Kilometrage |
| `fuel_type` | text | Type de carburant |
| `station_name` | text | Station-service |
| `consumption_l_per_100km` | numeric | Consommation calculee |

#### `vehicle_inspections`
Inspections et tours de vehicule.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `vehicle_id` | uuid (FK) | Vehicule inspecte |
| `company_id` | uuid (FK) | Entreprise |
| `inspection_date` | date | Date de l'inspection |
| `mileage` | integer | Kilometrage |
| `fuel_level`, `adblue_level` | numeric | Niveaux |
| `cleanliness_exterior`, `cleanliness_interior` | integer | Notes proprete (1-5) |
| `tires_condition` | jsonb | Etat des pneus (par position) |
| `reported_defects` | jsonb | Defauts signales |
| `score` | integer | Score global |
| `status` | text | Statut (draft, completed, validated) |
| `qr_code_url` | text | QR code de l'inspection |

### Tables secondaires

| Table | Description |
|---|---|
| `subscriptions` | Abonnements Stripe (plan, status, limites, periodes) |
| `notifications` | Notifications in-app (user_id, type, title, message, read) |
| `push_subscriptions` | Souscriptions Web Push (endpoint, keys, user_agent) |
| `ai_conversations` | Historique IA reglementaire (company_id, question, answer, tokens) |
| `alerts` | Alertes flotte (type, severity, entity_type, entity_id) |
| `activity_logs` | Journal d'activite (action_type, entity_type, metadata) |
| `vehicle_documents` | Documents vehicules (carte grise, assurance, CT...) |
| `driver_documents` | Documents conducteurs (permis, FIMO, visite medicale, ADR...) |
| `maintenance_agenda` | Evenements agenda maintenance (RDV garage, rappels) |
| `maintenance_status_history` | Historique des changements de statut maintenance |
| `maintenance_reminder_logs` | Logs des rappels maintenance envoyes |
| `user_appearance_settings` | Preferences d'affichage (theme, densite, police, langue) |
| `user_notification_preferences` | Preferences de notification par type |
| `user_login_history` | Historique de connexions |
| `user_invitations` | Invitations utilisateurs (token, role, expiration) |
| `routes` | Tournees/routes planifiees |
| `route_stops` | Arrets des tournees |
| `api_keys` | Cles API publique (id, key, company_id, is_active, last_used_at) |
| `monthly_report_logs` | Logs envoi rapports mensuels |
| `monthly_report_unsubscribes` | Desinscriptions rapports |
| `sos_providers` | Prestataires SOS Garage |
| `sos_contracts` | Contrats assistance |
| `emergency_protocols` | Protocoles d'urgence |
| `incidents` | Incidents et sinistres |

### Isolation des donnees (Multi-tenant)

Chaque table contient une colonne `company_id`. Les politiques RLS (Row Level Security) de Supabase garantissent qu'un utilisateur ne peut acceder qu'aux donnees de son entreprise. Le middleware Next.js verifie egalement le `company_id` du profil utilisateur.

Le client admin (`createAdminClient()`) bypass le RLS -- utilise uniquement cote serveur pour les cron jobs et les operations system.

---

## 5. API publique v1

### Vue d'ensemble

L'API REST publique est accessible sous le prefixe `/api/v1/`. Elle permet aux clients de gerer leur flotte de maniere programmatique.

- **Documentation interactive** : `/api-docs` (Swagger UI)
- **Specification OpenAPI** : `GET /api/docs` (JSON)
- **Version** : 1.0.0

### Authentification

Deux methodes supportees :

```bash
# Header x-api-key
curl -H "x-api-key: sk_live_xxxxxxxx" https://app.fleetmaster.fr/api/v1/vehicles

# Header Authorization Bearer
curl -H "Authorization: Bearer sk_live_xxxxxxxx" https://app.fleetmaster.fr/api/v1/vehicles
```

Les cles API sont gerees depuis **Parametres > Cles API** (`/settings/webhooks`).

### Rate Limiting

| Plan | Limite | Fenetre |
|---|---|---|
| ESSENTIAL | 100 requetes | par heure |
| PRO | 1 000 requetes | par heure |
| UNLIMITED | 10 000 requetes | par heure |

Headers de reponse :

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1710000000000
X-RateLimit-Plan: PRO
```

### Format de reponse standard

```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20
  },
  "error": null
}
```

En cas d'erreur :
```json
{
  "data": null,
  "meta": null,
  "error": "Unauthorized -- x-api-key header is required or invalid"
}
```

### Endpoints

#### Vehicules

**`GET /api/v1/vehicles`** -- Lister les vehicules

| Parametre | Type | Defaut | Description |
|---|---|---|---|
| `status` | string | - | Filtre : ACTIF, INACTIF, EN_MAINTENANCE, ARCHIVE |
| `page` | integer | 1 | Numero de page |
| `per_page` | integer | 20 | Resultats par page (max 200) |

```bash
curl -H "x-api-key: sk_live_xxx" \
  "https://app.fleetmaster.fr/api/v1/vehicles?status=ACTIF&page=1&per_page=50"
```

**`GET /api/v1/vehicles/{id}`** -- Detail d'un vehicule

```bash
curl -H "x-api-key: sk_live_xxx" \
  "https://app.fleetmaster.fr/api/v1/vehicles/550e8400-e29b-41d4-a716-446655440000"
```

**`POST /api/v1/vehicles`** -- Creer un vehicule (plan UNLIMITED requis)

```bash
curl -X POST -H "x-api-key: sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "AB-123-CD",
    "brand": "Renault",
    "model": "Master",
    "year": 2024,
    "type": "FOURGON",
    "fuel_type": "diesel"
  }' \
  "https://app.fleetmaster.fr/api/v1/vehicles"
```

#### Conducteurs

**`GET /api/v1/drivers`** -- Lister les conducteurs

| Parametre | Type | Description |
|---|---|---|
| `status` | string | Filtre : active, inactive, on_leave, suspended, terminated |
| `page` | integer | Numero de page |
| `per_page` | integer | Resultats par page (max 200) |

**`GET /api/v1/drivers/{id}`** -- Detail d'un conducteur

#### Carburant

**`GET /api/v1/fuel-records`** -- Lister les pleins

| Parametre | Type | Description |
|---|---|---|
| `vehicle_id` | uuid | Filtre par vehicule |
| `date_from` | date (YYYY-MM-DD) | Date de debut |
| `date_to` | date (YYYY-MM-DD) | Date de fin |
| `page` | integer | Numero de page |
| `per_page` | integer | Resultats par page |

**`POST /api/v1/fuel-records`** -- Ajouter un plein

```bash
curl -X POST -H "x-api-key: sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "550e8400-...",
    "date": "2026-03-15",
    "quantity_liters": 80.5,
    "price_total": 112.70,
    "mileage_at_fill": 45200,
    "fuel_type": "diesel"
  }' \
  "https://app.fleetmaster.fr/api/v1/fuel-records"
```

#### Maintenance

**`GET /api/v1/maintenance`** -- Lister les maintenances

| Parametre | Type | Description |
|---|---|---|
| `vehicle_id` | uuid | Filtre par vehicule |
| `status` | string | Filtre par statut |
| `priority` | string | Filtre : LOW, NORMAL, HIGH, CRITICAL |
| `page`, `per_page` | integer | Pagination |

#### Conformite

**`GET /api/v1/compliance`** -- Resume conformite flotte

Retourne un objet avec :
- `summary` : statistiques globales (taux conformite vehicules/conducteurs)
- `vehicles` : documents expires et bientot expires
- `drivers` : documents expires et bientot expires (seuil 30 jours)

#### Alertes

**`GET /api/v1/alerts`** -- Alertes actives

Retourne les documents expires/bientot expires et maintenances en retard, tries par severite.

### Codes HTTP

| Code | Signification |
|---|---|
| 200 | Succes |
| 400 | Requete invalide |
| 401 | Non authentifie (cle API manquante ou invalide) |
| 403 | Interdit (plan insuffisant ou limite atteinte) |
| 404 | Ressource non trouvee |
| 422 | Erreur de validation |
| 429 | Rate limit depasse |
| 500 | Erreur serveur |

---

## 6. PWA -- Service Worker

### Configuration PWA

Le manifest (`/public/manifest.json`) configure l'application comme PWA :

- **Nom** : FleetMaster Pro
- **Nom court** : FleetMaster
- **Mode d'affichage** : `standalone` (plein ecran sans barre navigateur)
- **Couleur de fond** : `#09090b` (sombre)
- **Orientation** : `any`
- **Langue** : `fr`
- **Scope** : `/`
- **Start URL** : `/dashboard`
- **Categories** : business, productivity, utilities

**Raccourcis** :
- Tableau de bord (`/dashboard`)
- Vehicules (`/vehicles`)
- SOS Garage (`/sos`)

**Icones** : 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 + SVG maskable.

### Service Worker (`/public/sw.js`)

**Version** : `v2` (changer `CACHE_VERSION` pour forcer le refresh).

#### Strategies de cache

| Ressource | Strategie | Cache | Duree |
|---|---|---|---|
| Assets statiques Next.js (`/_next/static/`) | **Cache-first** | `fleetmaster-static-v2` | Permanent (content-hashed) |
| Icones, images PWA, manifest | **Cache-first** | `fleetmaster-static-v2` | Permanent |
| Appels API (`/api/*`) | **Network-first** | `fleetmaster-pages-v2` | 1 heure max |
| Pages HTML | **Network-first** | `fleetmaster-pages-v2` | Non cache (donnees fraiches) |
| Autres requetes | Network avec fallback cache | - | - |

#### Precache

Au premier chargement, le SW precache :
- `/manifest.json`
- `/icons/icon-192x192.png`
- `/icons/icon-512x512.png`

#### Cycle de vie

- **Install** : `skipWaiting()` -- activation immediate
- **Activate** : `clients.claim()` + purge des anciens caches
- **Requetes ignorees** : non-GET, extensions Chrome, HMR Next.js, optimiseur d'images

#### Reponse hors-ligne

En cas d'echec reseau sur une route API :
```json
{ "error": "Hors-ligne", "offline": true }
```

### Headers de securite

Le service worker est servi avec :
```
Cache-Control: no-cache, no-store, must-revalidate
Service-Worker-Allowed: /
```

---

## 7. Systeme de notifications

### Architecture multi-canal

Le systeme de notification supporte 3 canaux :

| Canal | Description | Implementation |
|---|---|---|
| **in_app** | Notifications dans l'interface | Table `notifications` dans Supabase |
| **email** | Emails transactionnels | Resend API (`src/lib/email/client.ts`) |
| **push** | Notifications push navigateur | Web Push API + VAPID (`src/lib/push/`) |

### Canaux par defaut selon le type

| Type de notification | In-app | Email | Push |
|---|---|---|---|
| `maintenance_due` | Oui | Oui | Non |
| `maintenance_overdue` | Oui | Oui | Oui |
| `document_expiring` | Oui | Oui | Non |
| `document_expired` | Oui | Oui | Oui |
| `fuel_anomaly` | Oui | Oui | Non |
| `alert_critical` | Oui | Oui | Oui |
| `alert_warning` | Oui | Oui | Non |
| `alert_info` | Oui | Non | Non |
| `system` | Oui | Oui | Non |

Les preferences utilisateur (`user_notification_preferences`) peuvent overrider ces defauts.

### Push Notifications

**Protocole** : Web Push (RFC 8030) avec authentification VAPID.

**Fichiers cles** :
- `src/lib/push/vapid.ts` -- Configuration VAPID
- `src/lib/push/subscriptions.ts` -- Gestion souscriptions
- `src/lib/push/send-notification.ts` -- Envoi push
- `src/hooks/use-push-notifications.ts` -- Hook React

**API** :
- `POST /api/push/subscribe` -- Enregistrer un appareil
- `POST /api/push/unsubscribe` -- Deinscrire un appareil

**Service Worker** (evenements push) :
- `push` : Affiche la notification avec titre, corps, icone, badge, vibration
- `notificationclick` : Ouvre/focus la fenetre FleetMaster et navigue vers l'URL

### Email

**Provider** : [Resend](https://resend.com)

**Templates** (`src/lib/email/templates/`) :
- `welcome.ts` -- Email de bienvenue
- `trial-ending.ts` -- Fin de periode d'essai
- `payment-failed.ts` -- Echec de paiement
- `monthly-report.ts` -- Rapport mensuel de flotte
- `maintenance-alert.ts` -- Alerte maintenance
- `weekly-fleet-report.ts` -- Rapport hebdomadaire

**Mode test** : En developpement, les emails sont rediriges vers `RESEND_TEST_EMAIL` ou simules si Resend n'est pas configure.

---

## 8. Cron jobs

Toutes les taches planifiees sont configurees dans `vercel.json` et executees via des routes API protegees par le header `x-vercel-cron-secret`.

| Route | Schedule | Description |
|---|---|---|
| `/api/cron/check-trials` | `0 6 * * *` (6h chaque jour) | Verifie les trials expires et envoie des alertes |
| `/api/cron/vehicle-documents-check` | `0 8 * * *` (8h chaque jour) | Verifie les documents vehicules (CT, assurance, ATP...) |
| `/api/cron/driver-documents` | `0 7 * * *` (7h chaque jour) | Verifie les documents conducteurs (permis, FIMO, visite medicale...) |
| `/api/cron/predictive` | `0 6 * * *` (6h chaque jour) | Predictions IA de maintenance |
| `/api/cron/maintenance-status` | `0 8 * * *` (8h chaque jour) | Met a jour les statuts de maintenance |
| `/api/cron/maintenance-reminders` | `0 11 * * *` (11h chaque jour) | Envoie les rappels de maintenance planifiee |
| `/api/cron/maintenance-predictions` | `0 5 * * *` (5h chaque jour) | Calcule les predictions de maintenance preventive (regles) |
| `/api/cron/cleanup` | `0 2 * * *` (2h chaque jour) | Nettoyage des donnees expirees |
| `/api/cron/tire-alerts` | `0 6 * * *` (6h chaque jour) | Alertes usure pneumatiques |
| `/api/cron/monthly-report` | `0 8 1 * *` (8h le 1er du mois) | Generation et envoi des rapports mensuels |
| `/api/cron/driver-scoring` | `0 2 * * *` (2h chaque jour) | Scoring IA des conducteurs (GPT-4o-mini) |
| `/api/cron/vehicle-scoring` | `0 2 * * 0` (2h chaque dimanche) | Scoring IA des vehicules (GPT-4o-mini) |
| `/api/cron/weekly-fleet-report` | `0 8 * * 1` (8h chaque lundi) | Rapport hebdomadaire de flotte |

### Securite des cron jobs

Chaque cron job verifie le header `x-vercel-cron-secret` (ou `x-cron-secret`) contre la variable d'environnement `CRON_SECRET`. En production, les requetes sans ce header recoivent une reponse 403.

Les crons utilisent `createAdminClient()` pour bypasser le RLS (operations systeme cross-company).

---

## 9. Roles et permissions

### Hierarchie des roles

| Role | Niveau | Description |
|---|---|---|
| **SUPER_ADMIN** | 100 | Acces total plateforme (via `SUPERADMIN_EMAIL`) |
| **ADMIN** | 90 | Administrateur entreprise -- acces total aux donnees et configuration |
| **DIRECTEUR** | 80 | Direction -- acces complet aux donnees, configuration limitee |
| **AGENT_DE_PARC** | 50 | Gestion operationnelle du parc (vehicules, inspections, maintenance) |
| **EXPLOITANT** | 30 | Exploitation -- consultation et saisie (carburant, tournees) |
| **CHAUFFEUR** | - | Application chauffeur uniquement (`/driver-app`) |

### Matrice des permissions

| Fonctionnalite | ADMIN | DIRECTEUR | AGENT_DE_PARC | EXPLOITANT | CHAUFFEUR |
|---|---|---|---|---|---|
| Tableau de bord | Oui | Oui | Oui | Oui | Non |
| Vehicules (lecture) | Oui | Oui | Oui | Oui | Non |
| Vehicules (creation/modification) | Oui | Oui | Oui | Non | Non |
| Conducteurs (lecture) | Oui | Oui | Oui | Oui | Non |
| Conducteurs (creation/modification) | Oui | Oui | Oui | Non | Non |
| Maintenance (demande) | Oui | Oui | Oui | Oui | Non |
| Maintenance (validation) | Oui | Oui | Oui | Non | Non |
| Carburant (saisie) | Oui | Oui | Oui | Oui | Non |
| Inspections | Oui | Oui | Oui | Oui | Non |
| Conformite | Oui | Oui | Oui | Oui | Non |
| Gestion utilisateurs | Oui | Oui | Non | Non | Non |
| Parametres entreprise | Oui | Oui | Non | Non | Non |
| Facturation | Oui | Oui | Non | Non | Non |
| Cles API | Oui | Oui | Non | Non | Non |
| Application chauffeur | Non | Non | Non | Non | Oui |
| Scan QR Code | Oui | Oui | Oui | Oui | Oui |

### Groupes fonctionnels

Le code definit des groupes dans `src/constants/enums.ts` :

- **`MANAGER_ROLES`** : ADMIN, DIRECTEUR, AGENT_DE_PARC -- peuvent gerer le parc
- **`DIRECTOR_ROLES`** : ADMIN, DIRECTEUR -- acces complet configuration

### Verification des roles (serveur)

Les Server Actions utilisent les guards de `src/lib/auth-guards.ts` :

```typescript
// Verifie qu'on est authentifie
await requireAuth();

// Verifie un role specifique
await requireRole(['ADMIN', 'DIRECTEUR']);

// Verifie un niveau hierarchique minimum
await requireRoleAtLeast('AGENT_DE_PARC');

// Helpers
await requireAdmin();            // ADMIN ou SUPER_ADMIN
await requireManagerOrAbove();   // ADMIN, DIRECTEUR, SUPER_ADMIN
await requireAgentOrAbove();     // ADMIN, DIRECTEUR, AGENT_DE_PARC, SUPER_ADMIN

// Isolation tenant
requireSameCompany(resourceCompanyId, userCompanyId);
```

### Middleware (redirection chauffeurs)

Le middleware Next.js (`src/middleware.ts`) redirige automatiquement les **CHAUFFEUR** vers `/driver-app` s'ils tentent d'acceder au dashboard de gestion.

### Protection SuperAdmin

L'interface `/superadmin` est protegee par :
1. Authentification Supabase
2. Verification que l'email correspond a `SUPERADMIN_EMAIL`
3. Redirection vers `/404` si non autorise

---

## 10. Guide de deploiement Vercel

### Pre-requis

1. Compte [Vercel](https://vercel.com) (plan Pro recommande pour les cron jobs)
2. Projet [Supabase](https://supabase.com) cree et configure
3. Compte [Stripe](https://stripe.com) avec produits et prix configures
4. Compte [Resend](https://resend.com) avec domaine verifie
5. Compte [Sentry](https://sentry.io) avec projet Next.js
6. (Recommande) Compte [Upstash](https://upstash.com) pour Redis

### Etapes de deploiement

#### 1. Configuration Supabase

Executer les migrations SQL dans l'ordre :

```bash
# Depuis le repertoire du projet
npx supabase db push
```

Ou appliquer manuellement les fichiers dans `supabase/migrations/` via le SQL Editor de Supabase.

#### 2. Configuration des variables d'environnement

Dans Vercel > Settings > Environment Variables, configurer **toutes** les variables listees en section 3. Les variables prefixees `NEXT_PUBLIC_` doivent etre disponibles en production et preview.

> **CRITIQUE** : `CRON_SECRET` doit etre defini sinon tous les cron jobs echoueront en 401.

#### 3. Deploiement

```bash
# Option 1 : Via Vercel CLI
npx vercel --prod

# Option 2 : Push sur la branche main (deploiement automatique)
git push origin main
```

#### 4. Configuration Stripe Webhook

Apres le deploiement, configurer le webhook Stripe :
- **URL** : `https://fleetmaster.pro/api/stripe/webhook`
- **Evenements** : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

#### 5. Verification post-deploiement

1. Verifier le health check : `GET /api/health`
2. Verifier les cron jobs dans Vercel > Cron Jobs
3. Verifier les source maps dans Sentry
4. Tester l'inscription + checkout Stripe
5. Verifier l'envoi d'emails (Resend dashboard)

### Configuration Next.js notable

```javascript
// next.config.js
{
  compress: false,                    // Compression geree par Vercel
  eslint: { ignoreDuringBuilds: true }, // Lint desactive au build
  typescript: { ignoreBuildErrors: false }, // TS strict mode
  poweredByHeader: false,             // Masquer X-Powered-By
  trailingSlash: false,               // Pas de trailing slash
}
```

### Headers de securite (automatiques)

| Header | Valeur |
|---|---|
| `X-Frame-Options` | DENY |
| `X-Content-Type-Options` | nosniff |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Strict-Transport-Security` | max-age=63072000; includeSubDomains; preload |
| `Content-Security-Policy` | Voir `next.config.js` (self + Stripe + Supabase + Sentry + PostHog) |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=(self) |

### Rate limiting (middleware)

| Route | Limite | Fenetre |
|---|---|---|
| `/api/auth/login` | 5 tentatives | 15 minutes |
| `/api/auth/register` | 3 tentatives | 60 minutes |
| `/api/**` (general) | 100 requetes | 1 minute |
| `/api/admin/*` | 5 tentatives | 1 minute |
| `/api/stripe/webhook` | Pas de limite | (securise par signature) |
| `/api/cron/*` | Pas de limite | (securise par secret) |

### Redirections

- `www.fleetmaster.pro` -> `fleetmaster.pro` (redirect 301)
- Non authentifie -> `/login` (avec parametre `redirect`)
- Chauffeur sur dashboard -> `/driver-app`
- Trial expire -> `/settings/billing?trial_ended=true`
- Paiement en attente -> `/payment-pending`
- Abonnement annule -> `/pricing?status=reactivate_required`
- Onboarding incomplet -> `/onboarding`

### Plans et tarification

| Plan | Prix mensuel | Prix annuel | Vehicules | Utilisateurs |
|---|---|---|---|---|
| **ESSENTIAL** | 29 EUR/mois | 290 EUR/an | 5 | 10 |
| **PRO** | 49 EUR/mois | 490 EUR/an | 20 | 50 |
| **UNLIMITED** | 129 EUR/mois | 1 290 EUR/an | Illimite | Illimite |

Features par plan :

| Feature | ESSENTIAL | PRO | UNLIMITED |
|---|---|---|---|
| Conformite de base | Oui | Oui | Oui |
| Briefing IA | Non | Oui | Oui |
| Webhooks | Non | Oui | Oui |
| Rapports avances | Non | Oui | Oui |
| Support prioritaire | Non | Oui | Oui |
| API publique | Non | Non | Oui |
| Assistant IA reglementaire | Non | Non | Oui |
| Conformite avancee | Non | Non | Oui |
| Account manager dedie | Non | Non | Oui |

### Scripts disponibles

```bash
npm run dev          # Developpement local (http://localhost:3000)
npm run build        # Build production + fix manifests
npm run start        # Serveur production local
npm run lint         # Linting ESLint
npm run test         # Tests unitaires Jest
npm run test:watch   # Tests en mode watch
npm run test:coverage # Tests avec couverture
npm run test:e2e     # Tests end-to-end Playwright
npm run test:e2e:headed # Tests E2E avec navigateur visible
npm run test:e2e:ui  # Tests E2E avec UI Playwright
```

---

## Annexe : Architecture technique (resume)

```
Utilisateur
    |
    v
[Vercel Edge Network] -- CDN + SSL + Compression
    |
    v
[Next.js App Router] -- SSR + Server Components + API Routes
    |                      |
    |                      +-- [Middleware] Rate limiting + Auth + Roles
    |                      |
    |                      +-- [Server Actions] next-safe-action + Zod
    |
    +-- [Supabase]
    |     +-- PostgreSQL (donnees + RLS)
    |     +-- Auth (JWT + cookies)
    |     +-- Storage (documents, photos)
    |
    +-- [Stripe]
    |     +-- Checkout Sessions
    |     +-- Webhooks (subscription lifecycle)
    |
    +-- [Resend]
    |     +-- Emails transactionnels
    |
    +-- [Upstash Redis]
    |     +-- Rate limiting distribue
    |
    +-- [Sentry]
    |     +-- Error tracking + Performance
    |
    +-- [PostHog EU]
    |     +-- Analytics produit (RGPD)
    |
    +-- [Anthropic API]
    |     +-- Assistant IA reglementaire (Claude Haiku)
    |
    +-- [OpenAI API]
          +-- Scoring IA vehicules/conducteurs (GPT-4o-mini)
```
