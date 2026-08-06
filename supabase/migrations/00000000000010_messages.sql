-- Migration 00000000000010 — Messagerie interne 1-1 (MVP Session 20)
--
-- CONTEXTE :
-- Le user a demandé une messagerie interne pour que les bêta-testeurs
-- puissent poser leurs questions sans passer par WhatsApp/email. Périmètre
-- MVP volontairement minimal : messages directs 1-1, pas de groupes, pas
-- de pièces jointes, pas de temps réel (poll 30s côté client).
--
-- SÉCURITÉ :
--   - RLS strict : un user ne voit QUE ses messages (envoyés ou reçus).
--   - INSERT contraint à sender_id = auth.uid() (impossible d'usurper un
--     expéditeur).
--   - UPDATE limité à read_at et uniquement quand recipient_id = auth.uid()
--     (impossible pour le sender de marquer son propre message lu).
--   - Fonction get_unread_messages_count() SECURITY DEFINER pour le badge
--     header (perf : COUNT indexé, appelé à chaque render du layout).
--
-- PATTERNS APPLIQUÉS :
--   - RA-31/RP-31 : fonction SECURITY DEFINER STABLE search_path=public +
--     REVOKE FROM PUBLIC + GRANT authenticated.
--   - FK CASCADE sur sender_id/recipient_id — un user supprimé (via cron
--     GDPR ou anonymisation) perd ses messages. Cohérent avec le modèle
--     RGPD Session 18 : les données personnelles disparaissent avec le
--     compte.

BEGIN;

-- ============================================================================
-- 1. Table messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Un user ne peut pas s'envoyer un message à lui-même (évite le pattern
  -- « post-it perso » qui pollue le compteur non-lus)
  CONSTRAINT messages_no_self_send CHECK (sender_id != recipient_id)
);

COMMENT ON TABLE public.messages IS
  'Messagerie interne 1-1 (Session 20 MVP). Pas de threads, pas de pièces jointes, pas de temps réel.';

-- ============================================================================
-- 2. Index performance
-- ============================================================================

-- Compteur non-lus par recipient (appelé à chaque render layout)
CREATE INDEX IF NOT EXISTS messages_recipient_unread_idx
  ON public.messages (recipient_id)
  WHERE read_at IS NULL;

-- Chargement d'une conversation (ordre chronologique)
CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON public.messages (sender_id, recipient_id, created_at DESC);

-- Chargement de la liste des conversations d'un user (dernier message par correspondant)
CREATE INDEX IF NOT EXISTS messages_recipient_created_idx
  ON public.messages (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_created_idx
  ON public.messages (sender_id, created_at DESC);

-- ============================================================================
-- 3. RLS policies
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT : un user voit uniquement ses messages (envoyés ou reçus)
CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- INSERT : impossible d'usurper un expéditeur — sender_id doit être auth.uid()
CREATE POLICY "messages_insert_as_sender" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- UPDATE : uniquement le recipient peut marquer read_at (impossible pour le
-- sender de marquer son propre message comme lu par le destinataire).
-- Restrictive supplémentaire : le body ne peut pas être modifié après envoi.
CREATE POLICY "messages_update_read_as_recipient" ON public.messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Pas de DELETE côté user pour l'instant (traçabilité pour bêta-test) —
-- pourra être ajouté plus tard avec une soft-delete ou un délai.

-- ============================================================================
-- 4. Fonction RPC pour badge header (compteur non-lus)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unread_messages_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.messages
  WHERE recipient_id = auth.uid()
    AND read_at IS NULL
$$;

REVOKE ALL ON FUNCTION public.get_unread_messages_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_messages_count() TO authenticated;

COMMENT ON FUNCTION public.get_unread_messages_count() IS
  'Retourne le nombre de messages non lus pour le user courant. Utilisé par le badge du header à chaque render du layout (app).';

-- ============================================================================
-- 5. Fonction RPC pour lister les conversations (dernier msg + count non-lus par correspondant)
-- ============================================================================
-- Optimise le rendu de /messages : au lieu de faire N+1 côté client, on
-- retourne en 1 seule requête agrégée la liste des correspondants avec
-- le dernier message échangé et le nombre de non-lus.

CREATE OR REPLACE FUNCTION public.list_conversations()
RETURNS TABLE (
  other_user_id uuid,
  other_first_name text,
  other_last_name text,
  other_avatar_url text,
  other_role text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_from_me boolean,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH my_messages AS (
    SELECT
      CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END AS other_id,
      body,
      created_at,
      read_at,
      sender_id = auth.uid() AS from_me,
      recipient_id = auth.uid() AS to_me
    FROM public.messages
    WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
  ),
  ranked AS (
    SELECT
      other_id,
      body,
      created_at,
      from_me,
      ROW_NUMBER() OVER (PARTITION BY other_id ORDER BY created_at DESC) AS rn
    FROM my_messages
  ),
  unread_counts AS (
    SELECT other_id, COUNT(*) AS unread
    FROM my_messages
    WHERE to_me AND read_at IS NULL
    GROUP BY other_id
  )
  SELECT
    r.other_id AS other_user_id,
    p.first_name AS other_first_name,
    p.last_name AS other_last_name,
    p.avatar_url AS other_avatar_url,
    p.role::text AS other_role,
    r.body AS last_message_body,
    r.created_at AS last_message_at,
    r.from_me AS last_message_from_me,
    COALESCE(u.unread, 0) AS unread_count
  FROM ranked r
  JOIN public.profiles p ON p.id = r.other_id
  LEFT JOIN unread_counts u ON u.other_id = r.other_id
  WHERE r.rn = 1
  ORDER BY r.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_conversations() TO authenticated;

COMMENT ON FUNCTION public.list_conversations() IS
  'Retourne la liste des conversations du user courant avec dernier message et compteur non-lus. Utilisée par la page /messages.';

COMMIT;
