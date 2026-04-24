-- Migration 00000000000006 — Resserrement de la policy SELECT sur profiles
--
-- CONTEXTE (audit sécurité 2026-04-24) :
-- La policy "Authenticated users can read profiles" avec qual=true et
-- rôle=authenticated permettait à tout utilisateur authentifié (incluant
-- n'importe quel DES) de lire TOUS les profils de l'app via REST direct,
-- TOUTES colonnes comprises (email, phone, date_of_birth, matricule).
-- Exploit reproduit depuis un compte student : 8 profils PII exfiltrés.
--
-- CORRECTIF :
-- On retire la policy permissive universelle et on la remplace par une policy
-- contextuelle qui combine 3 cas d'usage légitimes :
--   1. Son propre profil (redondant avec profiles_own mais safe)
--   2. Profils du même home_hospital_id (sélecteurs superviseurs, dashboards équipe)
--   3. Profils liés via supervisor_assignments (redondant avec profiles_supervisor_view)
--
-- Les profils des autres hôpitaux deviennent invisibles sauf pour les admins
-- globaux (couvert par la policy profiles_admin_view existante, inchangée).
--
-- PIÈGE RÉSOLU : une sous-requête SELECT sur profiles à l'intérieur d'une policy
-- de profiles déclenche une récursion infinie (erreur 42P17). On passe par une
-- fonction SECURITY DEFINER qui bypasse RLS pour lire le home_hospital du caller.
--
-- PRÉREQUIS appliqués avant cette migration (2026-04-24) :
--   - fkethyj5@gmail.com : passé de student à developer (couvert par admin_view)
--   - elietshi@gmail.com : supprimé (compte fantôme, nom vide)
--   → seuls les 2 developers restent sans home_hospital_id, ils sont couverts
--     par profiles_admin_view donc aucun blocage fonctionnel.
--
-- VALIDATION :
--   scripts/test-rls-profiles.sh rejoue l'exploit post-migration et doit
--   retourner au plus 1 profil pour un compte student sans home_hospital_id.

BEGIN;

-- 1. Retirer la policy permissive universelle
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- 2. Fonction SECURITY DEFINER pour lire home_hospital_id sans récursion RLS
CREATE OR REPLACE FUNCTION public.auth_user_home_hospital()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT home_hospital_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Ne pas exposer à anon
REVOKE ALL ON FUNCTION public.auth_user_home_hospital() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_home_hospital() TO authenticated;

-- 3. Nouvelle policy scopée — utilise la fonction SECURITY DEFINER pour éviter
--    la récursion infinie (SELECT sur profiles dans une policy de profiles).
CREATE POLICY "profiles_contextual_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Cas 1 : son propre profil (tous champs)
  id = auth.uid()

  -- Cas 2 : même home_hospital_id que le caller
  OR (
    home_hospital_id IS NOT NULL
    AND home_hospital_id = public.auth_user_home_hospital()
  )

  -- Cas 3 : relation supervisor_assignments dans les 2 sens
  OR EXISTS (
    SELECT 1
    FROM public.supervisor_assignments sa
    WHERE (sa.student_id = auth.uid() AND sa.supervisor_id = public.profiles.id)
       OR (sa.supervisor_id = auth.uid() AND sa.student_id = public.profiles.id)
  )
);

-- 4. Vérification
DO $$
DECLARE
  nb_permissive_true integer;
  nb_contextual integer;
  nb_fn integer;
BEGIN
  SELECT count(*) INTO nb_permissive_true
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Authenticated users can read profiles';

  SELECT count(*) INTO nb_contextual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles_contextual_read';

  SELECT count(*) INTO nb_fn
  FROM pg_proc
  WHERE proname = 'auth_user_home_hospital';

  IF nb_permissive_true > 0 THEN
    RAISE EXCEPTION 'Migration échouée — policy permissive toujours présente';
  END IF;
  IF nb_contextual = 0 THEN
    RAISE EXCEPTION 'Migration échouée — policy contextuelle non créée';
  END IF;
  IF nb_fn = 0 THEN
    RAISE EXCEPTION 'Migration échouée — fonction auth_user_home_hospital absente';
  END IF;

  RAISE NOTICE 'Migration OK — policy permissive retirée, policy contextuelle active';
END $$;

COMMIT;
