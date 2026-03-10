# 🚨 PROCÉDURE RÉPARATION URGENTE
## 2 Profils Orphelins - Mode d'emploi

**Date:** 2026-02-21  
**Users concernés:**
1. `fleet.master.contact@gmail.com` (ID: dced169e-76d7-44bf-88da-82ded5f5fb05)
2. `gebus.emma@gmail.com` (ID: 8d29c266-4da4-4140-9e76-8e1161b81320)

---

## 📋 RÉSUMÉ RAPIDE

### Méthode recommandée : **SQL DIRECT** (Option A)
- ✅ Préserve TOUTES les données
- ✅ IDs alignés immédiatement
- ⚠️ Nécessite droits admin sur auth.users

### Alternative : **Suppression + Réinscription** (Option B)
- ✅ Fonctionne toujours
- ⚠️ Nécessite réassociation des données après
- ⏱️ Plus long (attendre que users se réinscrivent)

---

## 🔧 OPTION A : SQL DIRECT (RECOMMANDÉE)

### Étape 1 : Exécuter le script de réparation

1. Ouvre Supabase Dashboard → SQL Editor
2. Copie-colle le contenu de **`sql/repair-orphans-URGENT.sql`**
3. Clique sur **Run**

### Étape 2 : Vérifier le résultat

Résultat attendu (dernière requête du script) :
```
email                           | statut
--------------------------------|----------------
fleet.master.contact@gmail.com  | ✅ ALIGNÉ PARFAIT
gebus.emma@gmail.com            | ✅ ALIGNÉ PARFAIT
```

### Étape 3 : Si ça marche → Envoyer les credentials

```
Objet: Votre compte FleetMaster est réparé ✅

Bonjour,

Votre compte a été réparé et est maintenant accessible.

🔗 URL de connexion: https://ton-app.com/login
📧 Email: [leur email]
🔑 Mot de passe temporaire: TempPass2026!

⚠️ IMPORTANT: Changez votre mot de passe immédiatement après connexion:
Paramètres → Sécurité → Changer le mot de passe

Vos véhicules et données sont tous préservés.

Cordialement,
L'équipe FleetMaster
```

---

## 🔧 OPTION B : SUPPRESSION + RÉINSCRIPTION

**Utiliser cette méthode SEULEMENT si Option A échoue**

### Étape 1 : Exécuter le script d'export

1. Ouvre Supabase Dashboard → SQL Editor
2. Copie-colle le contenu de **`sql/repair-orphans-ALTERNATIVE.sql`**
3. Exécute UNIQUEMENT les parties 1 et 2 (backup + export)
4. **NE PAS exécuter la partie 3 (DELETE) encore !**

### Étape 2 : Vérifier les données exportées

```sql
SELECT * FROM temp_orphan_data_recovery;
```

Tu dois voir les 2 lignes avec leurs company_id et nombre de véhicules.

### Étape 3 : Supprimer les profils orphelins

Dans le script, décommente et exécute :
```sql
DELETE FROM profiles 
WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');
```

### Étape 4 : Demander aux users de se réinscrire

```
Objet: Action requise - Recréation de votre compte FleetMaster

Bonjour,

Suite à une maintenance technique, vous devez recréer votre compte.

1. Allez sur: https://ton-app.com/register
2. Utilisez votre email habituel: [leur email]
3. Complétez l'inscription (gratuit pour vous)

⚠️ Vos données (véhicules) ont été sauvegardées et seront réassociées sous 24h.

Nous vous contacterons dès que tout est restauré.

Désolé pour le dérangement.
L'équipe FleetMaster
```

### Étape 5 : Réassocier les données (après leur réinscription)

Une fois qu'ils se sont réinscrits :

```sql
-- Récupérer leurs nouveaux IDs
SELECT id, email FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- Mettre à jour les profils avec les anciens company_id
UPDATE profiles p
SET company_id = 'ANCIEN_COMPANY_ID_DU_BACKUP'
WHERE p.email = 'fleet.master.contact@gmail.com';
```

(Voir le script ALTERNATIVE.sql pour la version complète)

---

## 🔍 VÉRIFICATION POST-RÉPARATION

### Tester la connexion

1. Ouvre un navigateur en mode privé
2. Va sur https://ton-app.com/login
3. Teste avec :
   - Email: `fleet.master.contact@gmail.com`
   - Password: `TempPass2026!`
4. Vérifie que :
   - ✅ La connexion fonctionne
   - ✅ Le dashboard s'affiche
   - ✅ Les véhicules sont visibles
   - ✅ Le profil est accessible

### Vérifier l'alignement final

```sql
-- Doit retourner "✅ ALIGNÉ" pour les 2
SELECT 
    p.email,
    CASE WHEN u.id = p.id THEN '✅ ALIGNÉ' ELSE '❌ PROBLÈME' END as statut
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
```

---

## 🆘 EN CAS DE PROBLÈME

### Erreur "permission denied" sur auth.users
→ Utilise l'**Option B** (Suppression + Réinscription)

### Erreur "unique constraint violation"
→ L'email existe déjà dans auth.users avec un autre ID
→ Solution : Supprimer d'abord l'ancien auth.user :
```sql
-- Avant de créer les nouveaux
DELETE FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
```

### Les véhicules n'apparaissent pas
→ Vérifier le company_id :
```sql
SELECT p.email, p.company_id, c.name 
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
```

→ Si company_id est NULL ou différent, corriger :
```sql
UPDATE profiles 
SET company_id = 'LE_BON_COMPANY_ID'
WHERE email = 'fleet.master.contact@gmail.com';
```

---

## 📞 CONTACT EN CAS DE BLOCAGE

Si tu es bloqué :
1. **Ne supprime rien sans backup**
2. Vérifie que `backup_profiles_orphelins_20260221` existe
3. Demande de l'aide avant de continuer

---

**FIN DE LA PROCÉDURE**
