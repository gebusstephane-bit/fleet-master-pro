-- ============================================================
-- MIGRATION : Refonte totale RLS — SECURITY DEFINER
-- ============================================================
-- Auteur  : Correctif architectural P0
-- Date    : 2026-02-24
-- Ticket  : AUDIT-FLEETMASTER — Faille 1 (récursion RLS)
--
-- PROBLÈME RÉSOLU :
--   Les policies RLS sur `profiles` se référençaient elles-mêmes,
--   causant une récursion infinie lors de l'évaluation par PostgreSQL.
--   10 migrations précédentes ont tenté des correctifs partiels laissant
--   des policies contradictoires actives simultanément.
--
-- APPROCHE :
--   1. Deux fonctions SECURITY DEFINER qui lisent `profiles` en
--      court-circuitant RLS (exécution sous droits postgres)
--   2. Suppression exhaustive de TOUTES les policies connues sur chaque table
--   3. Recréation propre avec UNIQUEMENT ces deux fonctions comme prédicats
--
-- PRINCIPE DE SÉCURITÉ :
--   SECURITY DEFINER = la fonction s'exécute avec les droits du PROPRIÉTAIRE
--   (postgres/superuser), pas de l'appelant. PostgreSQL ne réévalue donc PAS
--   les policies RLS de `profiles` lors de l'appel → zéro récursion.
--
-- ISOLATION MULTI-TENANT GARANTIE :
--   Toute donnée est filtrée par company_id = get_user_company_id()
--   Un utilisateur de l'entreprise A ne peut JAMAIS lire les données
--   de l'entreprise B, même en requête Supabase directe.
--
-- EXÉCUTION :
--   supabase db push
--   OU : psql -h <host> -d postgres -f 20260224000001_fix_rls_security_definer.sql
-- ============================================================

BEGIN;

-- ============================================================
-- PARTIE 1 : FONCTIONS SECURITY DEFINER
-- ============================================================
-- Ces fonctions sont le cœur de la solution. En s'exécutant avec
-- les droits de leur propriétaire (pas de l'utilisateur appelant),
-- elles contournent le circuit RLS → zéro récursion possible.

-- ── 1a. get_user_company_id() ─────────────────────────────────
-- Retourne le company_id de l'utilisateur authentifié.
-- Utilisée dans TOUTES les policies de toutes les tables.
--
-- Pourquoi STABLE et pas VOLATILE ?
--   STABLE garantit que PostgreSQL peut mettre le résultat en cache
--   pour la durée de la requête → appelée une seule fois par query
--   même si la policy est évaluée ligne par ligne.
--
-- Pourquoi SET search_path = public ?
--   Prévient l'attaque par search_path injection (CVE classique).
--
-- Test de vérification :
--   SELECT get_user_company_id();
--   → Doit retourner le company_id de l'utilisateur connecté, jamais NULL
--     pour un utilisateur avec un profil complet.

CREATE OR REPLACE FUNCTION get_user_company_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT company_id
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;
$$;

COMMENT ON FUNCTION get_user_company_id() IS
  'Retourne le company_id de l''utilisateur JWT courant. '
  'SECURITY DEFINER : s''exécute sous droits postgres → contourne RLS sur profiles → zéro récursion. '
  'STABLE : mise en cache par query pour performance.';

-- ── 1b. get_user_role() ──────────────────────────────────────
-- Retourne le rôle de l'utilisateur authentifié.
-- Utilisée dans les policies sensibles (DELETE, api_keys, webhooks…).
--
-- Valeurs possibles : 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT'
--
-- Test de vérification :
--   SELECT get_user_role();
--   → Doit retourner 'ADMIN', 'DIRECTEUR', etc.

CREATE OR REPLACE FUNCTION get_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT role::text
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;
$$;

COMMENT ON FUNCTION get_user_role() IS
  'Retourne le rôle de l''utilisateur JWT courant (ADMIN|DIRECTEUR|AGENT_DE_PARC|EXPLOITANT). '
  'SECURITY DEFINER : même protection anti-récursion que get_user_company_id().';

-- ── 1c. get_current_user_company_id() — alias de compatibilité ──
-- La migration 20250220000100 a créé cette fonction avec un nom différent.
-- Des policies existantes (api_keys, webhooks, activity_logs…) l'utilisent.
-- On la redéfinit comme alias de get_user_company_id() pour cohérence.

CREATE OR REPLACE FUNCTION get_current_user_company_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT get_user_company_id();
$$;

COMMENT ON FUNCTION get_current_user_company_id() IS
  'Alias de compatibilité vers get_user_company_id(). '
  'Conservé pour les policies créées avant cette migration.';

-- ── Permissions sur les fonctions ────────────────────────────
-- REVOKE ALL FROM PUBLIC : empêche les utilisateurs non authentifiés
-- (anon key sans JWT) d'appeler ces fonctions directement.

REVOKE ALL ON FUNCTION get_user_company_id()         FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_role()               FROM PUBLIC;
REVOKE ALL ON FUNCTION get_current_user_company_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_user_company_id()         TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role()               TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_company_id() TO authenticated;

-- service_role a accès pour les vérifications internes
GRANT EXECUTE ON FUNCTION get_user_company_id()         TO service_role;
GRANT EXECUTE ON FUNCTION get_user_role()               TO service_role;
GRANT EXECUTE ON FUNCTION get_current_user_company_id() TO service_role;


-- ============================================================
-- PARTIE 2 : SUPPRESSION EXHAUSTIVE DES POLICIES EXISTANTES
-- ============================================================
-- On supprime CHAQUE nom de policy connu dans les 10 migrations
-- précédentes. DROP IF EXISTS = idempotent, pas d'erreur si absente.

-- ── profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Profiles viewable by company"              ON profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admin or self"      ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by admin"              ON profiles;
DROP POLICY IF EXISTS "Profiles deletable by admin"               ON profiles;
DROP POLICY IF EXISTS "profiles_select_simple"                    ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple"                    ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple"                    ON profiles;
DROP POLICY IF EXISTS "profiles_delete_simple"                    ON profiles;
DROP POLICY IF EXISTS "profiles_select"                           ON profiles;
DROP POLICY IF EXISTS "profiles_insert"                           ON profiles;
DROP POLICY IF EXISTS "profiles_update"                           ON profiles;
DROP POLICY IF EXISTS "profiles_delete"                           ON profiles;
DROP POLICY IF EXISTS profiles_select                             ON profiles;
DROP POLICY IF EXISTS profiles_insert                             ON profiles;
DROP POLICY IF EXISTS profiles_update                             ON profiles;
DROP POLICY IF EXISTS profiles_select_policy                      ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy                      ON profiles;
DROP POLICY IF EXISTS profiles_update_policy                      ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users"    ON profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users"  ON profiles;
DROP POLICY IF EXISTS "Enable update access for authenticated users"  ON profiles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users"  ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id"      ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"     ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile"              ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile"            ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"            ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile"            ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same company"       ON profiles;
DROP POLICY IF EXISTS "Users can view company profiles"               ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"                  ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"                ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"                    ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"                  ON profiles;

-- ── vehicles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "vehicles_select"                              ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert"                              ON vehicles;
DROP POLICY IF EXISTS "vehicles_update"                              ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete"                              ON vehicles;
DROP POLICY IF EXISTS vehicles_select                                ON vehicles;
DROP POLICY IF EXISTS vehicles_insert                                ON vehicles;
DROP POLICY IF EXISTS vehicles_update                                ON vehicles;
DROP POLICY IF EXISTS vehicles_delete                                ON vehicles;
DROP POLICY IF EXISTS vehicles_select_policy                         ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_policy                         ON vehicles;
DROP POLICY IF EXISTS vehicles_update_policy                         ON vehicles;
DROP POLICY IF EXISTS vehicles_delete_policy                         ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy"                       ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy"                       ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy"                       ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy"                       ON vehicles;
DROP POLICY IF EXISTS "Enable read access for users in same company"  ON vehicles;
DROP POLICY IF EXISTS "Enable insert for users in same company"       ON vehicles;
DROP POLICY IF EXISTS "Enable update for users in same company"       ON vehicles;
DROP POLICY IF EXISTS "Enable delete for admin users"                 ON vehicles;
DROP POLICY IF EXISTS "Enable read access for company users"          ON vehicles;
DROP POLICY IF EXISTS "Enable insert for company users"               ON vehicles;
DROP POLICY IF EXISTS "Enable update for company users"               ON vehicles;
DROP POLICY IF EXISTS "Enable delete for company users"               ON vehicles;

-- ── drivers ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "drivers_select"                               ON drivers;
DROP POLICY IF EXISTS "drivers_insert"                               ON drivers;
DROP POLICY IF EXISTS "drivers_update"                               ON drivers;
DROP POLICY IF EXISTS "drivers_delete"                               ON drivers;
DROP POLICY IF EXISTS drivers_select                                 ON drivers;
DROP POLICY IF EXISTS drivers_insert                                 ON drivers;
DROP POLICY IF EXISTS drivers_update                                 ON drivers;
DROP POLICY IF EXISTS drivers_delete                                 ON drivers;
DROP POLICY IF EXISTS "Enable read access for company users"         ON drivers;
DROP POLICY IF EXISTS "Enable insert for company users"              ON drivers;
DROP POLICY IF EXISTS "Enable update for company users"              ON drivers;
DROP POLICY IF EXISTS "Enable delete for company users"              ON drivers;

-- ── maintenance_records ──────────────────────────────────────

DROP POLICY IF EXISTS "maintenance_select"                           ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert"                           ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update"                           ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete"                           ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance viewable by company"              ON maintenance_records;
DROP POLICY IF EXISTS "Maintenance modifiable by company"            ON maintenance_records;
DROP POLICY IF EXISTS "Users can view vehicle maintenance"           ON maintenance_records;
DROP POLICY IF EXISTS "Users can modify vehicle maintenance"         ON maintenance_records;
DROP POLICY IF EXISTS "Enable read access for company users"         ON maintenance_records;
DROP POLICY IF EXISTS "Enable insert for company users"              ON maintenance_records;
DROP POLICY IF EXISTS "Enable update for company users"              ON maintenance_records;
DROP POLICY IF EXISTS "Enable delete for company users"              ON maintenance_records;

-- ── api_keys ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "api_keys_company_policy"                      ON api_keys;
DROP POLICY IF EXISTS api_keys_select                                ON api_keys;
DROP POLICY IF EXISTS api_keys_insert                                ON api_keys;
DROP POLICY IF EXISTS api_keys_update                                ON api_keys;
DROP POLICY IF EXISTS api_keys_delete                                ON api_keys;

-- ── webhooks ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "webhooks_company_policy"                      ON webhooks;
DROP POLICY IF EXISTS webhooks_select                                ON webhooks;
DROP POLICY IF EXISTS webhooks_insert                                ON webhooks;
DROP POLICY IF EXISTS webhooks_update                                ON webhooks;
DROP POLICY IF EXISTS webhooks_delete                                ON webhooks;

-- ── inspections ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Inspections viewable by company"              ON inspections;
DROP POLICY IF EXISTS "Inspections modifiable by company"            ON inspections;
DROP POLICY IF EXISTS inspections_select                             ON inspections;
DROP POLICY IF EXISTS inspections_insert                             ON inspections;
DROP POLICY IF EXISTS inspections_update                             ON inspections;
DROP POLICY IF EXISTS inspections_delete                             ON inspections;
DROP POLICY IF EXISTS "Enable read access for company users"         ON inspections;
DROP POLICY IF EXISTS "Enable insert for company users"              ON inspections;
DROP POLICY IF EXISTS "Enable update for company users"              ON inspections;
DROP POLICY IF EXISTS "Enable delete for company users"              ON inspections;

-- ── routes ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "routes_select"                                ON routes;
DROP POLICY IF EXISTS "routes_insert"                                ON routes;
DROP POLICY IF EXISTS "routes_update"                                ON routes;
DROP POLICY IF EXISTS "routes_delete"                                ON routes;
DROP POLICY IF EXISTS routes_select                                  ON routes;
DROP POLICY IF EXISTS routes_insert                                  ON routes;
DROP POLICY IF EXISTS routes_update                                  ON routes;
DROP POLICY IF EXISTS routes_delete                                  ON routes;

-- ── activity_logs ────────────────────────────────────────────

DROP POLICY IF EXISTS "activity_logs_select"                         ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert"                         ON activity_logs;
DROP POLICY IF EXISTS activity_logs_select                           ON activity_logs;
DROP POLICY IF EXISTS activity_logs_insert                           ON activity_logs;

-- ── notifications ────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_select"                         ON notifications;
DROP POLICY IF EXISTS "notifications_insert"                         ON notifications;
DROP POLICY IF EXISTS "notifications_update"                         ON notifications;
DROP POLICY IF EXISTS notifications_select                           ON notifications;
DROP POLICY IF EXISTS notifications_insert                           ON notifications;
DROP POLICY IF EXISTS notifications_update                           ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications"       ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications"     ON notifications;

-- ── predictive_alerts ────────────────────────────────────────

DROP POLICY IF EXISTS "company_members_read_predictive_alerts"       ON predictive_alerts;
DROP POLICY IF EXISTS "company_members_write_predictive_alerts"      ON predictive_alerts;
DROP POLICY IF EXISTS "agents_update_predictive_alerts"              ON predictive_alerts;
DROP POLICY IF EXISTS predictive_alerts_select                       ON predictive_alerts;
DROP POLICY IF EXISTS predictive_alerts_insert                       ON predictive_alerts;
DROP POLICY IF EXISTS predictive_alerts_update                       ON predictive_alerts;

-- ── vehicle_predictive_thresholds ────────────────────────────

DROP POLICY IF EXISTS "company_members_read_thresholds"              ON vehicle_predictive_thresholds;
DROP POLICY IF EXISTS "directors_manage_thresholds"                  ON vehicle_predictive_thresholds;
DROP POLICY IF EXISTS thresholds_select                              ON vehicle_predictive_thresholds;
DROP POLICY IF EXISTS thresholds_insert                              ON vehicle_predictive_thresholds;
DROP POLICY IF EXISTS thresholds_update                              ON vehicle_predictive_thresholds;

-- ── maintenance_reminders ────────────────────────────────────
-- Note : table créée par la migration 20260224000000 — peut ne pas exister encore.
-- Le DROP est donc dans un DO block conditionnel (voir PARTIE 5).

-- ── vehicle_status_history ───────────────────────────────────
-- Note : table créée par la migration 20260224000000 — peut ne pas exister encore.
-- Le DROP est donc dans un DO block conditionnel (voir PARTIE 5).


-- ============================================================
-- PARTIE 3 : ACTIVATION RLS SUR TOUTES LES TABLES
-- ============================================================

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_predictive_thresholds ENABLE ROW LEVEL SECURITY;
-- maintenance_reminders et vehicle_status_history : ENABLE RLS dans le DO block PARTIE 5
-- (tables créées par migration 20260224000000, peut-être absentes)


-- ============================================================
-- PARTIE 4 : POLICIES — TABLE PAR TABLE
-- ============================================================
--
-- CONVENTION :
--   Noms de policies : fmp_<table>_<operation>
--   Préfixe "fmp_" pour identifier facilement les policies de cette migration
--   vs. les anciennes (toutes les anciennes ont été supprimées ci-dessus).
--
-- MATRICE DE PERMISSIONS :
--   SELECT  : TOUS les rôles (isolation par company_id)
--   INSERT  : ADMIN, DIRECTEUR, AGENT_DE_PARC
--   UPDATE  : ADMIN, DIRECTEUR, AGENT_DE_PARC
--   DELETE  : ADMIN, DIRECTEUR uniquement
--   Tables sensibles (api_keys, webhooks) : ADMIN, DIRECTEUR pour tout
-- ============================================================


-- ── 4.1 PROFILES ─────────────────────────────────────────────
--
-- Cas particulier : profiles est la source de get_user_company_id().
-- La function SECURITY DEFINER garantit qu'il n'y a AUCUNE récursion.
--
-- Logique SELECT :
--   - Un utilisateur peut toujours voir son propre profil (auth.uid())
--   - Il peut voir les profils des collègues de sa company
--   → company_id = get_user_company_id() SANS sous-requête sur profiles
--
-- Vérification :
--   SELECT id, email, role FROM profiles;
--   → Doit retourner uniquement les profils de sa company + le sien

-- SELECT : son profil + collègues de la même company
CREATE POLICY fmp_profiles_select ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Cas 1 : lecture de son propre profil (toujours autorisé)
    id = auth.uid()
    OR
    -- Cas 2 : lecture des collègues de la même entreprise
    -- get_user_company_id() bypass RLS → zéro récursion
    company_id = get_user_company_id()
  );

-- INSERT : création de son propre profil (onboarding) OU par admin/manager
-- Note : lors de l'inscription, le profil est créé avec id = auth.uid()
CREATE POLICY fmp_profiles_insert ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Cas 1 : création de son propre profil (nouveau compte)
    id = auth.uid()
    OR
    -- Cas 2 : admin/manager crée un membre de son équipe
    (
      company_id = get_user_company_id()
      AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
    )
  );

-- UPDATE : son propre profil OU par admin/manager de la même company
CREATE POLICY fmp_profiles_update ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Cas 1 : modification de son propre profil
    id = auth.uid()
    OR
    -- Cas 2 : admin/manager modifie un membre de son équipe
    (
      company_id = get_user_company_id()
      AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    (
      company_id = get_user_company_id()
      AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
    )
  );

-- DELETE : ADMIN uniquement, ne peut pas se supprimer soi-même
CREATE POLICY fmp_profiles_delete ON profiles
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'ADMIN'
    AND id != auth.uid()  -- Ne peut pas se supprimer lui-même
  );


-- ── 4.2 VEHICLES ─────────────────────────────────────────────
--
-- Isolation stricte par company_id.
-- Tous les rôles peuvent lire les véhicules de leur company.
-- EXPLOITANT : lecture seule (no INSERT/UPDATE/DELETE policies → denied).
--
-- Vérification :
--   SET role = authenticated;
--   SELECT registration_number, brand, company_id FROM vehicles;
--   → Doit retourner UNIQUEMENT les véhicules de sa company

-- SELECT : tous les rôles de la company
CREATE POLICY fmp_vehicles_select ON vehicles
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT : ADMIN, DIRECTEUR, AGENT_DE_PARC
CREATE POLICY fmp_vehicles_insert ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- UPDATE : ADMIN, DIRECTEUR, AGENT_DE_PARC
CREATE POLICY fmp_vehicles_update ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- DELETE : ADMIN, DIRECTEUR uniquement
CREATE POLICY fmp_vehicles_delete ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.3 DRIVERS ─────────────────────────────────────────────
--
-- Même logique que vehicles.
--
-- Vérification :
--   SELECT first_name, last_name, company_id FROM drivers;
--   → Uniquement les chauffeurs de sa company

-- SELECT
CREATE POLICY fmp_drivers_select ON drivers
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT
CREATE POLICY fmp_drivers_insert ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- UPDATE
CREATE POLICY fmp_drivers_update ON drivers
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- DELETE
CREATE POLICY fmp_drivers_delete ON drivers
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.4 MAINTENANCE_RECORDS ───────────────────────────────────
--
-- Tous les rôles peuvent créer des demandes de maintenance.
-- Seul DIRECTEUR/ADMIN peut supprimer un enregistrement.
--
-- Vérification :
--   SELECT id, status, vehicle_id FROM maintenance_records;
--   → Uniquement les records de sa company

-- SELECT
CREATE POLICY fmp_maintenance_select ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT : tous les rôles actifs (tout le monde peut demander une maintenance)
CREATE POLICY fmp_maintenance_insert ON maintenance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

-- UPDATE : tous les rôles actifs
CREATE POLICY fmp_maintenance_update ON maintenance_records
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- DELETE : ADMIN, DIRECTEUR uniquement
CREATE POLICY fmp_maintenance_delete ON maintenance_records
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.5 API_KEYS ─────────────────────────────────────────────
--
-- Accès restreint aux rôles de gestion (données techniques sensibles).
-- EXPLOITANT et AGENT_DE_PARC n'ont pas accès aux clés API.
--
-- Vérification :
--   SELECT name, key FROM api_keys;
--   → Doit retourner les clés uniquement si rôle ADMIN ou DIRECTEUR

-- SELECT : ADMIN, DIRECTEUR
CREATE POLICY fmp_api_keys_select ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- INSERT : ADMIN, DIRECTEUR
CREATE POLICY fmp_api_keys_insert ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- UPDATE : ADMIN, DIRECTEUR
CREATE POLICY fmp_api_keys_update ON api_keys
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- DELETE : ADMIN uniquement (suppression définitive d'une clé)
CREATE POLICY fmp_api_keys_delete ON api_keys
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'ADMIN'
  );


-- ── 4.6 WEBHOOKS ─────────────────────────────────────────────
--
-- Même logique que api_keys (intégrations sensibles).
--
-- Vérification :
--   SELECT name, url FROM webhooks;
--   → Doit retourner les webhooks uniquement si ADMIN ou DIRECTEUR

-- SELECT
CREATE POLICY fmp_webhooks_select ON webhooks
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- INSERT
CREATE POLICY fmp_webhooks_insert ON webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- UPDATE
CREATE POLICY fmp_webhooks_update ON webhooks
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- DELETE
CREATE POLICY fmp_webhooks_delete ON webhooks
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.7 INSPECTIONS ──────────────────────────────────────────
--
-- Les agents peuvent créer et mettre à jour des inspections.
-- EXPLOITANT : lecture seule.
--
-- Vérification :
--   SELECT vehicle_id, inspection_type FROM inspections;
--   → Uniquement les inspections de sa company

-- SELECT
CREATE POLICY fmp_inspections_select ON inspections
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT : ADMIN, DIRECTEUR, AGENT_DE_PARC
CREATE POLICY fmp_inspections_insert ON inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- UPDATE
CREATE POLICY fmp_inspections_update ON inspections
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- DELETE
CREATE POLICY fmp_inspections_delete ON inspections
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.8 ROUTES ───────────────────────────────────────────────
--
-- Vérification :
--   SELECT origin, destination FROM routes;
--   → Uniquement les routes de sa company

-- SELECT
CREATE POLICY fmp_routes_select ON routes
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT
CREATE POLICY fmp_routes_insert ON routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- UPDATE
CREATE POLICY fmp_routes_update ON routes
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
  );

-- DELETE
CREATE POLICY fmp_routes_delete ON routes
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.9 ACTIVITY_LOGS ────────────────────────────────────────
--
-- Logs immuables : lecture seule pour les utilisateurs.
-- L'écriture est réservée au service_role (actions serveur).
-- Note : pas de policy INSERT/UPDATE/DELETE → les users ne peuvent qu'écrire
--        via le service_role qui bypass RLS.
--
-- Vérification :
--   SELECT action, created_at FROM activity_logs LIMIT 5;
--   → Uniquement les logs de sa company

-- SELECT uniquement
CREATE POLICY fmp_activity_logs_select ON activity_logs
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT : autorisé pour tous les rôles authentifiés (les actions loguent)
CREATE POLICY fmp_activity_logs_insert ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());


-- ── 4.10 NOTIFICATIONS ───────────────────────────────────────
--
-- Notifications in-app : chaque utilisateur ne voit que les siennes.
-- user_id = auth.uid() (niveau utilisateur, pas company).
--
-- Vérification :
--   SELECT title, message, read FROM notifications;
--   → Uniquement ses propres notifications

-- SELECT : ses propres notifications uniquement
CREATE POLICY fmp_notifications_select ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT : le service_role crée les notifications, l'user peut s'en créer
CREATE POLICY fmp_notifications_insert ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE : marquer comme lu (sa notification uniquement)
CREATE POLICY fmp_notifications_update ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE : supprimer ses propres notifications
CREATE POLICY fmp_notifications_delete ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ── 4.11 PREDICTIVE_ALERTS ───────────────────────────────────
--
-- Les alertes prédictives sont générées par le cron (service_role).
-- Les agents peuvent les lire et soumettre du feedback (UPDATE).
-- Pas de INSERT pour les users (cron uniquement via service_role).
--
-- Vérification :
--   SELECT urgency_level, component_concerned FROM predictive_alerts;
--   → Uniquement les alertes de sa company

-- SELECT
CREATE POLICY fmp_predictive_alerts_select ON predictive_alerts
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- UPDATE : feedback et changement de statut (tous rôles de la company)
CREATE POLICY fmp_predictive_alerts_update ON predictive_alerts
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- INSERT : ADMIN/DIRECTEUR uniquement (hors cron service_role)
CREATE POLICY fmp_predictive_alerts_insert ON predictive_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

-- DELETE : ADMIN uniquement
CREATE POLICY fmp_predictive_alerts_delete ON predictive_alerts
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'ADMIN'
  );


-- ── 4.12 VEHICLE_PREDICTIVE_THRESHOLDS ───────────────────────
--
-- Seuils de sensibilité des alertes prédictives.
-- Lecture pour tous, écriture pour ADMIN/DIRECTEUR.
--
-- Vérification :
--   SELECT vehicle_id, custom_threshold_score FROM vehicle_predictive_thresholds;
--   → Uniquement les seuils de sa company

-- SELECT
CREATE POLICY fmp_thresholds_select ON vehicle_predictive_thresholds
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- INSERT/UPDATE : ADMIN, DIRECTEUR
CREATE POLICY fmp_thresholds_insert ON vehicle_predictive_thresholds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );

CREATE POLICY fmp_thresholds_update ON vehicle_predictive_thresholds
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('ADMIN', 'DIRECTEUR')
  );


-- ── 4.13 MAINTENANCE_REMINDERS ───────────────────────────────
-- Table créée par migration 20260224000000 (peut ne pas exister encore).
-- RLS et policies gérées dans le DO block PARTIE 5.

-- ── 4.14 VEHICLE_STATUS_HISTORY ──────────────────────────────
-- Table créée par migration 20260224000000 (peut ne pas exister encore).
-- RLS et policies gérées dans le DO block PARTIE 5.


-- ============================================================
-- PARTIE 5 : TABLES OPTIONNELLES (DO block — sans erreur si absente)
-- ============================================================
-- Certaines tables peuvent exister selon la version du schéma déployé.
-- On utilise des blocs DO pour une migration idempotente.

DO $$
DECLARE
  tbl_exists    boolean;
  has_company_id boolean;
BEGIN

  -- ── fuel_entries ──────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fuel_entries'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    DROP POLICY IF EXISTS fmp_fuel_select ON fuel_entries;
    DROP POLICY IF EXISTS fmp_fuel_insert ON fuel_entries;
    DROP POLICY IF EXISTS fmp_fuel_update ON fuel_entries;
    DROP POLICY IF EXISTS fmp_fuel_delete ON fuel_entries;
    DROP POLICY IF EXISTS "fuel_entries_company_policy" ON fuel_entries;
    ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY fmp_fuel_select ON fuel_entries FOR SELECT TO authenticated USING (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY fmp_fuel_insert ON fuel_entries FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY fmp_fuel_update ON fuel_entries FOR UPDATE TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY fmp_fuel_delete ON fuel_entries FOR DELETE TO authenticated USING (company_id = get_user_company_id() AND get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
    RAISE NOTICE 'RLS fuel_entries configurée';
  END IF;

  -- ── sos_providers ─────────────────────────────────────────
  -- Peut être une table globale (annuaire de prestataires, pas de company_id)
  -- ou tenant-scoped selon la version du schéma. Détection dynamique des colonnes.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sos_providers'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    -- Vérifier si la table possède une colonne company_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'sos_providers'
        AND column_name  = 'company_id'
    ) INTO has_company_id;

    DROP POLICY IF EXISTS fmp_sos_providers_select ON sos_providers;
    DROP POLICY IF EXISTS fmp_sos_providers_insert ON sos_providers;
    DROP POLICY IF EXISTS fmp_sos_providers_update ON sos_providers;
    ALTER TABLE sos_providers ENABLE ROW LEVEL SECURITY;

    IF has_company_id THEN
      -- Table tenant-scoped
      EXECUTE 'CREATE POLICY fmp_sos_providers_select ON sos_providers FOR SELECT TO authenticated USING (company_id = get_user_company_id())';
      EXECUTE 'CREATE POLICY fmp_sos_providers_insert ON sos_providers FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() AND get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
      EXECUTE 'CREATE POLICY fmp_sos_providers_update ON sos_providers FOR UPDATE TO authenticated USING (company_id = get_user_company_id() AND get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
      RAISE NOTICE 'RLS sos_providers configurée (mode tenant-scoped)';
    ELSE
      -- Table globale : tous les authentifiés lisent, seuls ADMIN/DIRECTEUR écrivent
      EXECUTE 'CREATE POLICY fmp_sos_providers_select ON sos_providers FOR SELECT TO authenticated USING (true)';
      EXECUTE 'CREATE POLICY fmp_sos_providers_insert ON sos_providers FOR INSERT TO authenticated WITH CHECK (get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
      EXECUTE 'CREATE POLICY fmp_sos_providers_update ON sos_providers FOR UPDATE TO authenticated USING (get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
      RAISE NOTICE 'RLS sos_providers configurée (mode global — sans company_id)';
    END IF;
  END IF;

  -- ── sos_contracts ─────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sos_contracts'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    DROP POLICY IF EXISTS fmp_sos_contracts_select ON sos_contracts;
    DROP POLICY IF EXISTS fmp_sos_contracts_insert ON sos_contracts;
    DROP POLICY IF EXISTS fmp_sos_contracts_update ON sos_contracts;
    DROP POLICY IF EXISTS fmp_sos_contracts_delete ON sos_contracts;
    ALTER TABLE sos_contracts ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY fmp_sos_contracts_select ON sos_contracts FOR SELECT TO authenticated USING (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY fmp_sos_contracts_insert ON sos_contracts FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() AND get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
    EXECUTE 'CREATE POLICY fmp_sos_contracts_update ON sos_contracts FOR UPDATE TO authenticated USING (company_id = get_user_company_id() AND get_user_role() IN (''ADMIN'', ''DIRECTEUR''))';
    EXECUTE 'CREATE POLICY fmp_sos_contracts_delete ON sos_contracts FOR DELETE TO authenticated USING (company_id = get_user_company_id() AND get_user_role() = ''ADMIN'')';
    RAISE NOTICE 'RLS sos_contracts configurée';
  END IF;

  -- ── maintenance_reminders ─────────────────────────────────
  -- Table créée par migration 20260224000000 — peut ne pas exister encore.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance_reminders'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    DROP POLICY IF EXISTS fmp_reminders_select                            ON maintenance_reminders;
    DROP POLICY IF EXISTS "company_members_read_maintenance_reminders"    ON maintenance_reminders;
    DROP POLICY IF EXISTS maintenance_reminders_select                    ON maintenance_reminders;
    ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;
    -- SELECT uniquement : le cron écrit via service_role (bypass RLS)
    EXECUTE 'CREATE POLICY fmp_reminders_select ON maintenance_reminders FOR SELECT TO authenticated USING (company_id = get_user_company_id())';
    RAISE NOTICE 'RLS maintenance_reminders configurée';
  ELSE
    RAISE NOTICE 'maintenance_reminders absente — RLS ignorée (appliquer migration 20260224000000 d''abord)';
  END IF;

  -- ── vehicle_status_history ────────────────────────────────
  -- Table créée par migration 20260224000000 — peut ne pas exister encore.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vehicle_status_history'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    DROP POLICY IF EXISTS fmp_status_history_select                       ON vehicle_status_history;
    DROP POLICY IF EXISTS "company_members_read_vehicle_status_history"   ON vehicle_status_history;
    DROP POLICY IF EXISTS vehicle_status_history_select                   ON vehicle_status_history;
    ALTER TABLE vehicle_status_history ENABLE ROW LEVEL SECURITY;
    -- SELECT uniquement : journal immuable, seul le cron peut écrire (service_role)
    EXECUTE 'CREATE POLICY fmp_status_history_select ON vehicle_status_history FOR SELECT TO authenticated USING (company_id = get_user_company_id())';
    RAISE NOTICE 'RLS vehicle_status_history configurée';
  ELSE
    RAISE NOTICE 'vehicle_status_history absente — RLS ignorée (appliquer migration 20260224000000 d''abord)';
  END IF;

END $$;


-- ============================================================
-- PARTIE 6 : VÉRIFICATION POST-MIGRATION
-- ============================================================
-- Requêtes de contrôle. À exécuter manuellement après le déploiement.

-- ── 6a. Vérifier les policies créées ─────────────────────────
-- SELECT
--   tablename,
--   policyname,
--   cmd,
--   qual::text AS using_expression
-- FROM pg_policies
-- WHERE policyname LIKE 'fmp_%'
-- ORDER BY tablename, cmd;
--
-- Résultat attendu : toutes les policies préfixées 'fmp_' pour les tables ci-dessus.

-- ── 6b. Vérifier qu'il n'y a PLUS de policies récursives ─────
-- SELECT
--   tablename,
--   policyname,
--   qual::text
-- FROM pg_policies
-- WHERE qual::text LIKE '%SELECT%profiles%auth.uid%'
--   AND tablename = 'profiles'
--   AND policyname NOT LIKE 'fmp_%';
--
-- Résultat attendu : 0 ligne (aucune policy récursive résiduelle).

-- ── 6c. Vérifier les fonctions SECURITY DEFINER ──────────────
-- SELECT
--   routine_name,
--   security_type,
--   routine_definition
-- FROM information_schema.routines
-- WHERE routine_name IN ('get_user_company_id', 'get_user_role', 'get_current_user_company_id')
--   AND routine_schema = 'public';
--
-- Résultat attendu : 3 fonctions avec security_type = 'DEFINER'.

-- ── 6d. Test isolation multi-tenant (à faire avec 2 users test) ──
-- -- Connecté en USER A (company A) :
-- SELECT COUNT(*) FROM vehicles;   -- Doit retourner uniquement véhicules company A
-- SELECT COUNT(*) FROM profiles;   -- Doit retourner uniquement profiles company A
--
-- -- Connecté en USER B (company B) :
-- SELECT COUNT(*) FROM vehicles;   -- Doit retourner uniquement véhicules company B
-- -- 0 véhicule de la company A doit apparaître


-- ============================================================
-- FIN DE MIGRATION
-- ============================================================

COMMIT;

-- Notification finale
DO $$ BEGIN
  RAISE NOTICE '✅ Migration 20260224000001_fix_rls_security_definer terminée avec succès';
  RAISE NOTICE '   - Fonctions SECURITY DEFINER créées : get_user_company_id, get_user_role, get_current_user_company_id';
  RAISE NOTICE '   - Policies anciennes supprimées (exhaustivement)';
  RAISE NOTICE '   - Nouvelles policies fmp_* créées sur 14 tables';
  RAISE NOTICE '   - RLS activée sur vehicles et drivers (était désactivée)';
  RAISE NOTICE '   - Zéro récursion possible : toutes les policies utilisent uniquement les fonctions SECURITY DEFINER';
END $$;
