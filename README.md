# FleetMaster Pro 🚛

Solution complète de gestion de flotte pour PME transporteurs (5-50 véhicules).

## 🌟 Fonctionnalités

- **📍 Carte temps réel** : Suivi GPS de tous vos véhicules
- **🚛 Gestion véhicules** : Fiches complètes, documents, maintenance
- **👨‍✈️ Gestion chauffeurs** : Profils, validités, scorecards
- **🗺️ Optimisation tournées** : Algorithme nearest-neighbor + 2-opt
- **💳 Abonnement Stripe** : 3 plans (Starter/Pro/Business)
- **📱 App mobile PWA** : Pour les chauffeurs

## 🛠️ Stack Technique

- **Frontend** : Next.js 14 (App Router) + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL + Auth + Realtime)
- **Cartographie** : Mapbox
- **Paiement** : Stripe
- **Hébergement** : Vercel

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- Compte Supabase
- Compte Stripe (optionnel)
- Token Mapbox (optionnel)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-org/fleetmaster-pro.git
cd fleetmaster-pro

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Configurer les variables d'environnement
# Éditer .env.local avec vos clés

# Lancer le serveur de développement
npm run dev
```

### Configuration Supabase

1. Créer un projet sur [Supabase](https://supabase.com)
2. Exécuter le script SQL dans l'éditeur SQL :
   ```sql
   -- Copier le contenu de supabase/schema.sql
   ```
3. Récupérer les clés API dans Settings > API
4. Mettre à jour `.env.local`

### Configuration Stripe (optionnel)

1. Créer un compte sur [Stripe](https://stripe.com)
2. Créer les 3 produits/prix dans le Dashboard
3. Configurer le webhook
4. Mettre à jour les variables Stripe dans `.env.local`

## 📁 Structure du Projet

```
fleetmaster-pro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Routes authentification
│   │   ├── (dashboard)/        # Routes protégées
│   │   └── api/                # API Routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Layout components
│   │   ├── vehicles/           # Components véhicules
│   │   ├── drivers/            # Components chauffeurs
│   │   ├── maps/               # Components cartographie
│   │   └── dashboard/          # Components dashboard
│   ├── lib/
│   │   ├── supabase/           # Clients Supabase
│   │   ├── stripe/             # Config Stripe
│   │   └── utils.ts            # Utilitaires
│   ├── types/                  # Types TypeScript
│   └── hooks/                  # Custom hooks
├── supabase/
│   ├── schema.sql              # Schéma base de données
│   └── seed.sql                # Données de démo
└── public/                     # Assets statiques
```

## 🔧 Scripts Utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Tests
npm run test

# Linting
npm run lint
```

## 📱 PWA Mobile

L'application est configurée comme PWA. Les chauffeurs peuvent :
- Installer l'app sur leur téléphone
- Accéder hors ligne aux fonctionnalités de base
- Recevoir des notifications push

## 🔧 Feature Flags

### GPS Temps Réel

La carte GPS temps réel est contrôlée par une variable d'environnement :

```env
# .env.local
NEXT_PUBLIC_ENABLE_GPS=false  # Caché par défaut
NEXT_PUBLIC_ENABLE_GPS=true   # Visible
```

**Par défaut**, la carte GPS est **cachée** (feature en développement pour le mois prochain).

Pour l'activer :
1. Définir `NEXT_PUBLIC_ENABLE_GPS=true` dans `.env.local`
2. Redémarrer le serveur
3. La carte apparaîtra sur le dashboard

**Note** : La carte utilise Mapbox. Assurez-vous d'avoir configuré `NEXT_PUBLIC_MAPBOX_TOKEN`.

## 🔒 Sécurité & RGPD

- Authentification sécurisée avec Supabase Auth
- Row Level Security (RLS) sur toutes les tables
- Données stockées en UE (Supabase EU)
- Conformité RGPD native

## 📄 License

MIT License - voir [LICENSE](LICENSE)

## 🤝 Support

Pour toute question ou suggestion :
- Email : support@fleetmaster.pro
- Documentation : https://docs.fleetmaster.pro

---

Développé avec ❤️ pour les transporteurs
