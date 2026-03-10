# FleetMaster Pro — Feature Map

> Last updated: 2026-03-08

---

## Table of Contents

1. [Fleet Management (Vehicles)](#1-fleet-management-vehicles)
2. [Driver Management](#2-driver-management)
3. [Compliance & Regulatory (DREAL)](#3-compliance--regulatory-dreal)
4. [Maintenance](#4-maintenance)
5. [Fuel Management](#5-fuel-management)
6. [Inspections](#6-inspections)
7. [Incidents & Claims](#7-incidents--claims)
8. [SOS / Emergency](#8-sos--emergency)
9. [Tire Tracking](#9-tire-tracking)
10. [Fleet Analytics & Reporting](#10-fleet-analytics--reporting)
11. [QR Code Scanning (Public)](#11-qr-code-scanning-public)
12. [Notifications & Alerts](#12-notifications--alerts)
13. [Settings & Team Management](#13-settings--team-management)
14. [Billing & Subscription](#14-billing--subscription)
15. [Public REST API v1](#15-public-rest-api-v1)
16. [AI Regulatory Assistant](#16-ai-regulatory-assistant)
17. [Onboarding](#17-onboarding)
18. [Super Admin](#18-super-admin)
19. [Landing Page (Marketing)](#19-landing-page-marketing)
20. [Infrastructure & Platform](#20-infrastructure--platform)

---

## 1. Fleet Management (Vehicles)

| Feature | Description |
|---|---|
| Vehicle inventory | Filterable/searchable paginated list of all fleet vehicles with type icons. |
| Vehicle detail page | Full profile with KPI bar, regulatory dates, maintenance timeline, QR code, driver assignment, and activity logs. |
| Create / Edit vehicle | Guided form for registration, brand, model, type, purchase date, insurance info, and regulatory documents. |
| Vehicle types | Supports `VOITURE`, `FOURGON`, `POIDS_LOURD`, `POIDS_LOURD_FRIGO` with type-specific rules. |
| Reliability score | Computed A–F grade per vehicle based on maintenance (35%), inspection (30%), fuel (20%), and compliance (15%). |
| QR code generation | Unique QR code per vehicle (token-secured) for public scans (inspection / fuel / carnet). |
| Bulk import | Multi-step wizard to import vehicles from CSV / Excel file. |
| Vehicle activities | Assign DREAL transport activities (type of transport declared) to each vehicle. |
| Total Cost of Ownership | TCO dashboard per vehicle: fuel cost + maintenance cost over a configurable period, with cost per km. |
| Vehicle map | Map view of vehicle location (Mapbox). |
| Regulatory dates card | Summary card of all upcoming/expired regulatory deadlines for a vehicle. |
| Critical alert banner | Full-width banner displayed when a vehicle has critical unresolved issues. |
| Delete vehicle | Confirmation dialog before permanent deletion. |

---

## 2. Driver Management

| Feature | Description |
|---|---|
| Driver list | Tabular list with regulatory document status indicators (CQC, ADR, medical visit, VTC license). |
| Driver detail page | Profile with document section, regulatory expiration dates, vehicle assignments, and checklist status. |
| Create / Edit driver | Form with license expiry, ADR certification, medical exam dates, and vehicle assignment. |
| Regulatory document tracking | Tracks status (valid / warning / expired / missing) for CQC, ADR, medical visit, driving license. |
| Document upload | Upload driver documents (license, ADR card, medical certificate). |
| Driver app access | Enable / disable driver access to the companion mobile app (scans, checklist). |
| Daily checklist | Driver fills in a daily pre-trip checklist from the mobile interface. |
| Driver–vehicle assignment | Link a driver to one or more vehicles; history is tracked. |
| Bulk import | Import drivers from CSV / Excel. |

---

## 3. Compliance & Regulatory (DREAL)

| Feature | Description |
|---|---|
| Compliance dashboard | DREAL-style view showing global compliance status across all vehicles and drivers. |
| Document status matrix | Color-coded grid (valid / warning / expired / missing) for each document per driver/vehicle. |
| ADR exclusion logic | ADR is optional and excluded from the global compliance status calculation. |
| Transport activity declarations | Record company-level and vehicle-level DREAL transport activity types (Fourgon, Poids-Lourd, Frigo…). |
| Regulatory deadline calculation | Automatic computation of next renewal dates based on issue date and interval rules. |
| Compliance PDF export | Generate a DREAL-ready compliance report as a PDF. |
| Document expiry cron | Scheduled job that checks all driver and vehicle documents daily and creates alerts for upcoming expirations. |
| Compliance hook | `use-compliance` hook aggregates real-time compliance state for UI components. |

---

## 4. Maintenance

| Feature | Description |
|---|---|
| Maintenance request list | Paginated list with status badges (pending / ongoing / completed), priority, and cost tracking. |
| Maintenance request detail | Full view with status history, cost breakdown, linked vehicle, and completion info. |
| Create / Edit maintenance request | Form with type, priority, vehicle, assigned technician, and scheduled date. |
| Predictive maintenance engine | Rule-based predictor (`maintenance-predictor.ts`) evaluates km and time intervals per vehicle type to forecast next service date. |
| Maintenance rules settings | UI to view and manage built-in + custom maintenance rules, organized by vehicle type. |
| Predictive planning page | Fleet-wide maintenance planning view: all upcoming predictions sorted by urgency (ok / upcoming / due / overdue). |
| Maintenance urgencies widget | Dashboard widget showing the top urgent maintenance items across the fleet. |
| Predictive maintenance per vehicle | Widget on vehicle detail page listing upcoming predictions with usage percentage bars. |
| Maintenance timeline | Visual timeline of past and upcoming maintenance for a vehicle. |
| Initialize maintenance history | Modal to bootstrap maintenance history records from existing rules (bulk or single vehicle). |
| Complete maintenance dialog | Mark a request as completed, record actual cost and date. |
| Schedule appointment dialog | Create a calendar appointment for a maintenance event. |
| Cron: maintenance predictions | Daily cron job (5:00 AM) recalculates maintenance predictions for all active vehicles. |
| Cron: maintenance reminders | Cron that sends reminder emails/push notifications for upcoming maintenance. |
| Cron: maintenance status update | Cron that auto-updates maintenance status based on dates. |

---

## 4-bis. Moteur de Maintenance Préventive — Analyse Détaillée

### Vue d'ensemble

Le moteur de prédiction (`src/lib/maintenance-predictor.ts`) est un système **basé sur des règles** (rule-based), sans IA. Il croise les règles de maintenance définies en base avec l'historique des interventions de chaque véhicule pour calculer en temps réel l'état de chaque entretien à venir.

---

### Architecture en 3 couches

```
┌─────────────────────────────────────────────────────┐
│  COUCHE 1 — Règles (maintenance_rules)              │
│  Intervalles km/temps par type de véhicule          │
│  Système (immuables) + Personnalisées (par client)  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  COUCHE 2 — Moteur de calcul (predictMaintenanceForVehicle) │
│  Correspondance règle ↔ dernière intervention        │
│  Calcul échéance km + date + % d'usage              │
│  Attribution du statut (ok/upcoming/due/overdue)    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  COUCHE 3 — Cache (maintenance_predictions)         │
│  Résultats persistés par cron quotidien (05h00)     │
│  Lecture rapide depuis l'API sans recalcul          │
└─────────────────────────────────────────────────────┘
```

---

### Algorithme de calcul — Étapes détaillées

#### Étape 1 — Chargement du véhicule
- Lit `vehicles` : kilométrage courant, type, `detailed_type`, `purchase_date`, `created_at`, et les dates réglementaires (`technical_control_date`, `tachy_control_date`, `atp_date`).

#### Étape 2 — Sélection des règles applicables
- Filtre `maintenance_rules` sur `is_active = true`.
- Correspondance par `applicable_vehicle_types` : cherche `vehicle.type` **ET** `vehicle.detailed_type` (pour les sous-types, ex. `REMORQUE_TAUTLINER` en plus de `REMORQUE`).
- Une règle avec `applicable_vehicle_types = NULL` s'applique à **tous** les véhicules.

#### Étape 3 — Recherche de la dernière intervention
Pour chaque règle, le moteur cherche la maintenance la plus récente avec statut `TERMINEE` en matchant le champ `description` par **mots-clés** :

| Catégorie règle | Mots-clés recherchés dans `description` |
|---|---|
| `moteur` | vidange, huile moteur, refroidissement, liquide, courroie, distribution |
| `filtration` | filtre, adblue, scr, filter |
| `freinage` | frein, garniture, plaquette, disque, tambour, abs, ebs |
| `transmission` | boite, embrayage, pont, differentiel, transmission |
| `attelage` | cinquieme roue, pivot, kingpin, béquille, attelage |
| `refrigeration` | groupe froid, groupe frigorifique, froid, frigo, frigorigene, atp |
| `suspension` | suspension, soufflet, amortisseur, roulement, moyeu |
| `electricite` | faisceau, electrique, eclairage, feu, clignotant |
| `carrosserie` | chassis, longeron, caisse, porte, ridelle |
| `pneumatique` | pneu, pneumatique, gomme, roue |
| `reglementaire` | controle technique, tachygraphe, tachy, atp |
| `roulement` | moyeu, roulement, joint spi, graissage train |
| `geometrie` | alignement, parallélisme, geometrie |
| `bequilles` | béquille, vérin, pied, support |
| `securite` | ebs, abs, diagnostic, iso 7638 |
| `structure` | soudure, fissure, corrosion, longeron |
| `divers` | extincteur, sangle, arrimage, barre, rail |
| `conteneur` | twistlock, verrou tournant, coin conteneur |

#### Étape 4 — Sources de données de référence (par ordre de priorité)
Si aucune intervention réelle (`maintenance_records`) n'est trouvée, le moteur applique une cascade de fallbacks :

```
1. maintenance_records (TERMINEE + keywords)  ← Priorité absolue
   ↓ si absent
2. maintenance_predictions (is_initialized=true) ← Initialisation manuelle
   ↓ si absent ET règle CT/Tachy/ATP
3. vehicles.technical_control_date / tachy_control_date / atp_date ← Dates officielles
   ↓ si absent
4. vehicles.purchase_date ou created_at, lastKm=0 → véhicule neuf
   ↓ si absent
5. Aucune donnée → statut overdue (véhicule inconnu)
```

#### Étape 5 — Calcul des échéances

**Déclencheur km** (`trigger_type = 'km'`) :
```
estimatedDueKm = lastKm + interval_km
kmUntilDue     = estimatedDueKm - currentKm
usagePercent   = min(120%, round((currentKm - lastKm) / interval_km × 100))
```

**Déclencheur temps** (`trigger_type = 'time'`) :
```
estimatedDueDate = lastDate + interval_months
daysUntilDue     = (estimatedDueDate - today) en jours
usagePercent     = min(120%, round(elapsedDays / (interval_months × 30) × 100))
```

**Déclencheur mixte** (`trigger_type = 'both'`) : les deux sont calculés ; `usagePercent` est déterminé par km en priorité, temps en fallback.

#### Étape 6 — Attribution du statut

| Condition | Statut |
|---|---|
| `kmUntilDue ≤ 0` ou `daysUntilDue ≤ 0` | **overdue** |
| `kmUntilDue ≤ alert_km_before / 2` ou `daysUntilDue ≤ alert_days_before / 2` | **due** |
| `kmUntilDue ≤ alert_km_before` ou `daysUntilDue ≤ alert_days_before` | **upcoming** |
| Aucune condition déclenchée | **ok** |
| Véhicule neuf détecté + calcul donne overdue | Ramené à **upcoming** (protection anti-faux positif) |

#### Étape 7 — Tri final
Les prédictions sont triées : `overdue → due → upcoming → ok`, puis par priorité `critical → high → medium → low`.

---

### Règles système intégrées (60+ règles)

#### Poids Lourd (`POIDS_LOURD`) — 18 règles

| Règle | Déclencheur | Intervalle | Priorité |
|---|---|---|---|
| Vidange moteur | both | 80 000 km / 18 mois | high |
| Filtre à carburant | km | 60 000 km | high |
| Filtre à air | km | 60 000 km | medium |
| Filtre AdBlue / SCR | km | 60 000 km | high |
| Freins | km | 100 000 km | **critical** |
| Distribution / Chaîne | km | 200 000 km | **critical** |
| Embrayage | km | 300 000 km | high |
| Liquide de refroidissement | both | 200 000 km / 24 mois | medium |
| Huile boîte de vitesses | both | 200 000 km / 48 mois | medium |
| Huile pont / différentiel | both | 200 000 km / 48 mois | medium |
| Graissage 5ème roue / kingpin | km | 5 000 km | **critical** |
| Soufflets suspension | km | 100 000 km | medium |
| Faisceau électrique | km | 50 000 km | medium |
| Inspection châssis | both | 100 000 km / 12 mois | medium |
| Pneumatiques | km | 10 000 km | high |
| Graissage béquilles semi-remorque | both | 25 000 km / 3 mois | medium |
| Contrôle technique annuel | time | 12 mois | **critical** |
| Calibration tachygraphe | time | 24 mois | **critical** |

#### PL Frigorifique (`POIDS_LOURD_FRIGO`) — 13 règles supplémentaires

| Règle | Déclencheur | Intervalle | Priorité |
|---|---|---|---|
| Entretien annuel groupe froid | time | 12 mois | **critical** |
| Vidange huile moteur GF | time | 12 mois | high |
| Filtre carburant GF | time | 12 mois | medium |
| Courroies GF | time | **6 mois** | **critical** |
| Contrôle fluide frigorigène F-Gaz | time | 12 mois | **critical** |
| Joints portes compartiment | time | 3 mois | high |
| Nettoyage / désinfection caisse | time | 3 mois | high |
| Vérification enregistreur température | time | 12 mois | **critical** |
| Préparation renouvellement ATP | time | 36 mois | **critical** |
| + règles châssis PL standard | … | … | … |

#### Fourgon / Utilitaire (`FOURGON`) — 7 règles

| Règle | Déclencheur | Intervalle | Priorité |
|---|---|---|---|
| Vidange moteur | both | 20 000 km / 12 mois | high |
| Filtre à carburant | km | 30 000 km | medium |
| Filtre à air | km | 30 000 km | medium |
| Freins | km | 40 000 km | **critical** |
| Courroie accessoires | km | 120 000 km | medium |
| Distribution | km | 150 000 km | **critical** |
| Contrôle technique | time | 24 mois | **critical** |

#### Remorques spécifiques (55+ règles — migration 2026-03-08)

| Type remorque | Nb règles | Catégories spécifiques |
|---|---|---|
| `REMORQUE_TAUTLINER` | 11 | roulement, geometrie, bequilles, securite, structure, divers |
| `REMORQUE_FOURGON` | 10 | roulement, geometrie, bequilles, securite, structure, divers |
| `REMORQUE_PLATEAU` | 10 | roulement, geometrie, bequilles, securite, structure, divers |
| `REMORQUE_CHANTIER` / `REMORQUE_BENNE_TP` | 6 | freinage, roulement, suspension, bequilles, structure |
| `REMORQUE_PORTE_CONTENEUR` | 8 | roulement, bequilles, securite, structure, **conteneur** (twistlocks) |
| `REMORQUE_FRIGO_MONO` / `REMORQUE_FRIGO_MULTI` | 10 | freinage, suspension, bequilles, structure, refrigeration (groupe froid) |

---

### Modèle de données

```
maintenance_rules
├── id, company_id (NULL = règle système)
├── name, description, category
├── trigger_type: 'km' | 'time' | 'both'
├── interval_km, interval_months
├── applicable_vehicle_types: TEXT[]  ← indexé GIN
├── applicable_fuel_types: TEXT[]
├── alert_km_before (défaut 2000), alert_days_before (défaut 30)
├── priority: 'low' | 'medium' | 'high' | 'critical'
├── is_system_rule (immuable par les clients)
└── is_active

maintenance_predictions  ← cache cron
├── vehicle_id, rule_id, company_id
├── current_km, estimated_due_km, estimated_due_date
├── km_until_due, days_until_due
├── status: 'ok' | 'upcoming' | 'due' | 'overdue'
├── priority, is_initialized
├── alert_sent_at, alert_acknowledged_at
└── calculated_at
```

---

### Points d'entrée API

| Endpoint | Usage |
|---|---|
| `GET /api/vehicles/[id]/maintenance-predictions` | Prédictions temps réel pour 1 véhicule (sans cache) |
| `GET /api/maintenance-predictions/all` | Toutes les urgences de la flotte depuis le cache |
| `GET /api/maintenance-predictions/top` | Top 5 urgences pour le widget dashboard |
| `POST /api/cron/maintenance-predictions` | Recalcul cron quotidien 05h00 + persistance cache |
| `POST /api/maintenance-predictions/reset` | Reset du cache (admin/debug) |

### Recalcul immédiat après intervention
Après qu'une maintenance est marquée `TERMINEE`, `recalculatePredictionsForVehicle()` est appelé pour mettre à jour le cache immédiatement sans attendre le cron du lendemain.

---

## 5. Fuel Management

| Feature | Description |
|---|---|
| Fuel record list | Full history table of fuel fill-ups per vehicle with date, litres, cost, and mileage. |
| Fuel form | Record a fuel fill-up (vehicle, date, litres, total cost, odometer). |
| Fuel statistics | Cards showing total consumption, average cost per litre, total spend, and cost per km. |
| Consumption trend chart | Time-series chart of fuel consumption and cost evolution. |
| Fuel anomaly detection | Automatic detection of abnormal consumption patterns (e.g., consumption spike > 2σ). |
| Anomaly panel | Dedicated panel listing flagged anomalies with severity, for review or dismissal. |
| Multi-vehicle comparison | Side-by-side consumption comparison across the fleet. |
| Fuel export | Export fuel records to CSV or PDF. |
| Mobile card view | Responsive card layout for fuel records on mobile. |
| QR fuel entry | Scan vehicle QR code → public form to record fuel (supports driver self-service). |

---

## 6. Inspections

| Feature | Description |
|---|---|
| Inspection list | All completed inspections with global score and listed defects. |
| Inspection detail | Full inspection view with checklist results, defect descriptions, and attached photos. |
| QR-based inspection | Driver scans vehicle QR code → starts an inspection form without needing to log in. |
| Manual inspection creation | Create an inspection from the dashboard without QR code. |
| Photo upload | Attach photos to inspection items; stored in Supabase Storage. |
| Inspection scoring | Weighted score calculated from defects found during inspection. |
| Pending inspections widget | Dashboard card showing vehicles with overdue inspections. |

---

## 7. Incidents & Claims

| Feature | Description |
|---|---|
| Incident list | List of all reported incidents and insurance claims with status tracking. |
| Incident detail | Full view with description, photos, insurance info, and linked maintenance request. |
| Create / Edit incident | Report a new incident (type, date, vehicle, description, insurance reference). |
| Incident PDF report | Generate a PDF report for an incident (for insurance submission). |
| Linked maintenance | An incident can automatically trigger the creation of a maintenance request. |

---

## 8. SOS / Emergency

| Feature | Description |
|---|---|
| SOS assistant flow | Multi-step guided flow: select vehicle → breakdown type → location capture → AI provider matching. |
| Breakdown types | Tire, mechanical failure, refrigeration unit, tailgate, accident. |
| AI provider matching | Uses AI (Claude/OpenAI) to match the breakdown with the nearest/best emergency provider. |
| Emergency provider management | CRUD for garage partners, tow companies, and emergency service providers. |
| Emergency protocol management | Define custom response protocols (rules triggered by breakdown type, location, or vehicle type). |
| Insurance contract management | Manage linked insurance contracts for claims and emergency coverage. |
| Smart garage search | AI-powered search for external garages based on location and breakdown type. |
| Contact & tracking | Mark providers as contacted; track outreach history for each incident. |
| Add external garage to partners | Convert a one-time external garage into a saved partner. |
| Highway emergency switch | Toggle activation of highway emergency services (ASF, Sanef, etc.). |
| SOS settings | Configure default protocols, providers, and emergency rules from the settings panel. |
| No-provider fallback | Graceful UI when no provider is configured for a given scenario. |

---

## 9. Tire Tracking

| Feature | Description |
|---|---|
| Tire tracking tab | Dedicated tab on the vehicle detail page showing all mounted tires per position. |
| Tire schematic | Visual diagram of axle layout with tire positions (front, rear, trailer axles). |
| Axle configuration wizard | Configure the number of axles and tire positions for each vehicle type. |
| Mount tire | Record a new tire (brand, size, mount date, initial depth). |
| Unmount tire | Remove a tire from a position and optionally archive it. |
| Depth check | Record a periodic tread depth measurement; triggers alert when below legal minimum. |
| Tire pressure alerts | Cron job that evaluates tire depth records and creates alerts for worn tires. |

---

## 10. Fleet Analytics & Reporting

| Feature | Description |
|---|---|
| Main KPI dashboard | Real-time metrics: active vehicles, drivers, compliance rate, maintenance cost, open incidents. |
| Fleet status chart | Pie/donut chart showing distribution of vehicle statuses. |
| Cost trend chart | Monthly breakdown of total fleet costs (fuel + maintenance). |
| Top vehicles chart | Ranking of vehicles by cost, maintenance frequency, or reliability. |
| Fuel trend chart | Fleet-wide fuel consumption trends over time. |
| Maintenance fleet overview | Chart of maintenance volume and cost per vehicle. |
| Incident statistics widget | Aggregated incident count and cost by type/period. |
| Top drivers widget | Performance ranking of drivers based on inspections and compliance. |
| TCO dashboard | Total Cost of Ownership analysis per vehicle with per-km cost. |
| Monthly report | Auto-generated monthly summary email (cron) with KPIs and alerts. |
| CSV export | Export any data table (fuel, maintenance, vehicles, drivers) as CSV. |
| PDF export | Generate structured PDF reports (compliance, carnet, incidents, fuel). |
| Carnet PDF | Official vehicle carnet document (maintenance log book) in classic or elite layout. |
| Activity calendar | Calendar view of all scheduled maintenance appointments and events. |

---

## 11. QR Code Scanning (Public)

| Feature | Description |
|---|---|
| Public scan landing | Scanning a vehicle QR code shows a three-choice card: Inspection / Fuel / Digital Carnet. |
| Public inspection form | Anyone with the QR link can fill in a vehicle inspection without logging in. |
| Public fuel form | Driver self-service fuel entry via QR scan. |
| Digital carnet | Read-only view of the vehicle's official documents and maintenance log, accessible via QR. |
| Multi-fuel entry | Record several fuel fill-ups in one session (trip mode). |
| Token security | Each QR code contains a unique signed token; requests are validated server-side. |

---

## 12. Notifications & Alerts

| Feature | Description |
|---|---|
| In-app notification center | Bell icon with unread badge; full notification list with types (alert, warning, info). |
| Notification preferences | Per-user configuration of channels (email, push, SMS) and event types. |
| Web Push notifications | Browser push notifications via Web Push API (VAPID); GDPR-compliant (no user ID stored). |
| Email alerts | Transactional email notifications for maintenance reminders, document expiry, and monthly reports (Resend). |
| Active alerts dashboard | Dedicated page listing all active alerts: tire pressure, compliance issues, maintenance overdue, and anomalies. |
| Alert banner (dashboard) | Full-width banner for critical fleet issues requiring immediate action. |
| Role-based notifications | Notification rules differ by user role (manager, driver, admin). |
| Cron: driver documents | Daily check of driver document expirations → creates alerts and sends email. |
| Cron: vehicle documents | Daily check of vehicle regulatory document expirations. |
| Cron: tire alerts | Daily evaluation of tire depth records → alerts for worn tires. |

---

## 13. Settings & Team Management

| Feature | Description |
|---|---|
| Company profile | Edit company name, address, SIRET, contact info, and logo. |
| User profile | Edit personal name, email, and preferred language. |
| Appearance | Theme (dark/light), language, and display density preferences. |
| Security | Password change, two-factor authentication (2FA), active session management. |
| Team members | Invite users by email, assign roles (admin, manager, driver), view and revoke access. |
| User roles & permissions | Role-based access control (RBAC) enforced via Supabase RLS and server-side guards. |
| Maintenance rules | Configure system and custom maintenance rules per vehicle type (km / time intervals). |
| SOS providers & protocols | Full CRUD for emergency providers, protocols, and insurance contracts. |
| API keys & webhooks | Generate and manage API keys for the public REST API; configure webhook endpoints. |
| Activity log | Full company audit trail with filters (user, action type, date range). |
| Notification settings | Email and push notification configuration per user. |
| Integrations | Third-party integration management (Stripe, email provider). |
| Cookie consent | GDPR-compliant cookie banner with granular opt-in/out. |

---

## 14. Billing & Subscription

| Feature | Description |
|---|---|
| Subscription plans | Three tiers: **ESSENTIAL** (limited vehicles/drivers), **PRO** (extended limits), **UNLIMITED** (no limits). |
| Stripe checkout | Redirect to Stripe Checkout for plan upgrades with webhook confirmation. |
| Trial management | New accounts get a free trial; cron job checks and expires trials automatically. |
| Trial banner | Persistent banner showing days remaining in trial, with upgrade CTA. |
| Billing page | View current plan, usage metrics, next billing date, and payment method. |
| Subscription limit guard | Component that enforces plan limits (e.g., vehicle count) and prompts upgrade. |
| Stripe webhook | Server-side handler for `checkout.session.completed`, `customer.subscription.updated`, etc. |

---

## 15. Public REST API v1

| Feature | Description |
|---|---|
| Authentication | API key via `x-api-key` header or `Authorization: Bearer <key>`. |
| Rate limiting | Sliding-window rate limiting: ESSENTIAL 100 req/h, PRO 1 000 req/h, UNLIMITED 10 000 req/h. |
| Vehicles endpoint | `GET /api/v1/vehicles`, `POST /api/v1/vehicles`, `GET /api/v1/vehicles/:id`. |
| Drivers endpoint | `GET /api/v1/drivers`, `GET /api/v1/drivers/:id`. |
| Fuel records endpoint | `GET /api/v1/fuel-records`, `POST /api/v1/fuel-records`. |
| Maintenance endpoint | `GET /api/v1/maintenance`. |
| Compliance endpoint | `GET /api/v1/compliance`. |
| Alerts endpoint | `GET /api/v1/alerts`. |
| Pagination | All list endpoints support `page` + `per_page` query params; response includes `meta.total`. |
| OpenAPI spec | Machine-readable Swagger spec served at `GET /api/docs`. |
| Swagger UI | Interactive API documentation at `/api-docs`. |

---

## 16. AI Regulatory Assistant

| Feature | Description |
|---|---|
| Floating chat button | Fixed bottom-right assistant button available on all dashboard pages. |
| Regulatory Q&A | Ask natural-language questions about French transport regulations (DREAL, CQC, ADR, etc.). |
| Streaming responses | Server-Sent Events (SSE) streaming for real-time answer display. |
| Usage limits | Monthly query limits per plan: ESSENTIAL 20, PRO 100, UNLIMITED ∞. |
| Usage display | Shows used / remaining queries before and after each interaction. |
| GDPR-compliant logging | Conversation history stored without user ID in `ai_conversations` table. |
| AI model | Powered by `claude-haiku-4-5` (Anthropic SDK) for low-cost, fast responses. |

---

## 17. Onboarding

| Feature | Description |
|---|---|
| Multi-step onboarding flow | Guided setup: Company → first Vehicle → first Driver → transport activity types. |
| Progress indicator | Visual step progress bar with step labels. |
| Skip option | Any step can be skipped; incomplete onboarding can be resumed later. |
| Onboarding status API | Checks which steps are complete to resume or redirect appropriately. |
| Welcome email | Sent automatically on registration completion. |

---

## 18. Super Admin

| Feature | Description |
|---|---|
| Admin dashboard | Overview of total clients, MRR, active subscriptions, and recent signups. |
| Clients management | Table of all company accounts with plan, status, and last activity. |
| Subscriptions management | View and manage all Stripe subscriptions across companies. |
| Revenue analytics | Revenue trends and MRR chart for the platform. |
| Support tickets | View and manage support requests. |
| Activity feed | Platform-wide activity log. |
| Admin utilities | Create superadmin user, reset passwords, create test accounts. |

---

## 19. Landing Page (Marketing)

| Feature | Description |
|---|---|
| Hero section | Value proposition headline with primary CTA ("Start free trial"). |
| Features showcase | Grid of key features (AI, predictive maintenance, DREAL compliance). |
| How it works | 3-step process: connect fleet → get insights → take action. |
| Pricing teaser | Plan comparison preview with CTA to full pricing page. |
| FAQ | Accordion FAQ covering common objections and questions. |
| Testimonials | Customer reviews and social proof. |
| Target audience | Section describing ideal customer profiles. |
| Pain points | Problem/solution framing for the target market. |
| Comparison table | FleetMaster vs. competitor feature comparison. |
| AI assistant preview | Demo of the regulatory AI assistant. |
| Final CTA | Bottom-of-funnel conversion section. |
| Animated effects | Parallax, warp, breathing FX, animated stars background, section transitions. |
| Responsive navbar | Sticky navigation bar with mobile menu. |
| Footer | Links, legal, and social links. |

---

## 20. Infrastructure & Platform

| Feature | Description |
|---|---|
| Multi-tenant architecture | Full tenant isolation via Supabase RLS policies; each company sees only its own data. |
| Authentication | Supabase Auth (email/password + OAuth); middleware protects all dashboard routes. |
| Database | PostgreSQL via Supabase with Row-Level Security on all tables. |
| Server actions | `next-safe-action` wrapper with Zod validation for all server mutations. |
| React Query | Client-side data fetching, caching, and background refresh. |
| PDF generation | `pdf-lib` with `normalizeText()` for WinAnsi-safe output. |
| Service worker | PWA support: offline capability, push notification handling. |
| Cron jobs | Vercel-scheduled cron tasks (authenticated via `x-cron-secret` header). |
| Rate limiting | In-memory sliding window + optional Redis (Upstash) for API endpoints. |
| CSRF protection | CSRF token generation and validation for sensitive mutations. |
| Audit logging | All user actions are recorded in `activity_logs` with actor, action, and resource. |
| Error tracking | Sentry integration for server and client error reporting. |
| Analytics | PostHog for product analytics; disabled in development. |
| SEO | `sitemap.xml`, `robots.txt`, full Open Graph + Twitter Card metadata, canonical URLs. |
| Webhooks | Outbound webhook delivery to third-party URLs on key events. |
| Email service | Resend for transactional emails (reminders, reports, invitations, welcome). |
| Environment | Next.js 14 (App Router), TypeScript, Tailwind CSS, deployed on Vercel. |
