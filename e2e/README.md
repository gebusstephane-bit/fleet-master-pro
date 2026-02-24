# Tests E2E FleetMaster Pro

Ce répertoire contient les tests End-to-End (E2E) utilisant [Playwright](https://playwright.dev/).

## 🚀 Démarrage rapide

### 1. Prérequis

```bash
# Installer les navigateurs Playwright
npx playwright install

# Créer le fichier de configuration
cp .env.test.example .env.test
```

### 2. Configuration

Éditer `.env.test` avec vos valeurs :

```env
# URL de l'application
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon

# Utilisateurs de test (à créer dans Supabase Auth)
TEST_COMPANY_A_EMAIL=company-a@test.fleetmaster.local
TEST_COMPANY_A_PASSWORD=CompanyA123!

TEST_COMPANY_B_EMAIL=company-b@test.fleetmaster.local
TEST_COMPANY_B_PASSWORD=CompanyB123!
```

### 3. Créer les utilisateurs de test

Dans Supabase Dashboard → Authentication → Users → New User :

1. **Company A** (pour tests d'isolation)
   - Email: `company-a@test.fleetmaster.local`
   - Password: `CompanyA123!`
   - Créer une entreprise "Company A Test" et associer l'utilisateur
   - S'assurer que l'abonnement est actif

2. **Company B** (entreprise différente)
   - Email: `company-b@test.fleetmaster.local`
   - Password: `CompanyB123!`
   - Créer une entreprise "Company B Test"
   - S'assurer que l'abonnement est actif

### 4. Lancer les tests

```bash
# Tous les tests (headless)
npm run test:e2e

# Mode visuel (voir le navigateur)
npm run test:e2e:headed

# Interface graphique Playwright
npm run test:e2e:ui

# Uniquement les tests critiques
npm run test:e2e:critical

# Mode debug
npm run test:e2e:debug

# Voir le rapport HTML
npm run test:e2e:report
```

## 📁 Structure des tests

```
e2e/
├── fixtures/
│   └── test-data.ts       # Données et utilitaires de test
├── critical-flows.spec.ts # Tests des parcours critiques
├── login.spec.ts          # Tests de connexion
└── dashboard.spec.ts      # Tests du dashboard
```

## 🧪 Tests critiques implémentés

### 1. Inscription complète (`inscription-paiement-connexion`)
- Landing → Formulaire d'inscription
- Paiement Stripe (carte test 4242...)
- Redirection dashboard
- Déconnexion/Reconnexion

### 2. Isolation multi-tenant (`isolation-tenant-vehicules`)
- Deux contextes navigateur distincts
- Company A crée un véhicule
- Company B ne voit pas ce véhicule
- Test d'accès direct URL interdit

### 3. Workflow véhicule (`workflow-vehicule-document`)
- Création véhicule avec toutes les infos
- Alertes documents (CT expiré)
- Modification kilométrage

## 🔧 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run test:e2e` | Lance tous les tests |
| `npm run test:e2e:headed` | Mode visuel (1 navigateur) |
| `npm run test:e2e:ui` | Interface Playwright |
| `npm run test:e2e:critical` | Uniquement tests critiques |
| `npm run test:e2e:debug` | Mode debug pas à pas |
| `npm run test:e2e:report` | Ouvre le rapport HTML |

## 🐛 Dépannage

### Les tests échouent avec "Timeout"
- Vérifier que l'application tourne sur `localhost:3000`
- Augmenter le timeout dans `playwright.config.ts`
- Vérifier la connexion Supabase

### "User not found"
- Vérifier que les utilisateurs de test existent dans Supabase Auth
- Vérifier les credentials dans `.env.test`

### Stripe Checkout ne charge pas
- Vérifier que Stripe est en mode TEST
- Vérifier les clés Stripe dans `.env.test`
- La carte 4242 4242 4242 4242 doit toujours fonctionner en test

### Tests d'isolation échouent
- Vérifier que Company A et B sont sur des entreprises différentes
- Vérifier que les deux ont des abonnements actifs

## 📝 Bonnes pratiques

1. **Selectors robustes** : Utiliser les data-testid quand possible
2. **Emails uniques** : Toujours générer des emails uniques pour l'inscription
3. **Nettoyage** : Les tests ne nettoient pas automatiquement les données créées
4. **CI** : Les tests utilisent un seul worker en CI pour éviter les conflits

## 🔒 Sécurité

- **JAMAIS** commiter `.env.test` avec de vraies credentials
- Utiliser uniquement des emails en `@test.fleetmaster.local`
- Utiliser uniquement Stripe en mode TEST (`sk_test_`, `pk_test_`)
