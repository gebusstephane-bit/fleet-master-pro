# AUDIT COMPLET — BUGS, ANOMALIES & ROADMAP PRODUIT

> Date : 4 juillet 2026
> Périmètre : totalité du code (sécurité, actions/hooks, crons/Stripe, UI/UX, base de données, produit)
> Méthode : 6 agents d'analyse spécialisés en parallèle, 100 % lecture seule
> **Aucune ligne de code n'a été modifiée.**

---

## SOMMAIRE

1. [Synthèse & compteurs](#1-synthèse)
2. [🔴 CRITIQUE — à corriger en urgence](#2-critique)
3. [🟠 MAJEUR](#3-majeur)
4. [🟡 MINEUR & micro-bugs](#4-mineur)
5. [Bugs dormants & dette de schéma](#5-dormants)
6. [Ce qui a été vérifié et jugé SAIN](#6-sain)
7. [Roadmap produit v2 / v3 / v4](#7-roadmap)
8. [Plan d'action recommandé](#8-plan)

---

## 1. SYNTHÈSE

L'application est **fonctionnellement riche et globalement bien construite** (API v1, webhook Stripe, SOS, driver-auth, propagation admin en cron, gestion push : tous vérifiés sains). Mais l'audit révèle **plusieurs failles de sécurité critiques**, un **bug de facturation qui laisse passer les impayés**, et un **sous-système de notifications entièrement cassé en silence**.

| Sévérité | Ncombre | Nature dominante |
|---|---|---|
| 🔴 CRITIQUE | 6 | Fuite cross-tenant, empoisonnement données, contrôle d'accès, RPC manquantes |
| 🟠 MAJEUR | 11 | Mots de passe en clair, casse d'enums, crons qui décrochent, RLS soft-delete |
| 🟡 MINEUR | ~25 | Liens morts, features fantômes, dates UTC, préférences ignorées |

**Top 5 à traiter en priorité absolue :**
1. `/api/dashboard-data` — fuite de données entre sociétés (aucune auth)
2. Client `past_due`/`unpaid` garde l'accès complet (bug Stripe)
3. Mots de passe stockés en clair (RGPD)
4. Empoisonnement irréversible du kilométrage via QR public
5. Préférences de notifications 100 % cassées et silencieuses

---

## 2. 🔴 CRITIQUE

### C1 — `/api/dashboard-data` : fuite de données entre sociétés (aucune authentification)
`src/app/api/dashboard-data/route.ts:102-136`
`GET()` n'a **aucun contrôle d'auth**, utilise le client service-role (bypass RLS), et détermine la société en prenant **le premier véhicule de toute la base** (`.limit(1).single()`). N'importe quel utilisateur connecté (ou potentiellement non connecté selon le middleware) reçoit les stats véhicules/chauffeurs/maintenance/IA d'une **autre** société. Route dupliquée/legacy (la vraie `api/dashboard/route.ts` est correcte). **→ Recommandation : suppression pure.**

### C2 — Empoisonnement irréversible du kilométrage via le flow QR public
`supabase/migrations/20260226010012_final_working_qr.sql:107-110,178-181` + `src/actions/public-scan.ts`
Le token QR (`qr_code_data`) est un UUID statique **qui n'expire ni ne tourne jamais**. Les RPC publiques `SECURITY DEFINER` font `mileage = GREATEST(mileage, p_mileage)`. Quiconque possède le QR (imprimé sur le véhicule, photographié) peut poster un relevé `mileage: 9999999` → le compteur est **définitivement corrompu, impossible à baisser par aucun chemin public** → casse toutes les prédictions de maintenance. Pas de rate-limit par véhicule, pas de révocation de token. En prime, `SQLERRM` renvoie le texte d'erreur Postgres brut à l'appelant anonyme.

### C3 — `/api/debug/maintenance-check` : client admin, aucune protection
`src/app/api/debug/maintenance-check/route.ts:13-49`
Utilise `createAdminClient()` (bypass RLS), **sans `withDebugProtection`, sans check `NODE_ENV`, sans auth**, avec une plaque de test en dur (`HY-122-DS`). Tout utilisateur connecté de n'importe quelle société peut lire ces données. Contrairement à ses voisines (`test-db`, `test-auth`…) qui sont toutes protégées. **→ Suppression.**

### C4 — Client impayé garde l'accès complet (bug de facturation)
`src/lib/stripe/handlers/subscription.ts` — `handleSubscriptionUpdated`
Le handler ne mappe **jamais** le statut Stripe vers `subscriptions.status`, puis force `companies.subscription_status = 'active'` en dur. Quand un abonnement passe `past_due`/`unpaid`/`paused` chez Stripe, le middleware (qui lit `companies.subscription_status`) ne voit jamais l'impayé → **le client délinquant conserve tout l'accès au dashboard**. Perte de revenus + contournement du contrôle d'accès. Les deux tables restent en désaccord jusqu'au prochain event `invoice.*`.

### C5 — Préférences de notifications entièrement cassées et silencieuses
`src/app/actions/notifications/index.ts:29` + `src/hooks/use-notifications.ts`
Le schéma Zod est factice : `const updatePreferencesSchema: any = {} as any`. Chaque appel échoue à la validation. Et le hook `use-notifications` ne vérifie **jamais** `serverError`/`validationErrors` (12 `@ts-ignore`) → l'échec est avalé, `onSuccess` déclenche un toast de succès, **rien n'est persisté**. L'utilisateur ne peut jamais sauvegarder ses préférences. `useNotifications` peut aussi renvoyer `undefined` à React Query → crash `getNextPageParam`. Ce fichier est aussi le seul hook **sans `'use client'`**.

### C6 — RPC appelées mais jamais définies dans les migrations → échec garanti
`src/lib/supabase/queries/dashboard.ts:157`, `src/actions/public-scan.ts:328`
- **`get_dashboard_stats`** : appelée, **définie nulle part** → chaque appel échoue (PGRST202).
- **`create_fuel_session`** : cœur du flow multi-carburant QR, définie uniquement dans des scripts `sql/*.sql` **non versionnés en migration**. Si la prod n'applique que `migrations/`, tout le flow multi-carburant QR échoue (pas de fallback pour cette fonction précise).

---

## 3. 🟠 MAJEUR

### M1 — Mots de passe stockés en CLAIR (RGPD Art. 32)
`src/app/api/stripe/create-checkout-session/route.ts:35-40,135-148`
`hashPassword()` retourne le mot de passe **inchangé** ; il est stocké tel quel dans la colonne trompeusement nommée `password_hash` de `pending_registrations`. `checkout-success` le relit pour créer l'utilisateur. Les checkouts abandonnés laissent des mots de passe en clair indéfiniment (rows marquées `used=true`, jamais supprimées). L'en-tête du fichier prétend même « Le mot de passe est hashé » — c'est faux.

### M2 — Clés API stockées et comparées en clair
`src/lib/api-auth.ts:93-99`
La clé v1 est cherchée par égalité brute sur une colonne `key` en clair (pas de hash/HMAC au repos). Une fuite en lecture de la table `api_keys` (backup, accès support trop large) livre des clés directement réutilisables. Pratique standard : stocker un hash.

### M3 — Un seul secret pour 3 usages = takeover total possible
`create-superadmin`, `reset-user-password`, `middleware.ts:384-430`
`SUPERADMIN_SETUP_SECRET` sert à la fois de (a) mot de passe de login superadmin, (b) gate `X-Setup-Secret`, (c) gate `x-admin-secret` de `reset-user-password` qui peut **réinitialiser n'importe quel mot de passe par email**. Une seule fuite = compromission totale de la plateforme. (Note : `create-superadmin` est correctement idempotent.)

### M4 — `customer.subscription.updated` : casse d'enum `subscription_plan` incohérente
`register-with-trial`, `handlers/*`, `check-trials` écrivent tantôt `pro` tantôt `PRO`. La valeur finale dépend de l'ordre d'écriture vs le trigger `UPPER()`. Preuve que l'auteur le sait : `weekly-fleet-report/route.ts:787` fait un `.or('...eq.PRO,...eq.pro,...')` défensif. Tout `=== 'pro'` ou `=== 'PRO'` case-sensitif ne matche que la moitié des lignes → **feature-gating faussé**.

### M5 — Les crons de scoring IA décrochent silencieusement au-delà de 1000
`cron/driver-scoring` (cap 1000) et `cron/vehicle-scoring` (cap 1000)
Tri par `company_id` sans curseur ni offset persistant. Passé 1000 véhicules/chauffeurs sur la plateforme, tout ce qui dépasse **n'est jamais traité** — et ce sont toujours les mêmes sociétés (fin d'alphabet) qui sont affamées. Grandit silencieusement avec la base client.

### M6 — `check-trials` peut rétrograder un client payant
`cron/check-trials/route.ts:139-208`
La requête de rétrogradation à l'expiration n'a **pas** le filtre `.is('stripe_customer_id', null)` que sa propre étape de rappel possède. Tout `TRIALING` ayant acquis un `stripe_customer_id` (checkout initié) est réinitialisé au plan gratuit ESSENTIAL par le cron de 6h, en conflit avec la conversion trial→active de Stripe.

### M7 — Soft-delete des véhicules défait au niveau RLS
`20260303201624_soft_delete_vehicles.sql`
Les nouvelles policies filtrent `deleted_at IS NULL`, mais les anciennes policies permissives sans filtre (`vehicles_company_isolation`, `"Users can view vehicles in their company"`) **ne sont jamais supprimées**. Les policies SELECT permissives étant combinées en OR, un véhicule soft-deleted **reste visible**. `getDashboardStats` ne filtre pas → totaux, somme kilométrage et compteur "actifs" **incluent les véhicules supprimés**.

### M8 — Doublons d'emails/notifications sur échec partiel
`cron/driver-documents` (~2146-2222), `cron/vehicle-documents-check:2653-2711`
La ligne de déduplication (`*_alert_logs`) n'est insérée **qu'après** tous les envois. Si un envoi échoue après ses 3 retries (une adresse manager qui bounce), le `catch` saute l'insertion du log → le lendemain, réenvoi au chauffeur **et** à tous les managers déjà notifiés. Aggravé par l'absence de `maxDuration`/batching (M9).

### M9 — `driver-documents` & `vehicle-documents-check` sans `maxDuration` ni batching
Envois séquentiels `await`és dans des boucles imbriquées, sans limite de temps. À mesure que les données croissent, dépassement du temps d'exécution → invocation tuée en cours de route → doublons (avec M8) + documents non alertés ce jour-là.

### M10 — Compteur de budget IA non atomique + 2 crons simultanés
`src/lib/ai/budget-guard.ts` — `trackAICall`
Read-modify-write sans lock ni incrément SQL. `driver-scoring` (`0 2 * * *`) et `vehicle-scoring` (`0 2 * * 0`) tournent **en même temps chaque dimanche 2h UTC** → incréments perdus (les deux lisent N, écrivent N+1). Le quota `canCallAI` et le garde-fou budget global peuvent être dépassés.

### M11 — Statuts subscription en casse UPPERCASE vs lowercase : compteurs superadmin toujours à 0
`src/app/superadmin/page.tsx:55,62`
`subscriptions.status` est un enum UPPERCASE (`ACTIVE`, `TRIALING`…). La page superadmin filtre en **lowercase** (`.eq('status','active')`, `.eq('status','trialing')`) → ne matche jamais → « Abonnements actifs » et « en essai » **affichent 0 en permanence**. `server.ts:119` copie aussi l'UPPERCASE dans un champ que le reste traite en lowercase → badges faux/vides.

---

## 4. 🟡 MINEUR & MICRO-BUGS

### Fonctionnalités fantômes / mortes
- **Thème clair 100 % mort** : le bouton Sun (`header.tsx:236`) fait `classList.toggle('light')` mais **aucun CSS `.light` n'existe**. Rien ne se passe, jamais.
- **Vraie cloche de notifications jamais branchée** : `NotificationBell` (composant complet câblé au vrai compteur) n'est importé nulle part ; le header affiche un **badge factice** ambre toujours allumé (`header.tsx:228`) et pointe vers `/alerts` au lieu de `/notifications` (page devenue inaccessible depuis le header).
- **Cmd+K → 404** : `command-palette.tsx:69` pointe vers `/routes` (n'existe pas), `:93` vers `/documents` (n'existe pas).
- **Bouton "supprimer" carburant = stub** : `fuel/page.tsx:110` → `toast.info('Fonctionnalité à implémenter')`.
- **CTA morts** : `RegulatoryTimeline.tsx:183` (`href="#"`), footer landing (`Footer.tsx:66,73`), `active-routes.tsx:72` (`/routes`).

### Bugs fonctionnels visibles
- **Fiche chauffeur ne montre jamais le véhicule assigné** : `drivers.ts:275` filtre sur `driver_id` (colonne inexistante) au lieu de `assigned_driver_id` → toujours null.
- **Badge notifications driver-app cassé** : `DriverAppLayoutClient.tsx:197` compte via `.eq('read', false)` alors que le reste utilise `read_at` → badge jamais fonctionnel.
- **Emails de workflow maintenance hors try/catch** : `validateMaintenanceRequest`, `scheduleMaintenanceRDV`, `completeMaintenance` — le statut passe en DB puis l'email peut throw → l'action renvoie une erreur, l'UI et la DB divergent ("déjà traitée" au retry).
- **Progress bars des tournées = `Math.random()`** (`active-routes.tsx:59`).

### Erreurs de données / calculs
- **Division par zéro carburant** : `fuel.ts:40`, `quantity_liters` accepte 0 → `price_per_liter = Infinity` → insert rejeté/valeur corrompue (le flow public, lui, garde `> 0`).
- **`DELETE` sans WHERE sur alertes** : `alerts.ts:184` régénère en supprimant tout (protégé uniquement par RLS) + colonnes mixtes `status:'unread'` vs `is_read:true`.
- **Dates UTC latentes** : plusieurs crons dérivent "aujourd'hui/demain" de `toISOString()` (UTC). OK aux horaires actuels (6h-11h UTC), mais off-by-one pour les utilisateurs FR si un horaire passe avant 2h ou après 22h UTC.
- **`.single()` risqués** (0 row possible, erreur ignorée) : `fuel.ts:52`, `drivers.ts:87/197`, `alerts.ts:231/257`, `check-trials:72` (peut throw).

### Invalidations de cache incomplètes
- `useUpdateMaintenance` invalide moins de clés que `useCreateMaintenance` → widgets stats/alertes stale après modification.

### Préférences ignorées / doublons
- Notifications in-app créées en cron **sans consulter les préférences** utilisateur (`tire-alerts:153`, `driver-documents:2187`).
- `tire-alerts` insère tout le batch d'un coup sans isolation → une ligne mauvaise = 0 notification ce jour.

### Reliquats de prod
- `/api/debug/maintenance-check` (voir C3), `sentry-example-page` + `sentry-example-api`, page diagnostic accessible à tout connecté.
- Requêtes DEBUG non bornées dans `monthly-report` (~365) : `select('*')` d'inspections juste pour logguer un échantillon (PII dans les logs).
- **`/og-image.jpg` 404** (seul `.png` existe) et **favicon `/icons/icon-32x32.png` 404** (plus petit = 72×72).
- Locale FR manquante ponctuellement : `vehicle-table.tsx:100` (`toLocaleString()` sans `'fr-FR'`).

### Accessibilité
- Boutons à icône seule sans `aria-label` (cloche, thème, menu mobile dans le header).

---

## 5. BUGS DORMANTS & DETTE DE SCHÉMA

- **`routes` et `alerts` : tables jamais créées en migration** mais utilisées partout (elles n'existent en prod que parce qu'elles ont été créées hors-migration). `20250219000100_fix_critical_rls.sql:89,107` crée des policies dessus **sans `IF EXISTS`** → **une reconstruction propre depuis les migrations plante**. La base n'est pas reconstructible en l'état.
- **`create_fuel_session` / `get_dashboard_stats`** non versionnées (voir C6) — risque de désync total entre l'état prod et le repo.
- **`needs_recalculation`** : flag posé par trigger, jamais lu (mort), et le trigger bumpe `calculated_at = NOW()` sans recalcul réel → la date de fraîcheur ment.
- **`vehicles.status` DEFAULT `'active'` (lowercase) sans CHECK** vs standard app `ACTIF`. Données legacy/import en lowercase → invisibles au compteur "actifs".
- **Aucune contrainte UNIQUE** sur `registration_number` (doublons de plaques possibles) ni sur `qr_code_data` (deux véhicules peuvent partager un token QR).
- **Aucun `CHECK (mileage >= 0)`** sur `vehicles.mileage` / `fuel_records.mileage_at_fill` → kilométrage négatif possible.
- **FK sans `ON DELETE`** : `incidents.vehicle_id`, `tires.vehicle_id`, `sos_history.vehicle_id` → un hard-delete de véhicule échoue (FK violation). À l'inverse, les nombreux `ON DELETE CASCADE` (fuel, inspections) → un vrai delete efface l'historique.
- **`ai_predictions`** : sous-système abandonné (trigger droppé) mais table + FK subsistent.

---

## 6. CE QUI A ÉTÉ VÉRIFIÉ ET JUGÉ SAIN

Pour équilibrer : ces zones **fonctionnent correctement** (vérifiées explicitement).

- **API publique v1** : chaque route appelle `withApiAuth` et scope par `company_id` (vehicles, drivers, fuel, maintenance, alerts, compliance, agenda, POST avec limites). Le placement dans `publicApiRoutes` est intentionnel et compensé.
- **Webhook Stripe** : signature vérifiée avant traitement, idempotence via `webhook_events`, tous les events requis gérés.
- **Routes SOS** : auth + ownership `company_id`/`user_id` vérifiés avant toute écriture admin (checks IDOR explicites).
- **`driver-auth.ts`** : gate `verifyAdminOrDirector` + `company_id`, rollback sur échec.
- **Propagation admin client en cron** : correcte (predictions passe `admin` en cascade). Aucun write silencieux RLS trouvé dans les 12 crons.
- **web-push** : gestion 410/404 correcte (nettoyage des abonnements périmés).
- **Secrets** : aucune clé service-role dans le bundle client ; seuls les `NEXT_PUBLIC_*` (anon, VAPID public, Mapbox) sont exposés — tous sûrs.
- **Enums vérifiés sans bug** : incident `'clôturé'` (accent) cohérent partout ; driver status lowercase cohérent ; workflow maintenance mappé correctement sur 2 tables ; RLS activé sur toutes les tables créées en migration.
- **Emails/Resend** : tous `await`és dans try/catch (sauf les 3 emails de workflow maintenance, voir §4).
- **`hashPassword`** est le seul faux-ami : partout ailleurs les garde-fous `company_id`, les `.maybeSingle()`, et la structure des actions sont corrects.

---

## 7. ROADMAP PRODUIT v2 / v3 / v4

L'app couvre déjà un socle solide : véhicules, chauffeurs, maintenance (workflow + règles + prédictif + scoring IA), inspections, carburant (+ détection d'anomalie), pneus, sinistres, conformité documentaire, agenda, TCO/coûts, alertes/notifications push, module SOS (très développé), driver-app PWA, QR scan, API v1 + webhooks, IA (briefing + assistant réglementaire), superadmin.

### Positionnement stratégique (déjà cadré dans `docs/STRATEGIC_FEATURES_AUDIT.md`)
**Ne pas concurrencer Samsara/Geotab sur la télématique.** Posséder le créneau **« conformité réglementaire FR + maintenance prédictive + carburant » pour PME, sans matériel**.

### D'abord : assainir l'existant vendu-mais-absent
Avant d'ajouter, corriger le **mis-selling** :
- « Optimisation tournées » (plan PRO) → module déplacé dans `deprecated/`, `/routes` = 404. **Soit rebâtir, soit retirer de l'argumentaire.**
- « Notifications SMS » (plan PRO) → **aucun Twilio n'existe**. Retirer ou construire.
- Page **Intégrations** = mockup (`useState`, Google Maps "connecté" en dur). L'afficher "bientôt" honnêtement.
- **Facturation annuelle** désactivée (`subscription.ts:181` throw) alors que les prix existent → à activer (upsell direct).

### V2 — Consolidation conformité & carburant (le cœur du positionnement)
| Fonction | Base existante | Valeur |
|---|---|---|
| **Renouvellement auto des documents réglementaires** | ~80 % prêt en DB (compliance) | Rétention, réduit le churn |
| **Détection de fraude carburant** | `consumption_l_per_100km` + anomaly detector existants ; ajouter `tank_capacity_liters` | Upsell "Anti-fraude", ROI démontrable |
| **Carnet d'entretien numérique finalisé** | QR + PDF déjà là | Différenciateur, argument commercial |
| **Immobilisation sur expiration doc (N1→N3)** | Déjà cadré dans `reports/AUDIT-AUTOMATION-IMMOBILISATION.md` — bannière/email (N1) + webhook `vehicle.regulatory_expired` (N2), puis colonne dédiée `is_immobilized` (N3, **pas** `status`) | Sécurité juridique du transporteur |

### V3 — Différenciateurs franco-français & communication
| Fonction | Détail |
|---|---|
| **Gestion contraventions + dénonciation auto (PDF)** | Fort différenciateur FR, formulaire ANTAI |
| **WhatsApp Business API** | Canal privilégié des chauffeurs FR (Twilio/Meta) |
| **Suivi consommables** | Huile moteur (absent), AdBlue, pneus (partiel) |
| **Tableau de bord DAF enrichi** | Budget vs réel, prévision N+1 (le TCO existe déjà) |
| **Bons de commande maintenance auto** + workflow d'approbation par seuil budgétaire |

### V4 — Intégrations & montée en gamme (upsell premium)
| Fonction | Effort | Note |
|---|---|---|
| **Tachygraphe / import `.DDD`** | Élevé (POC d'abord) | Grosse valeur, temps de conduite/repos — absent aujourd'hui |
| **Pilote télématique** (Movolytics/Targa) | Moyen | Le code Mapbox/routes est en `deprecated/`, à réactiver proprement |
| **Reporting CO₂ / bilan carbone** | Moyen | Absent, obligation réglementaire croissante |
| **Multi-dépôt / multi-site** | Élevé | Hiérarchie org au-dessus de `company_id` — refonte du scoping |
| **Export RH (CSV Silae/PayFit)** | Faible | Ne PAS construire la paie, juste exporter |

### Pistes d'upsell (ARPU +30-50 % estimé sur UNLIMITED, cf. doc stratégie)
- Module **"Conformité Pro"** (renouvellement docs + contraventions) : +10 €/véh/mois
- Module **"Intégrations Premium"** (tachy `.DDD` + télématique) : +15-25 €/véh/mois
- **"Anti-fraude carburant"** comme moteur de passage ESSENTIAL→PRO

### Écartés par la stratégie (à ne PAS construire)
Telegram, Slack/Discord (pour PME), réservation garage auto, APIs bancaires/DSP2, HistoVec/SIV, conseil d'achat véhicule, optimisation de tournée maintenance, module paie complet, APIs trafic/météo.

---

## 8. PLAN D'ACTION RECOMMANDÉ

### 🔴 Sprint sécurité (cette semaine — chaque item est petit et isolé)
1. **Supprimer** `/api/dashboard-data` et `/api/debug/maintenance-check` (C1, C3)
2. **Corriger** `handleSubscriptionUpdated` : mapper le statut Stripe, ne plus forcer `'active'` (C4)
3. **Hasher** les mots de passe de `pending_registrations` + purger les rows abandonnées (M1)
4. **Fixer** le schéma Zod `updatePreferences` + faire vérifier `serverError`/`validationErrors` au hook notifications (C5)
5. **Sécuriser** le QR : rate-limit par véhicule + garde-fou anti-saut kilométrique (comme la saisie dashboard) ou plafond de delta (C2)
6. **Séparer** les 3 usages de `SUPERADMIN_SETUP_SECRET` (M3)

### 🟠 Sprint fiabilité (2 semaines)
7. Versionner `get_dashboard_stats` + `create_fuel_session` en migrations (C6)
8. Créer les migrations `routes`/`alerts` + guarder les policies (dette schéma bloquante)
9. Curseur/offset persistant sur les crons de scoring (M5), désynchroniser les 2 crons du dimanche 2h (M10)
10. Filtre `stripe_customer_id` sur la rétrogradation `check-trials` (M6)
11. Nettoyer les policies RLS soft-delete véhicules (M7) + filtrer `deleted_at` dans `getDashboardStats`
12. Uniformiser la casse `subscription_plan`/`status` + CHECK constraints (M4, M11)
13. Dedup log AVANT envoi dans les crons documents + `maxDuration` (M8, M9)

### 🟡 Sprint polish (en continu)
14. Brancher la vraie cloche de notifications, supprimer le badge factice
15. Retirer/rediriger les liens morts (Cmd+K, thème, CTA), implémenter ou masquer la suppression carburant
16. Corriger `assigned_driver_id` (fiche chauffeur), colonne `read_at` (driver-app)
17. Ajouter les contraintes UNIQUE (plaque, QR) et CHECK (mileage ≥ 0)
18. Aligner le discours commercial : construire ou retirer "tournées" et "SMS"

---

*Rapport généré par 6 agents d'analyse spécialisés en lecture seule. Aucune modification de code. Les numéros de ligne reflètent l'état au 4 juillet 2026 — à revérifier avant correction.*
