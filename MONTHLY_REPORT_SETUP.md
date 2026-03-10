# 📊 Rapport Mensuel Automatique — FleetMaster Pro

Ce guide explique comment configurer et utiliser le rapport mensuel automatique par email.

---

## 📋 Vue d'ensemble

Le rapport mensuel est envoyé automatiquement le **1er de chaque mois à 8h00** (configurable) à tous les administrateurs et/ou directeurs de l'entreprise.

**Contenu du rapport :**
- Score de conformité global (%)
- KPI Flotte (véhicules, kilométrage)
- KPI Carburant (coût, consommation moyenne)
- KPI Maintenance (interventions, coûts)
- KPI Inspections (score moyen, défauts)
- Top 3 des véhicules les plus coûteux
- Documents à renouveler le mois prochain
- Actions urgentes à réaliser

---

## 🚀 Installation

### Étape 1: Exécuter la migration SQL

Dans **Supabase Dashboard** > SQL Editor :

```sql
\i supabase/migrations/20260302000000_monthly_report_settings.sql
```

Ou copie-colle le contenu de `supabase/migrations/20260302000000_monthly_report_settings.sql`

### Étape 2: Vérifier la configuration Resend

Assurez-vous que votre `.env.local` contient :

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
FROM_EMAIL=contact@fleet-master.fr
```

### Étape 3: Déployer sur Vercel

Le cron est déjà configuré dans `vercel.json` :

```json
{
  "path": "/api/cron/monthly-report",
  "schedule": "0 8 1 * *"
}
```

---

## ⚙️ Configuration par entreprise

Les administrateurs peuvent configurer le rapport dans **Paramètres > Entreprise > Rapport mensuel** :

| Paramètre | Description | Valeurs possibles |
|-----------|-------------|-------------------|
| **Activer le rapport** | Active/désactive l'envoi | true/false |
| **Jour d'envoi** | Quand envoyer le rapport | 1er, 5ème, ou dernier du mois |
| **Destinataires** | Qui reçoit le rapport | Admin seul / Admin + Directeurs |

**Par défaut :**
- ✅ Rapport activé
- 📅 Envoyé le 1er du mois
- 👤 Destinataires : Administrateur uniquement

---

## 🧪 Test manuel

### Test local

```bash
# Lancer le serveur de développement
npm run dev

# Appeler le cron manuellement (remplacer par votre CRON_SECRET)
curl "http://localhost:3000/api/cron/monthly-report?secret=VOTRE_CRON_SECRET"
```

### Vérifier les logs

```sql
-- Voir les rapports envoyés
SELECT * FROM monthly_report_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Voir par entreprise
SELECT 
    c.name,
    mrl.period,
    mrl.status,
    mrl.recipient_count,
    mrl.sent_at
FROM monthly_report_logs mrl
JOIN companies c ON c.id = mrl.company_id
ORDER BY mrl.sent_at DESC;
```

---

## 📧 Désabonnement

Les utilisateurs peuvent se désabonner via le lien présent dans l'email. Les emails désabonnés sont stockés dans `monthly_report_unsubscribes`.

```sql
-- Voir les désabonnements
SELECT * FROM monthly_report_unsubscribes;
```

---

## 🔒 Sécurité

- **Authentification** : Le cron nécessite le `CRON_SECRET`
- **Anti-doublon** : Un seul rapport par entreprise et par période (YYYY-MM)
- **RLS** : Les tables `monthly_report_logs` et `monthly_report_unsubscribes` sont protégées par RLS

---

## 🐛 Dépannage

### Problème: Aucun email reçu

1. Vérifier que l'entreprise a `monthly_report_enabled = true`
2. Vérifier que les profils ont un email valide
3. Vérifier les logs : `SELECT * FROM monthly_report_logs`
4. Vérifier la configuration Resend

### Problème: Erreur "Unauthorized"

Le `CRON_SECRET` n'est pas configuré ou est invalide. Vérifiez votre variable d'environnement.

### Problème: Données manquantes dans le rapport

Certaines tables peuvent avoir des colonnes différentes. Le cron utilise des fallback pour s'adapter :
- `fuel_records` : supporte `quantity` ou `liters`, `total_price` ou `cost`
- `inspections` : supporte `score` ou `global_score`, `defects` ou `defect_counts`

---

## 📁 Fichiers créés/modifiés

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/20260302000000_monthly_report_settings.sql` | Migration SQL |
| `src/lib/email/templates/monthly-report.ts` | Template email HTML |
| `src/app/api/cron/monthly-report/route.ts` | Route CRON |
| `src/actions/company.ts` | Actions pour les paramètres |
| `src/app/(dashboard)/settings/company/page.tsx` | UI des paramètres |
| `src/types/supabase.ts` | Types TypeScript |
| `vercel.json` | Configuration du cron |

---

## 📝 Notes techniques

- Le cron utilise `createAdminClient()` pour contourner le RLS
- Les données sont collectées pour le **mois écoulé** (N-1)
- Le score de conformité est calculé : 100 - (expirés × 15) - (expirant × 5)
- Le rapport est envoyé uniquement si l'entreprise existe et a des destinataires actifs
