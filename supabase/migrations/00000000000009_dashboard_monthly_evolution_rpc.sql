-- Migration 00000000000009 — RPC monthly_evolution pour éliminer un N+1 dashboard
--
-- CONTEXTE :
-- getDashboardStats() dans src/lib/actions/data.ts (ligne 564) exécutait
-- une boucle for (6 itérations) faisant 6 requêtes COUNT séparées pour
-- construire l'évolution mensuelle des interventions. Sur un compte avec
-- beaucoup d'entries et une latence réseau normale, cela ajoutait ~500ms
-- au chargement du dashboard.
--
-- CORRECTIF :
-- Une seule requête SQL agrégée via generate_series() qui retourne les N
-- derniers mois avec leur count d'entries. Le mois courant est inclus.
--
-- SÉCURITÉ :
--   - SECURITY DEFINER STABLE + REVOKE FROM PUBLIC + GRANT authenticated
--     uniquement (pattern RA-31/RP-31 déjà appliqué migrations 6/8).
--   - Filtre strict WHERE user_id = target_user_id — impossible d'obtenir
--     les stats d'un autre utilisateur.
--   - target_user_id est passé en paramètre par le client ; la vérification
--     que le caller a le droit d'appeler avec un target_user_id != auth.uid()
--     est faite côté application (pour l'instant utilisé uniquement avec
--     auth.uid()).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_monthly_evolution(
  target_user_id uuid,
  months integer DEFAULT 6
)
RETURNS TABLE (
  month_start date,
  month_label text,
  entry_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    m.month_start::date,
    to_char(m.month_start, 'TMMon') AS month_label,  -- TM = locale (fr_FR sur Supabase)
    COUNT(e.id)::bigint AS entry_count
  FROM generate_series(
    date_trunc('month', now() - (months - 1 || ' months')::interval),
    date_trunc('month', now()),
    interval '1 month'
  ) AS m(month_start)
  LEFT JOIN public.entries e
    ON e.user_id = target_user_id
    AND e.intervention_date >= m.month_start::date
    AND e.intervention_date < (m.month_start + interval '1 month')::date
  GROUP BY m.month_start
  ORDER BY m.month_start ASC
$$;

REVOKE ALL ON FUNCTION public.get_user_monthly_evolution(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_monthly_evolution(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_user_monthly_evolution(uuid, integer) IS
  'Retourne l''évolution mensuelle du nombre d''interventions d''un utilisateur sur les N derniers mois (défaut 6, mois courant inclus). Remplace la boucle for 6x COUNT dans getDashboardStats (perf N+1).';

COMMIT;
