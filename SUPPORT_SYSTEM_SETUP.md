# Système de Support Tickets - Guide de Configuration

## ✅ Ce qui est implémenté

### 1. Côté Client (`/support`)
- ✅ Création de tickets via widget flottant ou page dédiée
- ✅ Liste des tickets avec filtres
- ✅ Vue conversation détaillée
- ✅ Réponses en temps réel
- ✅ Stats (ouverts, en cours, résolus)

### 2. Côté SuperAdmin (`/superadmin/support`)
- ✅ Liste de tous les tickets
- ✅ Page détail avec conversation
- ✅ Workflow automatique:
  - Ticket "open" → passe automatiquement "in_progress" quand ouvert
  - Boutons pour changer le statut (en attente, résolu, clôturé)
- ✅ Réponses au tickets

### 3. Base de données
- ✅ Tables `support_tickets` et `support_messages`
- ✅ RLS policies corrigées (users voient leurs tickets)
- ✅ Triggers pour notifications

### 4. Hooks React Query
- ✅ `useSupportTickets()` - liste simplifiée (sans jointures problématiques)
- ✅ `useSupportTicket(id)` - détail avec messages
- ✅ `useCreateTicket()` - création
- ✅ `useCreateMessage()` - réponses
- ✅ `useUpdateTicketStatus()` - changement de statut

---

## 🚀 Étapes pour activer

### 1. Exécuter les scripts SQL dans Supabase

Dans l'**Éditeur SQL** de Supabase Dashboard, exécutez dans cet ordre :

**Script 1: Structure** (`supabase/fix_support_tables.sql`)
```sql
-- Vérifie/ajoute les colonnes manquantes
-- Crée la table support_messages
-- Index + trigger updated_at
```

**Script 2: RLS** (`supabase/fix_support_rls_v2.sql`)
```sql
-- Corrige les policies pour que les users voient leurs tickets
-- Simplifie les règles d'accès
```

**Script 3: Notifications** (`supabase/support_notifications_setup.sql`)
```sql
-- Crée la table de queue pour emails
-- Triggers sur INSERT/UPDATE
```

### 2. Redémarrer le serveur Next.js
```bash
npm run dev
```

### 3. Tester le workflow

**Côté Client:**
1. Créer un ticket via le widget ou `/support`
2. Vérifier qu'il apparaît dans la liste
3. Cliquer dessus pour voir la conversation

**Côté SuperAdmin:**
1. Aller sur `/superadmin/support`
2. Le ticket doit apparaître avec statut "Nouveau"
3. Cliquer "Voir" → ouvre la page détail
4. Le statut passe automatiquement "En cours"
5. Répondre au ticket
6. Changer le statut (résolu/clôturé)

---

## 📧 Configuration Email (Optionnel)

Pour activer les vrais emails, configurer Resend ou SendGrid:

### 1. Créer un compte Resend (gratuit)
https://resend.com

### 2. Ajouter la clé API dans Supabase
Dans Supabase Dashboard → Settings → API → Config secrets:
```
RESEND_API_KEY = re_xxxxxxxxxxxx
```

### 3. Déployer l'Edge Function
```bash
npx supabase login
npx supabase functions deploy support-notifications
```

### 4. Modifier l'edge function
Dans `supabase/functions/support-notifications/index.ts`, décommenter la partie Resend et adapter.

---

## 🔧 Dépannage

### "Aucun ticket trouvé" côté client
- Vérifier que le script RLS V2 a été exécuté
- Vérifier dans la console browser les erreurs Supabase

### Erreurs 400 dans la console
- Les jointures Supabase sont problématiques → j'ai simplifié les requêtes
- Vérifier que les types `supabase.ts` sont à jour

### Pas de notifications email
- L'edge function n'est pas déployée → c'est normal en local
- Les logs sont dans Supabase Dashboard → Edge Functions

---

## 📋 Roadmap future

- [ ] Edge function email complète
- [ ] Upload de pièces jointes
- [ ] Mentions "lu/non lu"
- [ ] Assignation automatique aux admins
- [ ] Templates de réponses rapides
