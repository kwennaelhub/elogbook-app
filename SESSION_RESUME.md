# InternLog — Session Resume (2026-04-29)

> **À coller en début de nouvelle session pour reprendre InternLog au stade actuel.**
> Dernière mise à jour : 29/04/2026 après audit sécurité Session 16 + relecture Session 17 v2.2.

---

## 📍 État actuel

| Aspect | Valeur |
|---|---|
| Repo | `kwennaelhub/elogbook-app` (public, GitHub, branch `main` protégée) |
| URL prod | https://internlog.app |
| Stack | Next.js 16.2.2 + React 19 + Supabase + Tailwind v4 + shadcn/ui + Zod 4 |
| Supabase project | `nnoeiacqmjltpmokcmce` (E-Logbook CNHU, plan **Free** — DIY backup compense) |
| Vercel | `elogbook-v2` (Hobby plan, CI/CD GitHub Actions actif) |
| Architecture IA | App **v2.2** (P11 Backup&Recovery + C9 CDN/Edge + C10 Networking/DNS) |
| Constitution | `architectures/app/CLAUDE.md` v2.2 (29/04) |
| Score sécurité | **9/10** — 8,5/11 piliers v2.2 conformes |

## ✅ Livré récemment (Sessions 16 + 17)

### Sprint sécurité — 5 PR mergées

| PR | Sujet | Migration |
|---|---|---|
| #1 | RLS scope profiles (CRIT-4 PII exfiltration) | `00000000000006_tighten_profiles_select.sql` |
| #2 | PayPal webhook subscription FK (CRIT-2) | — |
| #3 | Sanitize PostgREST filter injection (CRIT-1) | — |
| #4 | deleteUser TOCTOU via FK RESTRICT (CRIT-3) | `00000000000007_explicit_fk_restrict_user_refs.sql` |
| #5 | CSP sans `unsafe-eval`/`unsafe-inline` (IMP-3) | — |
| #6 | v2.2 compliance — DR runbook + DIY backup workflow + audit gap | — |

### Docs ajoutées
- `docs/runbooks/disaster-recovery.md` — 5 scénarios + RPO ≤ 24h / RTO ≤ 4h
- `docs/v2.2-COMPLIANCE.md` — score 8,5/11 piliers, 12 actions priorisées
- `.github/workflows/db-backup.yml` — DIY backup quotidien chiffré GPG en GitHub Release

### Backups
- Première Release `backup-2026-04-29_13h42` (44K chiffré, SHA `ee06f30e...`)
- Cron `2 2 * * *` UTC actif sur GitHub Actions

## 🚦 Backlog priorisé (16 items actifs)

### A — Bloquant pour conformité légale prod publique

1. **Endpoints RGPD self-service** (3-4 h) — Article 17/20 GDPR
   - `/api/user/export` (portabilité data)
   - `/api/account/delete` (effacement)
   - `feedback_app_v22_compliance_pattern.md` § endpoints RGPD

### B — Bloquant pour test trimestriel disaster recovery (premier 2026-07-26)

2. **`brew install gnupg`** local (5 min) puis test restauration (1 h)
3. **Snapshot DNS OVH** + export `.env.production` chiffré GPG (30 min)
4. **TTL DNS apex à 300s** sur OVH (5 min)

### C — Sprint sécurité Session 16 (IMP/REC, 12-14 h total)

5. **IMP-1** xlsx → exceljs (2 vulns HIGH + 1 MOD sans fix) — 2 h
6. **IMP-2** Zod sur 7 server actions (data, analytics, feedback, followups, notes, role-dashboard, sessions) — 3-4 h
7. **IMP-4** Types Supabase générés (`supabase gen types`) + retirer 18 `as unknown as` — 1-2 h
8. **IMP-5** RPC monthly stats (N+1 dashboard, `getDashboardStats:565`) — 1 h
9. **IMP-6** Mapper erreurs PG en codes i18n — 2 h
10. **IMP-7** Templates email externalisés (`src/lib/email/templates/`) — 2 h
11. **REC-1** Split `data.ts` (664 lignes) en vertical slices — 1-2 h
12. **REC-2/3** Unifier `requireHospitalAdminOrGlobal` — 30 min
13. **REC-4** Batch insert DES registry — 30 min
14. **REC-5** MFA 2FA Supabase — 2-3 h

### D — Infra v2.2 backlog Session 17

15. **Versioning buckets Supabase Storage** (avatars, hospital-logos) — 30 min
16. **Migration rate limiting in-memory → Upstash Redis** (cassé en serverless multi-instance) — 2 h

### E — Reporté

- ⏸ PITR Supabase → reporté au passage Pro ($25/mois)
- ⏸ PWA stores iOS ($99/an) + Android ($25 one-shot) via PWABuilder

## 🔑 Comptes test actifs

| Email | MDP | Rôle | Hôpital |
|---|---|---|---|
| `test@elogbook.bj` | `Test2026!` | developer | NULL (admin global) |
| `pr.adjagba@elogbook.bj` | `LogChir2026!YE09` | institution_admin | CNHU-HKM |
| `kwennaelfagnon@gmail.com` | (changé, vérifier) | supervisor | CNHU-HKM |
| `fkethyj5@gmail.com` | (compte propriétaire) | developer | NULL |

⚠️ **Pour audit RLS** : créer un compte test dédié à chaque sprint via `auth.admin.createUser` (service_role) puis cleanup en fin. Ne pas réutiliser les MDP user mémorisés (peuvent rotater).

## 📚 Mémoire à charger en nouvelle session

### Architecture App
- `architectures/app/CLAUDE.md` v2.2
- `architectures/app/rules/security.md`
- `architectures/app/rules/checklist-deploy.md`
- `architectures/app/rules/constraints.md` (C9 + C10)
- `architectures/app/MEMORY/INDEX.md`

### Learnings critiques (`architectures/app/MEMORY/learnings/`)
- `L-APP-008-usestate-revalidatepath.md` — useState bug
- `L-APP-011-circuit-breaker-pattern.md`
- `L-APP-013-rls-recursion-security-definer.md` ⭐
- `L-APP-014-toctou-fk-restrict-pattern.md` ⭐
- `L-APP-015-postgrest-filter-injection.md` ⭐

### Memory project (`~/.claude/projects/-Users-kethzfagnon-Documents/memory/`)
- `project_logchir.md` (Sessions 1 → 17)
- `feedback_nextjs_supabase_app.md` (RA-31/32/33/34, RP-31/32/33/34/35, RT-02)
- `feedback_app_v22_compliance_pattern.md` ⭐ pattern réplicable toute future app SaaS
- `feedback_secret_extraction_eval_bug.md` (incident shell scrollback)
- `feedback_github_actions_kgn.md` (5 patterns CI/CD)

## ⚙️ Commandes de reprise rapide

```bash
# 1. Cloner / rentrer dans le repo
cd ~/Documents/projets/elogbook-app
git fetch && git pull origin main

# 2. Vérifier l'état CI/CD
npx vercel ls | head -3
gh run list --limit 5  # si gh installé

# 3. Vérifier les secrets locaux (sans dump env)
test -f .env.local && grep -c "^[A-Z_]*=" .env.local
# Doit retourner ~20+ lignes

# 4. Lancer dev server
npm run dev

# 5. Type-check + lint
npx tsc --noEmit
npm run lint

# 6. Tests e2e
npx playwright test

# 7. Vérifier état RLS post-migrations 6+7
# (à exécuter dans Supabase SQL Editor)
# SELECT policyname, cmd FROM pg_policies WHERE tablename='profiles';
# → doit lister profiles_contextual_read + profiles_own + profiles_admin_view + profiles_supervisor_view
# → ne doit PAS lister "Authenticated users can read profiles"
```

## 🚨 Actions personnelles encore en attente

### Côté utilisateur (Jean)

- [ ] **Rotation secrets exposés** dans le scrollback Session 16 (45 min)
  - GITHUB_MCP_TOKEN, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD
  - OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
  - FTP_KGN_PASS, FTP_LATOUCHE_PASS
  - HUBSPOT, NOTION, BREVO, RESEND, OVH_*
  - `feedback_secret_extraction_eval_bug.md` documente le bug
- [ ] **`brew install gnupg`** pour débloquer test restauration trimestriel
- [ ] Vider scrollback terminal Session 16 si pas déjà fait

### Côté code (à programmer en nouvelle session)

- Voir backlog A → D ci-dessus, ordre suggéré : **A1 (RGPD endpoints) → C8 (IMP-5 N+1) → B2-3-4 (DR setup) → C5 (xlsx)**.

## 💡 Patterns à respecter (extraits clés)

- **RA-31/RP-31** : Toute policy RLS auto-référente → `SECURITY DEFINER STABLE SET search_path=public` + `REVOKE FROM PUBLIC` + `GRANT EXECUTE TO authenticated`
- **RA-33** : Pré-checks FK avant DELETE = TOCTOU, préférer `ON DELETE RESTRICT` + catch SQLSTATE 23503
- **RA-34** : Si tâtonnement navigateur > 2 retries → bascule terminal T+5 min
- **RT-02** : Login API Supabase direct (`/auth/v1/token?grant_type=password`) pour exploit côté user, jamais chasser le JWT navigateur
- **RP-33** : Test exploit AVANT + APRÈS fix avec compte test dédié, jamais MDP user mémorisé
- **RP-34** : `VAR=$(grep "^KEY=" .env.local | cut -d'=' -f2-)` variable par variable, jamais `export $(grep | xargs)`
- **RP-35** : Sprint sécu = 1 PR par finding + migration séparée + test reproduisant exploit + rollback documenté

---

## 🎯 Prompt suggéré pour ouvrir nouvelle session

```
Reprendre InternLog au stade post-Session 17 (29/04/2026).

Charge :
- Le fichier SESSION_RESUME.md à la racine du repo
- Constitution architecture App v2.2 : architectures/app/CLAUDE.md
- feedback_nextjs_supabase_app.md (RA-31 à 34, RP-31 à 35, RT-02)
- feedback_app_v22_compliance_pattern.md
- project_logchir.md (Sessions 16 + 17)

Score sécurité actuel 9/10 (8,5/11 v2.2). 6 PR mergées. 16 items actifs au backlog.

Action prioritaire : [PRÉCISER — par exemple "endpoints RGPD" ou "IMP-5 N+1 dashboard"]
```
