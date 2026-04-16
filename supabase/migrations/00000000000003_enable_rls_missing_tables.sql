-- Migration : enable_rls_missing_tables
-- Date       : 2026-04-16
-- Sévérité   : CRITIQUE — alerte Supabase "Table publicly accessible"
-- Contexte   : 5 tables référentielles avaient des policies RLS définies
--              mais le ROW LEVEL SECURITY n'était pas activé (ALTER TABLE ... ENABLE).
--              Résultat : les policies étaient ignorées et les tables ouvertes
--              à n'importe quel utilisateur connaissant l'URL du projet.
--              Tables concernées :
--                - cro_templates         (templates de compte-rendu opératoire)
--                - instruments           (instruments chirurgicaux)
--                - preop_templates       (templates pré-opératoires)
--                - prescription_templates (templates d'ordonnances)
--                - surgical_techniques   (techniques chirurgicales)
--
-- Fix        : Activer RLS sur les 5 tables. Les policies SELECT/INSERT/UPDATE
--              déjà présentes dans le base_schema (cro_read, instruments_read,
--              preop_read, prescriptions_read, techniques_read, etc.) prendront
--              effet immédiatement.
--
-- Note       : surgical_techniques.techniques_read utilise USING (true) — même
--              les utilisateurs non authentifiés pourraient lire via l'API REST
--              anonyme. On restreint en ajoutant une policy plus stricte.

-- 1. Activer RLS sur les 5 tables manquantes
ALTER TABLE public.cro_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_techniques ENABLE ROW LEVEL SECURITY;

-- 2. Corriger surgical_techniques : remplacer USING (true) par auth required
--    L'ancienne policy permettait un accès anonyme (USING (true))
DROP POLICY IF EXISTS techniques_read ON public.surgical_techniques;
CREATE POLICY techniques_read ON public.surgical_techniques
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY techniques_read ON public.surgical_techniques IS
  'Lecture réservée aux utilisateurs authentifiés (corrige l''ancien USING(true) qui autorisait l''accès anonyme).';
