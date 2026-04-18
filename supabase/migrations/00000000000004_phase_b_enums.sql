-- Migration : phase_b_enums
-- Date       : 2026-04-18
-- Contexte   : Phase B — modèle institutionnel (spec docs/SPEC-INSTITUTIONAL-MODEL.md)
-- Objet      : Étendre l'enum user_role avec les deux nouveaux rôles.
--
-- IMPORTANT  : ALTER TYPE ... ADD VALUE doit être COMMITÉ avant d'être
--              référencé (DEFAULT, CHECK, cast). On isole donc cette
--              mutation dans sa propre migration pour que la suivante
--              (phase_b_institutional) puisse s'en servir immédiatement.
--
-- Nouveaux rôles :
--   service_chief     — chef de service (admin de SON service seulement)
--   institution_admin — recteur/directeur (admin de SON hôpital, tous services)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'service_chief';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'institution_admin';

COMMENT ON TYPE public.user_role IS
  'Rôles hiérarchiques InternLog. Du bas vers le haut : student, supervisor, service_chief (admin service), institution_admin (admin hôpital), admin (legacy), superadmin, developer. Les rôles service_chief et institution_admin sont scopés à leur hôpital/service — voir SPEC-INSTITUTIONAL-MODEL.md.';
