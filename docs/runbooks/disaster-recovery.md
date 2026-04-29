# Disaster Recovery Plan — InternLog

> Plan de continuité d'activité (PCA) et reprise après incident pour InternLog.
> Conforme **Pilier P11 Backup & Recovery-Ready** de l'architecture IA App v2.2.
> Version 1.0 — 26/04/2026

---

## Objectifs de service

| Métrique | Cible | Moyen |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 24h | Backups quotidiens automatiques Supabase + PITR 7j |
| **RTO** (Recovery Time Objective) | ≤ 4h | Restauration via dashboard + DNS bascule |
| **Disponibilité cible** | 99,5% | Vercel + Supabase multi-AZ (Pro plan minimum) |

---

## Périmètre couvert

| Composant | Hébergeur | Backup | Criticité |
|---|---|---|---|
| **Base de données PostgreSQL** | Supabase (project `nnoeiacqmjltpmokcmce`) | Auto Pro plan + PITR | CRITIQUE |
| **Auth users** | Supabase Auth | Inclus dans backup DB | CRITIQUE |
| **Storage (avatars, hospital-logos)** | Supabase Storage | Versioning bucket à activer | IMPORTANT |
| **Code applicatif** | GitHub `kwennaelhub/elogbook-app` | Repo public + tags releases | IMPORTANT |
| **Variables d'environnement** | Vercel project `elogbook-v2` | Export `.env.production` chiffré local | CRITIQUE |
| **DNS** | OVH (`internlog.app`) | Snapshot zone DNS export trimestriel | IMPORTANT |
| **Secrets PayPal Live** | PayPal Business `ceo@kefanetworkgroup.com` | Compte propriétaire Jean | CRITIQUE |
| **DKIM/SPF/DMARC Brevo** | OVH DNS | Inclus dans snapshot DNS | NORMAL |

---

## Contacts d'urgence

| Rôle | Contact | Disponibilité |
|---|---|---|
| **Propriétaire app** | Jean Fagnon — `ceo@kefanetworkgroup.com` / 07 83 70 14 81 | 24/7 |
| **Support Supabase** | https://supabase.com/dashboard/support · Pro plan = email priority | 24/7 (Pro) |
| **Support Vercel** | https://vercel.com/help · Hobby = community only | best effort |
| **Support OVH (DNS)** | 1007 (depuis France) · ticket espace client | 24/7 |
| **PayPal Merchant Support** | 0805 980 521 (FR) · `ceo@kefanetworkgroup.com` | heures bureau |
| **Brevo Support** | https://help.brevo.com · ticket | heures bureau |

---

## Scénario 1 — Corruption ou suppression accidentelle de données

**Symptôme :** un user signale données disparues, ou DELETE sans WHERE détecté dans les logs.

### Étapes (RTO cible : 1h)

1. **GELER les écritures** — désactiver temporairement l'app via Vercel :
   ```bash
   cd /Users/kethzfagnon/Documents/projets/elogbook-app
   npx vercel env add MAINTENANCE_MODE production
   # Valeur : true → middleware retourne 503 sur toutes les routes /api/*
   npx vercel deploy --prebuilt --prod
   ```

2. **Identifier le timestamp T avant corruption** :
   - Consulter `audit_log` table : `SELECT * FROM audit_log WHERE table_name = 'X' ORDER BY created_at DESC LIMIT 50`
   - Repérer la dernière action légitime → timestamp T

3. **Restaurer via PITR Supabase** (Pro plan requis) :
   - Dashboard Supabase → Project → Database → Backups → Point in Time Recovery
   - Sélectionner T-1min
   - Restauration sur un **nouveau projet** (jamais sur le projet live directement)
   - Attente : 5-15min selon taille DB

4. **Extraire les tables impactées** depuis le projet restauré :
   ```bash
   # Via Supabase CLI sur le projet restauré
   supabase db dump --schema public --data-only --table profiles --file restore-profiles.sql
   ```

5. **Réinjecter les données manquantes** sur le projet live :
   - Comparer les rows manquantes (PK diff)
   - INSERT uniquement les rows perdues, pas full replace
   - Toujours via transaction : `BEGIN; ... ; COMMIT;`

6. **Lever la maintenance** :
   ```bash
   npx vercel env rm MAINTENANCE_MODE production
   npx vercel deploy --prebuilt --prod
   ```

7. **Communication users** : email Brevo aux affectés + post status page si > 50 users impactés

---

## Scénario 2 — Région Supabase HS (datacenter down)

**Symptôme :** dashboard Supabase inaccessible, app retourne `connection refused` sur toutes les queries.

### Étapes (RTO cible : 4h)

1. **Vérifier le statut officiel** : https://status.supabase.com/
2. **Attendre** si incident < 1h annoncé (le rebuild d'une réplique est plus long que la réparation)
3. **Si > 2h annoncées**, basculer sur le projet de secours :
   - Pré-requis : avoir un projet Supabase secondaire en région différente avec restauration la plus récente disponible (à provisionner en avance)
   - Procédure de bascule :
     ```bash
     # Mettre à jour les env vars Vercel
     npx vercel env rm NEXT_PUBLIC_SUPABASE_URL production
     npx vercel env add NEXT_PUBLIC_SUPABASE_URL production  # nouvelle URL secours
     npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
     npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
     npx vercel env rm SUPABASE_SERVICE_ROLE_KEY production
     npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
     # Redéployer
     npx vercel deploy --prebuilt --prod
     ```
4. **Communication users** : bannière app + email Brevo + post LinkedIn

---

## Scénario 3 — Vercel down ou compte suspendu

**Symptôme :** `internlog.app` retourne 502/503 sur toute l'app.

### Étapes (RTO cible : 6h)

1. **Vérifier statut** : https://www.vercel-status.com/
2. **Si > 4h**, déployer sur Railway/Fly.io en secours :
   - Repo GitHub déjà public et reproductible
   - `railway up` ou `fly deploy` après config rapide
   - **Bascule DNS** : mettre à jour les records `A`/`CNAME` sur OVH vers la nouvelle URL
   - TTL bas (300s) à pré-positionner sur OVH **avant tout incident** pour permettre une bascule rapide

---

## Scénario 4 — Compte développeur compromis (rotation de secrets)

**Symptôme :** secrets fuités (ex: scrollback terminal Session 16 — incident documenté).

### Étapes (RTO cible : 2h)

Rotation **dans cet ordre de priorité** :

1. **GitHub PAT** (`GITHUB_MCP_TOKEN`) — risque exfiltration code
   - https://github.com/settings/tokens → Revoke + créer nouveau
2. **Supabase** — risque accès DB
   - Dashboard → Project Settings → API → Reset Service Role Key
   - Mettre à jour Vercel env vars + redéployer
3. **PayPal Live** — risque détournement paiements
   - Dashboard → Apps & Credentials → Régénérer Client Secret
4. **OpenAI/Anthropic/autres LLM keys** — risque facturation
   - Régénérer chaque clé + mettre à jour `.env.local`
5. **Brevo** — risque envoi spam
   - Régénérer API key v3
6. **OVH FTP** (KGN, Latouche) — risque modification sites
   - Espace client → modifier mots de passe FTP

**Toujours** : commit avec rotation atomique, pas de mix de pré/post-rotation.

---

## Scénario 5 — Demande RGPD utilisateur (export ou suppression)

### Export (Article 20 — droit à la portabilité)

L'utilisateur fait sa demande via l'app (`/account/export`). Si endpoint indisponible :

```bash
# Export manuel via Supabase CLI
supabase db dump \
  --table profiles --table entries --table gardes --table notes --table feedback \
  --where "user_id = 'UUID_DU_USER'" \
  --file export-user-UUID.json
```

Envoyer par email chiffré sous 30 jours max (RGPD Art. 12).

### Suppression (Article 17 — droit à l'effacement)

L'utilisateur clique "Supprimer mon compte" → `deleteUser()` (`src/lib/actions/admin/users.ts:131`).
Hard delete déclenché : 11 FK ON DELETE RESTRICT migration `00000000000007` → cascade contrôlée.

**Délai backups** : les rows sont retirées des backups après le délai de rétention Supabase (30j Pro plan). Documenter ce délai dans la politique de confidentialité.

---

## Tests de restauration trimestriels

> Sans test, le backup est théorique. Cocher cette procédure tous les 3 mois.

### Calendrier

| Date prévue | Date effective | Validé par | Durée constatée | Notes |
|---|---|---|---|---|
| 2026-07-26 | — | — | — | **Premier test post-mise en place** · pré-requis bloquant : installer GPG localement (`brew install gnupg` ou GPG Suite — non installé au 26/04). Test workflow CI validé (run #5 : pg_dump 17.9, 4374 lignes, AES256, Release `backup-2026-04-29_13h42`, SHA `ee06f30e...`) MAIS test déchiffrement local **différé** |
| 2026-10-26 | — | — | — | — |
| 2027-01-26 | — | — | — | — |
| 2027-04-26 | — | — | — | — |

### Procédure de test

1. Créer un projet Supabase **temporaire** (gratuit, sera supprimé)
2. Restaurer le backup le plus récent du projet prod sur ce projet temporaire
3. Vérifier :
   - [ ] Tables présentes : `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'` → ≥ 23
   - [ ] Données présentes : `SELECT count(*) FROM profiles, entries, gardes` → cohérent avec prod
   - [ ] RLS actif : `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true` → toutes les tables
   - [ ] Fonctions SECURITY DEFINER restaurées : `auth_user_home_hospital()` callable
4. Mesurer **RTO réel** : timestamp début → timestamp accès DB OK
5. Documenter dans le tableau ci-dessus + GitHub issue dédiée
6. Supprimer le projet temporaire

---

## Mode pré-lancement (Supabase Free + DIY) — actuel jusqu'au lancement

> **Statut au 26/04/2026 : InternLog est sur Supabase Free.** Pas de backup managé ni PITR natif.
> Stratégie compensatoire : `pg_dump` quotidien automatisé via GitHub Actions, chiffré GPG, stocké en GitHub Release privée. RPO ~24h, RTO ~2-4h.

### Trigger d'upgrade vers Supabase Pro ($25/mois)

Activer Pro **dès l'un de ces déclencheurs** :
- [ ] Première transaction PayPal Live encaissée (paiement utilisateur réel)
- [ ] > 50 utilisateurs actifs (DAU) dépassés
- [ ] Soft-launch public (annonce LinkedIn + premier hôpital signataire)
- [ ] Ajout d'un deuxième institution_admin externe (CNHU + autre hôpital)

Au passage Pro :
1. **Désactiver** le workflow `.github/workflows/db-backup.yml` (commenter `on.schedule`) — Supabase fera les backups auto
2. Activer PITR dans dashboard Supabase
3. Mettre à jour ce document (sortir cette section)
4. Tester immédiatement la restauration via Supabase native (Procédure scénarios 1-2 ci-dessus)

### Workflow GitHub Actions actuel

- Fichier : `.github/workflows/db-backup.yml`
- Cron : `2 2 * * *` (2h02 UTC quotidien)
- Output : GitHub Release privée `backup-YYYY-MM-DD_HHhMM` avec asset `internlog_*.sql.gz.gpg`
- Rétention : 30 derniers backups (cleanup automatique)
- Secrets requis :
  - `SUPABASE_DB_PASSWORD` (mot de passe DB Supabase)
  - `BACKUP_GPG_PASSPHRASE` (passphrase forte stockée hors-ligne)

### Procédure de restauration (mode DIY)

```bash
# 1. Lister les backups disponibles
gh release list --limit 30 | grep backup-

# 2. Télécharger un backup spécifique
gh release download backup-2026-04-27_02h02 --repo kwennaelhub/elogbook-app -p "*.gpg"

# 3. Déchiffrer (passphrase prompt)
gpg -d internlog_*.sql.gz.gpg | gunzip > restore.sql

# 4. Vérifier le contenu
head -50 restore.sql
grep -c "INSERT INTO" restore.sql

# 5. Importer dans un projet Supabase de secours (jamais sur le projet live tant que la cause de l'incident n'est pas résolue)
# Créer un nouveau projet Supabase temporaire (Free OK pour test)
psql "postgresql://postgres.NEW_REF:NEW_PASS@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" < restore.sql

# 6. Vérifier l'intégrité
psql "<...>" -c "SELECT count(*) FROM profiles, entries, gardes;"

# 7. Si OK, basculer les env vars Vercel vers le projet temporaire (cf. Scénario 2)
# 8. Une fois le projet original réparé, faire la bascule retour
```

### Limites connues du mode DIY

| Limite | Impact | Mitigation |
|---|---|---|
| RPO 24h vs < 1h Pro | Perte max 24h de données | Acceptable en pré-lancement avec peu d'écritures |
| Pas de restauration à la minute | Ne peut pas remonter à T-5min précis | Dump à 2h UTC = pic d'inactivité, faible impact |
| Schémas `auth.*` exclus du dump | Auth users non sauvegardés | Limitation Supabase Free : `auth.users` non accessible via pg_dump pooler. Compenser via export manuel `supabase auth export` trimestriel |
| Restauration manuelle | RTO 2-4h vs 15-30min Pro | Tester procédure trimestriellement |
| Stockage GitHub | Limite 2 Go par release, 100 Go total repo | OK pour DB < 1 Go, alerte si dépassement |

### ⚠️ Limitation critique du mode DIY : auth.users

Le pooler Supabase ne donne pas accès en lecture au schéma `auth` via `pg_dump`. **Les utilisateurs Auth ne sont pas dans le backup automatique.**

**Mitigation manuelle trimestrielle** (à exécuter le 1er du mois) :
```bash
# Export auth users via API admin
curl -s -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  "https://nnoeiacqmjltpmokcmce.supabase.co/auth/v1/admin/users?per_page=1000" \
  > auth-users-$(date +%Y-%m-%d).json
gpg -c auth-users-*.json
# Stocker hors ligne (1Password, coffre OVH)
```

En cas d'incident en mode DIY : les profils existent dans la DB restaurée, mais les users devront **réinitialiser leur mot de passe** via flow forgot-password (Brevo email envoyé). Pas idéal mais tenable jusqu'au passage Pro.

---

## Pré-requis à valider AVANT incident

- [ ] **Supabase Pro plan** (≥ $25/mois) — sinon pas de PITR ni de backups persistants
- [ ] **Vercel Pro plan** ($20/mois) — sinon timeouts serverless 10s + pas de log retention
- [ ] **Snapshot DNS OVH** exporté trimestriellement → `backups/dns-internlog-app-YYYY-MM.txt`
- [ ] **Export `.env.production`** chiffré localement via `vercel env pull && gpg -c .env.production`
- [ ] **TTL DNS A/CNAME apex** = 300s (5min) pour permettre bascule rapide
- [ ] **Status page** publique (UptimeRobot ou Better Stack) pour communication transparente
- [ ] **Compte secondaire developer** existe (au cas où Jean's compte verrouillé)

---

## Communication incident — template

### Email Brevo (template ID à créer)

```
Sujet : InternLog — incident en cours · ETA résolution

Bonjour {{firstName}},

Nous rencontrons actuellement un incident technique impactant {{scope}}.

État : {{status}}
Début : {{startTime}}
ETA résolution : {{eta}}

Vos données sont en sécurité. {{specific_action_user_should_take}}

Suivi en temps réel : https://status.internlog.app

Toutes nos excuses pour la gêne occasionnée.
L'équipe InternLog
```

### Post-mortem template

À publier dans `docs/postmortems/YYYY-MM-DD-titre.md` après chaque incident > 1h :
1. Résumé (1 paragraphe)
2. Timeline (heure par heure)
3. Cause racine
4. Impact (nombre users, durée, données perdues)
5. Actions correctives immédiates
6. Actions correctives long terme (avec owner + date cible)

---

## Versioning

| Version | Date | Changement |
|---|---|---|
| 1.0 | 26/04/2026 | Création initiale — application Pilier P11 v2.2 architecture IA App |
