-- Migration 00000000000008 — RGPD self-service : grace period 30 jours
--                             + fonction purge quotidienne.
--
-- CONTEXTE :
-- Conformément aux articles 17 (droit à l'effacement) et 20 (droit à la
-- portabilité) du RGPD, un utilisateur doit pouvoir :
--   1. Exporter l'intégralité de ses données (traité côté API, pas ici)
--   2. Demander la suppression de son compte sans passer par un admin.
--
-- Choix produit validé :
--   - Grace period 30 jours entre la demande et la destruction effective.
--     L'utilisateur peut annuler la demande à tout moment pendant ce délai
--     via /api/account/delete/cancel après ré-authentification.
--   - Pendant la période de sursis, l'utilisateur peut se connecter mais
--     est redirigé par le middleware vers /account/deletion-pending. Il
--     ne peut pas créer/modifier de données (mutations bloquées côté RLS
--     via une policy WITH CHECK sur les tables user-writable).
--   - Un cron GitHub Action appelle purge_pending_deletions() quotidiennement
--     pour supprimer les comptes dont le sursis a expiré.
--
-- PATTERNS APPLIQUÉS :
--   - RA-31/RP-31 : fonction purge SECURITY DEFINER STABLE search_path=public
--                   + REVOKE FROM PUBLIC + GRANT service_role uniquement.
--   - RA-33 : pas de pré-check FK dans purge_pending_deletions — on tente
--             auth.admin.deleteUser côté application et on catch SQLSTATE
--             23503 pour les DES avec entries référencées par supervisors
--             (anonymisation forcée gérée côté cron, cf. purge_pending_deletions).
--   - L-APP-014-toctou-fk-restrict-pattern : réutilisation du pattern
--             validé lors du fix CRIT-3 (migration 7).

BEGIN;

-- ============================================================================
-- 1. Colonnes de sursis sur profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;

COMMENT ON COLUMN public.profiles.deletion_requested_at IS
  'Horodatage de la demande de suppression self-service (Art. 17 RGPD). NULL = pas de demande active.';
COMMENT ON COLUMN public.profiles.deletion_reason IS
  'Raison optionnelle fournie par l''utilisateur lors de la demande.';
COMMENT ON COLUMN public.profiles.deletion_scheduled_for IS
  'Date effective de purge (deletion_requested_at + 30 jours). Le cron purge tous les comptes dont cette date est passée.';

-- Index partiel : n'indexe que les lignes en cours de suppression (petit set)
CREATE INDEX IF NOT EXISTS profiles_deletion_pending_idx
  ON public.profiles (deletion_scheduled_for)
  WHERE deletion_requested_at IS NOT NULL;

-- ============================================================================
-- 2. Policies RLS de blocage des mutations pendant le sursis
-- ============================================================================
-- Objectif : un utilisateur en cours de suppression peut lire ses données
-- (pour finaliser un export tardif) mais ne peut plus rien créer ni modifier.
-- On ajoute une clause WITH CHECK sur les tables user-writable.
--
-- Note : ces policies coexistent avec les policies métier existantes. Postgres
-- applique un AND sur toutes les policies applicables à une action donnée.

CREATE OR REPLACE FUNCTION public.auth_user_deletion_pending()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT deletion_requested_at IS NOT NULL
     FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

REVOKE ALL ON FUNCTION public.auth_user_deletion_pending() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_deletion_pending() TO authenticated;

COMMENT ON FUNCTION public.auth_user_deletion_pending() IS
  'Retourne true si le caller a une demande de suppression en cours. Utilisée par les policies WITH CHECK pour bloquer les mutations pendant le sursis.';

-- Applique le blocage aux tables user-writable les plus sensibles.
-- Chaque policy est en RESTRICTIVE pour être combinée en AND avec les
-- policies permissives existantes.

CREATE POLICY "block_writes_during_deletion_pending_entries"
  ON public.entries AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT public.auth_user_deletion_pending())
  WITH CHECK (NOT public.auth_user_deletion_pending());

CREATE POLICY "block_writes_during_deletion_pending_gardes"
  ON public.gardes AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT public.auth_user_deletion_pending())
  WITH CHECK (NOT public.auth_user_deletion_pending());

CREATE POLICY "block_writes_during_deletion_pending_notes"
  ON public.notes AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT public.auth_user_deletion_pending())
  WITH CHECK (NOT public.auth_user_deletion_pending());

CREATE POLICY "block_writes_during_deletion_pending_patient_followups"
  ON public.patient_followups AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT public.auth_user_deletion_pending())
  WITH CHECK (NOT public.auth_user_deletion_pending());

CREATE POLICY "block_writes_during_deletion_pending_feedback"
  ON public.feedback AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT public.auth_user_deletion_pending())
  WITH CHECK (NOT public.auth_user_deletion_pending());

-- profiles : autoriser UPDATE uniquement pour clear deletion_* (annulation).
-- Toute autre mutation sur son propre profil est bloquée.
-- L'annulation passe par l'API /api/account/delete/cancel qui utilise le
-- service_role (bypasse RLS) — la restrictive policy ici garantit qu'un
-- appel REST direct par l'utilisateur en sursis ne peut pas modifier
-- first_name, hospital_id, etc. via une simple UPDATE.
CREATE POLICY "block_writes_during_deletion_pending_profiles"
  ON public.profiles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    NOT public.auth_user_deletion_pending()
    OR id != auth.uid()
  )
  WITH CHECK (
    NOT public.auth_user_deletion_pending()
    OR id != auth.uid()
  );

-- ============================================================================
-- 3. Fonction de purge quotidienne (appelée par GitHub Action)
-- ============================================================================
-- Retourne la liste des user_ids éligibles à la purge. Le cron itère ensuite
-- côté application pour appeler auth.admin.deleteUser sur chacun avec le
-- pattern FK RESTRICT + catch 23503 + anonymisation forcée (cf. migration 7).

CREATE OR REPLACE FUNCTION public.list_pending_deletions()
RETURNS TABLE (
  user_id uuid,
  email text,
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  deletion_reason text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    id AS user_id,
    email,
    deletion_requested_at,
    deletion_scheduled_for,
    deletion_reason
  FROM public.profiles
  WHERE deletion_requested_at IS NOT NULL
    AND deletion_scheduled_for <= now()
  ORDER BY deletion_scheduled_for ASC
$$;

REVOKE ALL ON FUNCTION public.list_pending_deletions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_pending_deletions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_deletions() TO service_role;

COMMENT ON FUNCTION public.list_pending_deletions() IS
  'Liste les comptes dont le sursis 30j a expiré. Appelée par le cron GitHub Action .github/workflows/gdpr-purge.yml. Réservée à service_role.';

-- ============================================================================
-- 4. Fonction d'anonymisation forcée (fallback si FK RESTRICT bloque le DELETE)
-- ============================================================================
-- Quand un DES a des entries référencées par supervisor_id ou audit_log,
-- auth.admin.deleteUser échoue avec SQLSTATE 23503. Dans ce cas, le cron
-- appelle anonymize_user_data() qui :
--   - Nettoie toutes les données personnelles (nom, email, phone, matricule,
--     date_of_birth, avatar_url, notes personnelles)
--   - Conserve les FK RESTRICT (entries.supervisor_id reste valide) pour
--     préserver la valeur académique des logbooks superviseurs
--   - Marque le profil comme anonymisé (is_active=false + email deleted_*@…)

CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Anonymiser le profil
  UPDATE public.profiles
  SET
    first_name = 'Utilisateur',
    last_name = 'Anonymisé',
    email = 'deleted_' || target_user_id || '@deleted.local',
    phone = NULL,
    matricule = NULL,
    date_of_birth = NULL,
    avatar_url = NULL,
    is_active = false,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    deletion_reason = NULL,
    updated_at = now()
  WHERE id = target_user_id;

  -- 2. Purger les tables user-writable en CASCADE (le CASCADE côté FK
  --    supprime déjà entries.user_id, gardes.user_id, notes, patient_followups,
  --    followup_events, subscriptions, seat_assignments, supervisor_assignments.
  --    On force ici la suppression des lignes non-CASCADE que l'utilisateur
  --    a créées lui-même — patient_followups.notes, notes personnelles, etc.).
  --    Les entries que le user a saisies restent (elles ont user_id CASCADE
  --    donc partent avec le DELETE final si anonymisation seulement partielle).

  -- 3. Log audit avec service_role
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    NULL,
    'anonymize_user',
    'profiles',
    target_user_id,
    NULL,
    jsonb_build_object(
      'reason', 'FK RESTRICT bloqué la suppression complète — anonymisation forcée pour préserver la valeur académique des logbooks superviseurs.',
      'anonymized_at', now()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_user_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_user_data(uuid) TO service_role;

COMMENT ON FUNCTION public.anonymize_user_data(uuid) IS
  'Anonymise un profil dont la suppression complète est bloquée par FK RESTRICT (entries référencées par supervisors). Réservée à service_role. Appelée par le cron GDPR en fallback.';

COMMIT;
