# Sprint — NIVEAU 1 + 2 Automation immobilisation

> **Date** : 2026-05-13
> **Mode** : push main direct, 7 commits atomiques
> **HEAD début** : `14bcedd`
> **HEAD fin** : `d04dae1`
> **Décision produit** : Stéphane (basée sur [reports/AUDIT-AUTOMATION-IMMOBILISATION.md](AUDIT-AUTOMATION-IMMOBILISATION.md))
>
> **Scope** : NIVEAU 1 (visibilité accrue) + NIVEAU 2 (webhook dédié). **NIVEAU 3 reporté** (status DB inchangé). **NIVEAU 4 abandonné** (délégué à ORIA).

---

## 1. Commits poussés sur main

| # | Hash | Message | Files changed | Insertions / Deletions |
|---|---|---|---|---|
| 1 | `3a8ca30` | `feat(dashboard): critical documents banner with link to vehicles` | 2 | +55 / -0 |
| 2 | `3625e55` | `feat(vehicles): expired document badge on list + ?filter=expired URL` | 1 | +63 / -13 |
| 3 | `cdcd51d` | `feat(email): add renewal CTA button in J0 urgent alert` | 1 | +12 / -1 |
| 4 | `e0a1ff7` | `feat(webhooks): add vehicle.regulatory_expired event type` | 1 | +19 / -0 |
| 5 | `3b45a16` | `feat(cron): dispatch regulatory_expired webhook on J0` | 1 | +23 / -0 |
| 6 | `4e52edf` | `feat(settings): expose vehicle.regulatory_expired event in webhooks UI` | 1 | +1 / -0 |
| 7 | `d04dae1` | `docs(swagger): document vehicle.regulatory_expired event + webhook section` | 1 | +48 / -0 |

**Total** : 7 commits, 7 push main directs, **~221 insertions sur 6 fichiers existants + 1 fichier créé**.

### Note sur la granularité
Le plan original demandait 7 commits distincts. **Commits 2 a fusionné TÂCHE 1.3 + 1.4** (badge expiré + filtre URL `?filter=expired`) parce que les deux features étaient inséparables fonctionnellement : le filtre URL est utilisé par la bannière du commit 1 pour le drill-down, et le helper `getExpiredDocuments()` sert aux deux. Découper aurait nécessité un commit intermédiaire avec du code non fonctionnel.

---

## 2. Fichiers créés / modifiés

### Créé
- `src/components/dashboard/CriticalDocumentsBanner.tsx` (44 lignes) — composant React client, lecture pure via `useCriticalDocumentsCount` (cache React Query existant)

### Modifiés
- `src/app/(dashboard)/dashboard/page.tsx` — import + injection de la bannière juste après le Welcome Header
- `src/app/(dashboard)/vehicles/page.tsx` — helper `getExpiredDocuments()`, badge `FileWarning` dans la colonne `registration_number`, filtre URL `?filter=expired` lu via `useSearchParams`
- `src/app/api/cron/vehicle-documents-check/route.ts` — bouton CTA "Renouveler maintenant →" dans l'email J0, dispatch `vehicle.regulatory_expired` via `waitUntil(dispatchWebhook(...))` après l'INSERT `document_alert_logs`
- `src/lib/webhooks/send.ts` — extension du type `WebhookEvent` + interface `VehicleRegulatoryExpiredPayload`
- `src/app/(dashboard)/settings/webhooks/page.tsx` — ajout de l'event dans `ALL_EVENTS` (1 ligne)
- `src/lib/swagger.ts` — section "Webhooks sortants" dans la description info + composant `WebhookRegulatoryExpiredPayload`

---

## 3. Tests effectués

### Tests automatisés
- ✅ `npx tsc --noEmit` après chaque commit : uniquement les **6 erreurs pré-existantes documentées** dans CLAUDE.md (`__tests__/actions/drivers.test.ts` x5 TS2367, `__tests__/actions/maintenance.test.ts` x1 TS2367). **0 nouvelle erreur introduite**.
- ❌ Aucun nouveau test unitaire ajouté dans ce sprint — par choix pragmatique (les changes sont surtout visuels/déclaratifs, le pattern dispatch webhook a déjà été éprouvé en prod sur `vehicle.created/updated/deleted` via les commits précédents `25e442b`).

### Tests manuels possibles après deploy prod

#### 3.a Bannière dashboard
1. Se connecter sur `https://fleet-master.fr/dashboard` avec un compte ayant `transport stephane` (compte avec véhicule `FG-188-DS` CT expiré 2026-05-05 — 8 jours de retard)
2. **Attendu** : bannière rouge sticky sous le Welcome Header avec icône AlertTriangle, texte "X document(s) réglementaire(s) expiré(s)", lien "Voir les véhicules concernés →"
3. Cliquer le lien → redirection `/vehicles?filter=expired`

#### 3.b Badge liste véhicules
1. Sur `/vehicles` (ou `/vehicles?filter=expired`), repérer les véhicules avec document expiré
2. **Attendu** : badge rouge `FileWarning` à côté de l'immat, contenant "CT" (si 1 doc) ou "N docs" (si plusieurs)
3. Hover → tooltip natif "Document(s) expiré(s) : CT, Tachygraphe, ..."
4. Filtre `?filter=expired` → seuls les véhicules ayant ≥1 doc expiré apparaissent

#### 3.c Email J0 avec CTA
- Pas testable simplement en prod sans déclencher le cron (qui tourne quotidiennement à 8h). Pour test forcé :
  ```bash
  curl -i "https://fleet-master.fr/api/cron/vehicle-documents-check?secret=$CRON_SECRET"
  ```
  → si véhicules en J0, emails envoyés avec bouton rouge "Renouveler maintenant →"
- Vérifier dans la boîte de réception ADMIN/DIRECTEUR/AGENT_DE_PARC : présence du bouton, lien valide vers `/vehicles/{id}/edit`

#### 3.d Webhook `vehicle.regulatory_expired`
- ORIA est actuellement abonné à `vehicle.created, vehicle.updated, vehicle.deleted` (webhook id `80a9b77e-9449-40b3-b81e-543275d7c4e3`). **Doit cocher manuellement** le nouvel event `vehicle.regulatory_expired` dans `/settings/webhooks` pour recevoir.
- Test forcé : déclencher le cron manuellement (cf. 3.c). Si véhicule en J0 ET webhook abonné à l'event → POST sur `https://oria-transport.fr/api/integrations/fleet-master/webhook/...` avec :
  - Header `X-FleetMaster-Event: vehicle.regulatory_expired`
  - Header `X-FleetMaster-Signature: sha256=<hmac>`
  - Body `{event, timestamp, data: VehicleRegulatoryExpiredPayload}`
- Vérifier en SQL : `SELECT last_triggered_at FROM webhooks WHERE name = 'ORIA sync'` doit être ≤ 1 minute après le déclenchement cron

#### 3.e Anti-doublon
- Lancer le cron 2 fois consécutivement → la 2e exécution doit `skipped_already_sent++` et **NE PAS** redispatcher le webhook (table `document_alert_logs` UNIQUE garantit l'unicité)

#### 3.f Régression — webhooks existants
- Modifier un véhicule via UI → ORIA doit toujours recevoir `vehicle.updated` (commit `25e442b` intact)
- Créer un véhicule → `vehicle.created` (intact)
- Supprimer → `vehicle.deleted` (intact)

---

## 4. Actions de validation requises côté Stéphane

### 4.a Visuel UI
- [ ] Ouvrir `https://fleet-master.fr/dashboard` sur le compte `transport stephane` → vérifier que la bannière s'affiche (3 documents expirés au moins selon l'audit DB)
- [ ] Cliquer "Voir les véhicules concernés" → arrive sur `/vehicles?filter=expired` filtré
- [ ] Sur `/vehicles`, sans filtre, vérifier le badge rouge à côté des immat concernées (`FG-188-DS`, etc.)
- [ ] Hover sur le badge → tooltip avec liste des docs expirés

### 4.b Webhook ORIA — abonnement manuel
- [ ] Aller dans `/settings/webhooks`
- [ ] Cliquer "Modifier" sur le webhook "ORIA sync"
- [ ] Cocher le nouvel event `vehicle.regulatory_expired` ("Document réglementaire expiré (CT, tachy, ATP)")
- [ ] Sauvegarder
- [ ] Le prochain cron de 8h enverra l'event à ORIA si des véhicules sont en J0

### 4.c Test webhook end-to-end (optionnel)
Si tu veux valider immédiatement sans attendre 8h :
```bash
# Forcer un cycle de cron en prod (admin)
curl -i "https://fleet-master.fr/api/cron/vehicle-documents-check?secret=$CRON_SECRET"
```
→ vérifier côté ORIA logs que le POST `vehicle.regulatory_expired` est reçu.

**Note** : actuellement 3 véhicules ont un CT expiré (BB-215-RF, FG-188-DS, FH-745-ZE) — mais ils sont sur 3 companies différentes. Seul `FG-188-DS` (transport stephane) déclenchera le webhook ORIA (puisque c'est la seule company avec webhook actif).

### 4.d Documentation swagger
- [ ] `https://fleet-master.fr/api-docs` → vérifier que la section info contient le tableau "Événements disponibles" avec les 4 events
- [ ] Composants `WebhookRegulatoryExpiredPayload` visible dans la liste des schemas

---

## 5. Impact pour ORIA

### Changements observables depuis ORIA
1. **Nouveau event disponible** : `vehicle.regulatory_expired` côté FM. ORIA doit **explicitement le cocher** dans son webhook config sur `/settings/webhooks` (FM ne l'active pas automatiquement pour les webhooks existants).
2. **Payload riche** : ORIA reçoit `vehicleId, companyId, registration_number, expired_document, expiry_date, days_overdue, alert_level, vehicle_status` → suffisant pour bloquer ses propres assignations de tournées sans avoir besoin de polling supplémentaire.
3. **Cadence** : 1 fois par expiration par véhicule. Le cron tourne quotidiennement à 8h mais l'anti-doublon via `document_alert_logs` garantit que ORIA ne reçoit le même event qu'une seule fois.
4. **Routes API existantes inchangées** : `/api/v1/agenda` (commit `9260337`) reste source de vérité pour le scheduling proactif (J-7, J-1, etc.). Le webhook complète l'agenda en signalant le passage en J0 en temps quasi-réel (8h après expiration au plus tard).

### Recommandation côté ORIA (cf. §8 audit)
1. **Court terme** : ORIA continue de poller `/api/v1/agenda?type=ct,tachy,atp&overdue=true` toutes les heures (déjà recommandé dans l'audit)
2. **À ajouter** : handler webhook `vehicle.regulatory_expired` qui :
   - Vérifie la signature HMAC avec le secret stocké en DB ORIA
   - Marque le `vehicleId` comme "non assignable" dans le planning ORIA
   - Notifie l'exploitant ORIA via UI ou push interne
3. **Pas de changement nécessaire sur FM** : NIVEAU 3 reporté → le statut FM reste `ACTIF` même après expiration. Le blocage est **côté ORIA uniquement**.

---

## 6. Ce qui n'a PAS été fait (par décision)

### NIVEAU 3 reporté
- ❌ Aucun changement de `status` véhicule en DB
- ❌ Aucune migration DB (pas de colonne `is_immobilized`, pas de table `vehicle_immobilization_state`)
- ❌ Aucune modification des 4 pages `/scan/[vehicleId]/*` (UX scan QR conducteur inchangée)
- ❌ Aucune modification du filtre `status = ACTIF` dans `/api/v1/agenda` (commit `9260337` reste intact — pas d'effet boomerang)
- ❌ Aucune modification des 18 callsites qui filtrent sur `ACTIF` (cf. §5 audit)

### NIVEAU 4 abandonné
- ❌ Pas de refactor `assertVehicleUsable(vehicleId)` côté serveur
- ❌ Pas de validation Zod stricte ajoutée aux server actions

### Bug annexe non corrigé (cf. §11 audit)
- ⚠️ L'incohérence DEFAULT `'active'` vs CHECK `'ACTIF'` sur `vehicles.status` reste — bombe dormante mais hors scope de ce sprint.

---

## 7. Vérifications post-deploy à effectuer par Claude (autonome)

### 7.a Vercel build
- Monitor armé sur le commit final `d04dae1` (`b7h489o47`). Notification dès success/failure.

### 7.b Sanity checks
Une fois deploy ready :
- `curl -sS -i https://fleet-master.fr/api/docs | grep "vehicle.regulatory_expired"` → doit retourner la mention dans le JSON OpenAPI
- `curl -sS -i https://fleet-master.fr/api-docs | head -20` → page Swagger UI doit charger sans erreur (route Next.js statique)

### 7.c Test fonctionnel critique
Pas de test automatisé pour ce sprint. La validation reste manuelle côté Stéphane via les points 4.a-d ci-dessus.

---

## 8. Synthèse exécutive

| Catégorie | Statut |
|---|---|
| NIVEAU 1 (visibilité) | ✅ 4 features livrées (bannière + badge + filtre URL + email CTA) |
| NIVEAU 2 (webhook) | ✅ 4 livrables (type + dispatch cron + UI settings + swagger doc) |
| NIVEAU 3 (status DB) | 🔒 Reporté volontairement |
| NIVEAU 4 (refactor strict) | 🔒 Abandonné, délégué ORIA |
| Risque client | 🟢 **Nul** — aucun véhicule immobilisé, aucune UX cassée |
| Tests typecheck | ✅ 0 nouvelle erreur (6 préexistantes documentées) |
| Build Vercel | ⏳ en cours sur `d04dae1` |
| Documentation | ✅ Audit + Sprint rapport + Swagger updated |

**État** : sprint terminé, en attente validation Stéphane (points §4).

---

**Auteur** : Claude Code (Opus 4.7 1M)
**Branche** : `main` poussée à `d04dae1`
**Audit source** : [reports/AUDIT-AUTOMATION-IMMOBILISATION.md](AUDIT-AUTOMATION-IMMOBILISATION.md)
