# RGPD — Endpoints self-service (Art. 17 + Art. 20)

> Runbook opérationnel. Correspond au sprint A1 du backlog Session 17.
> Migration `00000000000008_gdpr_deletion_grace.sql`.

---

## 1. Contexte légal

- **Art. 17 RGPD — Droit à l'effacement** : tout utilisateur peut demander la
  suppression de ses données personnelles sans passer par un administrateur.
- **Art. 20 RGPD — Droit à la portabilité** : tout utilisateur peut récupérer
  une copie de ses données dans un format structuré et lisible par machine.

Ces obligations s'appliquent à InternLog dès qu'un utilisateur est enregistré.
L'app était non conforme jusqu'à Session 17 (seul l'admin pouvait supprimer).

## 2. Architecture

```
POST /api/user/export       →  ZIP JSON dans bucket privé gdpr-exports
                                + signed URL 24h + email Brevo
                                + audit_log(action=gdpr_export)

POST /api/account/delete    →  ré-auth password
                                + set deletion_requested_at + scheduled_for(+30j)
                                + signOut + email Brevo
                                + audit_log(action=gdpr_delete_requested)

POST /api/account/delete/cancel
                            →  clear deletion_* + audit_log(gdpr_delete_cancelled)

Middleware (app)/layout.tsx →  redirect /account/deletion-pending si sursis actif

Cron .github/workflows/gdpr-purge.yml (03:30 UTC quotidien)
                            →  list_pending_deletions() RPC
                                → auth.admin.deleteUser() par user
                                → fallback anonymize_user_data() si 23503 FK
                                → purge fichiers export > 7 jours
```

## 3. Prérequis Supabase (à faire une fois)

### Bucket Storage

Créer le bucket `gdpr-exports` **privé** :

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('gdpr-exports', 'gdpr-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Aucune policy authenticated — seul le service_role peut lire/écrire.
```

### Migration

```bash
supabase db push  # applique 00000000000008_gdpr_deletion_grace.sql
```

Vérifier que les fonctions sont bien SECURITY DEFINER + REVOKE :

```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('auth_user_deletion_pending', 'list_pending_deletions', 'anonymize_user_data');
-- prosecdef doit être true partout
```

## 4. Secrets GitHub Actions

Le workflow `gdpr-purge.yml` a besoin de :

- `NEXT_PUBLIC_SUPABASE_URL` (déjà présent pour `db-backup.yml`)
- `SUPABASE_SERVICE_ROLE_KEY` (déjà présent)
- `SENTRY_DSN` (optionnel — notification si échec)

## 5. Grace period 30 jours — pourquoi

Standard sectoriel (Google, Meta, GitHub) : donne à l'utilisateur une fenêtre
pour se rétracter s'il change d'avis ou si un attaquant a déclenché la
suppression.

Pendant le sursis :
- Le user peut se reconnecter, mais la redirection le pousse vers
  `/account/deletion-pending`.
- Toutes les mutations sur `entries`, `gardes`, `notes`, `patient_followups`,
  `feedback`, `profiles` sont bloquées par des policies RLS RESTRICTIVE
  s'appuyant sur `auth_user_deletion_pending()`.
- L'export reste possible.
- L'annulation est possible sans ré-auth (un attaquant qui aurait volé la
  session ne gagne rien à l'annuler).

## 6. Anonymisation forcée — pourquoi

Migration 7 a rendu explicites les FK `ON DELETE RESTRICT` sur
`entries.supervisor_id`, `entries.validated_by`, `audit_log.user_id`,
`feedback.user_id`, `gardes.senior_id`, `templates.created_by`.

Un DES qui a validé des interventions en tant qu'opérateur mais qui a
également été superviseur/senior/validateur sur d'autres interventions ne
peut PAS être supprimé sans casser les logbooks des autres DES.

Fallback : `anonymize_user_data(uuid)` nettoie les PII du profil (nom, email,
phone, matricule, date_of_birth, avatar) et le marque anonymisé. Les FK
restent valides — la valeur académique des logbooks est préservée. Le
`audit_log` mentionne explicitement que la suppression complète a été
convertie en anonymisation pour cause de FK RESTRICT.

## 7. Rate limiting

- **Export** : 3 exports par 24 heures par user (compté via `audit_log`).
  Empêche un DoS storage.
- **Delete** : pas de rate-limit dur (la ré-auth password + le status 409
  "alreadyPending" servent de garde-fou). Un attaquant qui spam la route
  sans le bon password ne fait qu'échouer en 401.

## 8. Cas particuliers

### Subscription PayPal active
Le delete est bloqué avec 409 + message `gdpr.error.activeSubscription`.
L'utilisateur doit annuler son abonnement depuis Paramètres → Abonnement
avant de pouvoir demander la suppression.

### Compte déjà en cours de suppression
Le delete renvoie 409 `gdpr.error.alreadyPending`. L'utilisateur doit passer
par `/account/deletion-pending` (redirection auto) pour annuler ou attendre
l'échéance.

### Compte developer/superadmin
Ces rôles ne peuvent PAS utiliser le flow self-service (protection déjà en
place dans `admin.deleteUser` — le cron l'appelle indirectement). Un
`developer` qui déclenche la suppression finira en 500 côté cron avec
`admin.error.cannotDeleteDeveloper`. Le sursis reste marqué et il faut
intervenir manuellement via un superadmin.

## 9. Vérifications post-déploiement

```bash
# 1. Le bucket est-il privé ?
curl -s https://nnoeiacqmjltpmokcmce.supabase.co/storage/v1/object/public/gdpr-exports/foo \
  | grep -q "not found" && echo "OK privé" || echo "❌ EXPOSÉ"

# 2. La migration est-elle appliquée ?
psql "$SUPABASE_DB_URL" -c "\d public.profiles" | grep deletion_requested_at

# 3. Le cron est-il schedulé ?
gh workflow list | grep gdpr-purge
```

## 10. Test manuel de fumée

Depuis un compte test :

1. Se connecter → Paramètres → « Exporter mes données » → vérifier email reçu
   dans les 30 s + lien fonctionnel.
2. Cliquer « Supprimer mon compte » → saisir password + raison → confirmer.
3. Vérifier la déconnexion + réception de l'email « suppression enregistrée ».
4. Se reconnecter → redirection vers `/account/deletion-pending` avec
   countdown 30 jours.
5. Cliquer « Annuler ma demande » → retour à `/logbook` + email non prévu
   (pas d'email d'annulation actuellement — à ajouter si besoin).

## 11. Mentions légales — texte à ajouter

À insérer dans la page mentions légales (`src/app/legal/mentions/page.tsx`) :

> **Droits RGPD self-service.** Conformément aux articles 17 et 20 du RGPD,
> vous pouvez à tout moment exporter vos données personnelles ou demander
> leur effacement depuis vos paramètres de compte (Paramètres → Zone
> dangereuse). L'export est délivré au format JSON par email dans un délai
> maximum de 24 heures. La demande d'effacement est effective 30 jours
> après sa validation par mot de passe, délai pendant lequel vous pouvez
> l'annuler. Les données référencées par d'autres utilisateurs
> (interventions validées par un superviseur) sont anonymisées plutôt que
> supprimées, afin de préserver l'intégrité académique des logbooks tiers.
> Pour toute question, contactez `contact@internlog.app`.

## 12. Rollback

Si l'une des routes est cassée en prod :

```bash
# 1. Revert du merge sur main
git revert -m 1 <merge-commit-sha>
git push origin main
# → Vercel redéploie automatiquement en < 3 min

# 2. Désactiver le cron (n'annule PAS la migration)
gh workflow disable gdpr-purge.yml
```

La migration 8 est *forward-only safe* : les colonnes ajoutées sont NULL
par défaut donc n'impactent aucun code existant. Les policies RESTRICTIVE
ajoutées ne bloquent RIEN tant qu'aucun user n'a `deletion_requested_at`
set. Pas besoin de rollback SQL sauf incident majeur.

Si rollback SQL nécessaire :

```sql
BEGIN;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_entries" ON public.entries;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_gardes" ON public.gardes;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_notes" ON public.notes;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_patient_followups" ON public.patient_followups;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_feedback" ON public.feedback;
DROP POLICY IF EXISTS "block_writes_during_deletion_pending_profiles" ON public.profiles;

DROP FUNCTION IF EXISTS public.auth_user_deletion_pending();
DROP FUNCTION IF EXISTS public.list_pending_deletions();
DROP FUNCTION IF EXISTS public.anonymize_user_data(uuid);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS deletion_requested_at,
  DROP COLUMN IF EXISTS deletion_reason,
  DROP COLUMN IF EXISTS deletion_scheduled_for;

DROP INDEX IF EXISTS profiles_deletion_pending_idx;
COMMIT;
```

---

**Owner :** @kwennaelhub  
**Créé :** 2026-08-04 (Session 18, sprint RGPD A1)  
**Score compliance v2.2 après merge :** 9,5/11 piliers (le pilier P6 Data & Migrations passe de 0,5 à 1).
