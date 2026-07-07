-- ============================================
-- VERSIONING tables routes + alerts (audit — item 8 / dette schéma)
-- ============================================
-- Ces tables EXISTENT en prod mais n'étaient créées dans AUCUNE migration →
-- base non reconstructible (la migration 20250219000100_fix_critical_rls crée
-- des policies dessus SANS garde → un rebuild propre plantait faute de tables).
--
-- Fichier daté 20250219000050 pour s'exécuter JUSTE AVANT 20250219000100.
-- CREATE TABLE IF NOT EXISTS = strictement no-op sur la prod existante ;
-- rend uniquement les rebuilds propres fonctionnels. Schéma fidèle au dump
-- prod du 2026-07-05.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table alerts (alertes système par company)
CREATE TABLE IF NOT EXISTS alerts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type         varchar(50)  NOT NULL,
  severity     varchar(20)  NOT NULL,
  title        varchar(255) NOT NULL,
  message      text NOT NULL,
  entity_type  varchar(20),
  entity_id    uuid,
  is_read      boolean DEFAULT false,
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Table routes (tournées — module désactivé côté UI mais table active en base)
CREATE TABLE IF NOT EXISTS routes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id         uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id          uuid REFERENCES drivers(id) ON DELETE SET NULL,
  name               varchar(255) NOT NULL,
  route_date         date NOT NULL,
  status             varchar(50) DEFAULT 'planned',
  total_distance     numeric,
  estimated_duration integer,
  fuel_cost          numeric,
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
