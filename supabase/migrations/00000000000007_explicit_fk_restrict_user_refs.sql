-- Migration 00000000000007 — Rendre explicite ON DELETE RESTRICT sur les FKs
-- qui référencent un profil (supervisor, validateur, auteur d'audit, feedback).
--
-- CONTEXTE :
-- Ces FKs existaient déjà sans clause ON DELETE, ce qui équivaut en
-- PostgreSQL à NO ACTION — le DELETE du profil référencé est rejeté
-- atomiquement avec SQLSTATE 23503. Le code applicatif faisait malgré
-- tout 4 SELECT COUNT avant le DELETE pour anticiper et retourner un
-- message d'erreur explicite, ce qui créait une fenêtre TOCTOU : entre
-- les checks et le DELETE, une nouvelle entry pouvait être insérée avec
-- le supervisor cible.
--
-- Cette migration :
-- 1. Force ON DELETE RESTRICT de manière explicite (même effet que
--    NO ACTION mais plus lisible — indique à un relecteur futur que la
--    contrainte est volontaire).
-- 2. N'impacte aucune donnée — seules les métadonnées de contraintes
--    sont mises à jour.
--
-- Le refactor du code users.deleteUser qui accompagne cette migration
-- retire les 4 SELECT COUNT et s'appuie sur le DELETE atomique de
-- Postgres. Un catch sur error.code === '23503' mappe vers le message
-- admin.error.deleteBlocked.

BEGIN;

-- entries.supervisor_id
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_supervisor_id_fkey;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_supervisor_id_fkey
    FOREIGN KEY (supervisor_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- entries.validated_by
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_validated_by_fkey;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_validated_by_fkey
    FOREIGN KEY (validated_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- audit_log.user_id
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- feedback.user_id
ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- gardes : senior_id (similaire à supervisor) et created_by (auteur)
ALTER TABLE public.gardes
  DROP CONSTRAINT IF EXISTS gardes_senior_id_fkey;
ALTER TABLE public.gardes
  ADD CONSTRAINT gardes_senior_id_fkey
    FOREIGN KEY (senior_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

ALTER TABLE public.gardes
  DROP CONSTRAINT IF EXISTS gardes_created_by_fkey;
ALTER TABLE public.gardes
  ADD CONSTRAINT gardes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- Templates : auteur non supprimable tant que le template existe
ALTER TABLE public.cro_templates
  DROP CONSTRAINT IF EXISTS cro_templates_created_by_fkey;
ALTER TABLE public.cro_templates
  ADD CONSTRAINT cro_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

ALTER TABLE public.prescription_templates
  DROP CONSTRAINT IF EXISTS prescription_templates_created_by_fkey;
ALTER TABLE public.prescription_templates
  ADD CONSTRAINT prescription_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- des_registry.added_by
ALTER TABLE public.des_registry
  DROP CONSTRAINT IF EXISTS fk_des_registry_added_by;
ALTER TABLE public.des_registry
  ADD CONSTRAINT fk_des_registry_added_by
    FOREIGN KEY (added_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- des_objectives : created_by et updated_by
ALTER TABLE public.des_objectives
  DROP CONSTRAINT IF EXISTS des_objectives_created_by_fkey;
ALTER TABLE public.des_objectives
  ADD CONSTRAINT des_objectives_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

ALTER TABLE public.des_objectives
  DROP CONSTRAINT IF EXISTS des_objectives_updated_by_fkey;
ALTER TABLE public.des_objectives
  ADD CONSTRAINT des_objectives_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- Vérification : toutes les contraintes ciblées ont bien ON DELETE RESTRICT
DO $$
DECLARE
  nb_non_restrict integer;
BEGIN
  SELECT count(*) INTO nb_non_restrict
  FROM pg_constraint c
  WHERE c.conname IN (
    'entries_supervisor_id_fkey',
    'entries_validated_by_fkey',
    'audit_log_user_id_fkey',
    'feedback_user_id_fkey',
    'gardes_senior_id_fkey',
    'gardes_created_by_fkey',
    'cro_templates_created_by_fkey',
    'prescription_templates_created_by_fkey',
    'fk_des_registry_added_by',
    'des_objectives_created_by_fkey',
    'des_objectives_updated_by_fkey'
  )
  AND c.confdeltype <> 'r'; -- r = RESTRICT

  IF nb_non_restrict > 0 THEN
    RAISE EXCEPTION 'Migration échouée — % FK(s) sans ON DELETE RESTRICT', nb_non_restrict;
  END IF;

  RAISE NOTICE 'Migration OK — 11 FKs marquées explicitement ON DELETE RESTRICT';
END $$;

COMMIT;
