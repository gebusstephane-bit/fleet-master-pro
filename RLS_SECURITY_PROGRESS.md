# Progression Sécurisation RLS - FleetMaster Pro

**Date** : 2026-02-24  
**Mission** : Élimination du bypass RLS (`createAdminClient`)  
**Status** : 🟡 EN COURS (Phase 2/3)

---

## ✅ COMPLÉTÉ

### 1. Infrastructure sécurisée
- [x] `src/lib/supabase/server-secure.ts` - Utilitaires RLS créés
- [x] `src/lib/supabase/server.ts` - `getUserWithCompany()` corrigé (plus de adminClient)
- [x] CVE Next.js corrigées (14.2.3 → 14.2.35)

### 2. Fichiers refactorisés (RLS uniquement)
| Fichier | Statut | Lignes modifiées |
|---------|--------|------------------|
| `src/actions/vehicles.ts` | ✅ Complété | ~200 lignes |
| `src/lib/supabase/server.ts` | ✅ Complété | ~20 lignes |

### 3. Build & Validation
- [x] Build production réussi
- [x] TypeScript strict passé
- [x] Aucune régression détectée

---

## 🔄 RESTE À FAIRE (P1 - Cette semaine)

### Server Actions critiques (15 fichiers)

#### Haute priorité (CRUD utilisateur)
- [ ] `src/actions/drivers.ts` (5 usages adminClient)
- [ ] `src/actions/maintenance.ts` (9 usages)
- [ ] `src/actions/maintenance-workflow.ts` (12 usages)
- [ ] `src/actions/routes.ts` (7 usages)

#### Moyenne priorité
- [ ] `src/actions/fuel.ts` (4 usages)
- [ ] `src/actions/alerts.ts` (6 usages)
- [ ] `src/actions/company.ts` (7 usages - sauf upload logo)
- [ ] `src/actions/appearance.ts` (6 usages)
- [ ] `src/actions/subscription.ts` (5 usages)

#### Dashboard (complexe)
- [ ] `src/actions/dashboard.ts` (1 usage)
- [ ] `src/actions/dashboard-simple.ts` (2 usages)
- [ ] `src/actions/dashboard-production.ts` (7 usages)

#### Spéciaux
- [ ] `src/actions/inspections-safe.ts` (2 usages)
- [ ] `src/actions/users.ts` (usage auth.admin légitime pour création user)

### API Routes à auditer (25 fichiers)
- [ ] Identifier lesquels peuvent passer en RLS
- [ ] Conserver : cron, webhooks, admin, superadmin

---

## 📊 MÉTRIQUES

```
AdminClient usages restants : ~150
Fichiers à refactoriser     : 15 (actions) + 10 (API routes)
Fichiers complétés          : 2
Progression                 : ~5%
Temps estimé restant        : 2-3 jours (1 dev senior)
```

---

## 🎯 PATTERN DE CORRECTION

### Avant (DANGEREUX)
```typescript
const adminClient = createAdminClient();
const { data } = await adminClient
  .from('vehicles')
  .select('*')
  .eq('company_id', companyId); // Filtre manuel
```

### Après (SÉCURISÉ)
```typescript
const supabase = await createClient();
const { data } = await supabase
  .from('vehicles')
  .select('*'); // RLS filtre auto par company_id
```

---

## 🧪 VALIDATION RLS

### Tables sécurisées (vérifier policies)
- [x] vehicles (RLS OK)
- [x] drivers (RLS OK)
- [ ] maintenance_records (à vérifier)
- [ ] routes (à vérifier)
- [ ] fuel_records (à vérifier)
- [ ] ai_predictions (à vérifier)

### Fonction utilitaire requise
```sql
get_current_user_company_id() -- Déjà créée
```

---

## 🚨 RISQUES IDENTIFIÉS

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Régression fonctionnelle | Moyenne | Élevé | Tests E2E + Rollback |
| Policy RLS manquante | Élevée | Critique | Migration SQL de validation |
| Performance (n+1) | Faible | Moyen | Monitoring Sentry |

---

## 📋 CHECKLIST AVANT PROD

- [ ] Tous les fichiers actions refactorisés
- [ ] Migration SQL RLS validation créée
- [ ] Tests E2E passés (flows critiques)
- [ ] Audit manuel cross-company (tentative accès données autre entreprise)
- [ ] Documentation à jour

---

## 💾 ROLLBACK

```bash
# En cas de problème
git checkout pre-security-update-2024-20260224
```

---

## 📝 NOTES

### Fichiers où garder adminClient (légitime)
1. `/api/cron/*` - Jobs système
2. `/api/stripe/webhook` - Webhook externe
3. `/api/auth/register` - Création initiale user
4. `/api/admin/*` - Administration
5. `/superadmin/*` - Superadmin interface
6. `/lib/notifications/*` - Async notifications
7. `/lib/webhooks/*` - Webhooks externes
8. `superadmin.ts` - Actions superadmin

### Prochaine session
1. Commencer par `drivers.ts` (similaire à vehicles.ts)
2. Puis `maintenance.ts`
3. Créer migration SQL de validation RLS
4. Tester flows critiques

---

**Prochaine mise à jour** : Refactorisation batch des fichiers drivers + maintenance
