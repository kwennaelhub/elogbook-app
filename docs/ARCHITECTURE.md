# Architecture — InternLog

> Document technique decrivant l'architecture de l'application InternLog.
> Derniere mise a jour : 17 avril 2026.

## Vue d'ensemble

InternLog est une **Progressive Web App (PWA)** construite avec Next.js 16 (App Router) et Supabase. L'application suit une architecture **Server-first** : les donnees sont fetchees cote serveur via Server Actions, et les composants clients ne gèrent que l'interactivite.

```
┌─────────────────────────────────────────────────┐
│                    Client                        │
│  React 19 · Tailwind 4 · shadcn/ui · Recharts   │
│  Service Worker (offline) · PWA manifest         │
└──────────────────────┬──────────────────────────┘
                       │ Server Actions / API Routes
┌──────────────────────▼──────────────────────────┐
│              Next.js 16 (Vercel)                 │
│  Middleware (auth) · Rate Limiter · Circuit       │
│  Breaker · Error Handler · Pino Logger · Sentry  │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Supabase │ │  PayPal  │ │  Brevo   │
    │ Postgres │ │ REST API │ │ Email    │
    │ Auth+RLS │ │ Webhooks │ │ API v3   │
    │ Storage  │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

## Principes architecturaux

### 1. Server Actions comme couche metier

Toute la logique metier reside dans `src/lib/actions/`. Chaque fichier est marque `'use server'` et exporte des fonctions async appelees directement depuis les composants React.

```
src/lib/actions/
├── analytics.ts    # Heatmap, streaks, institution stats, peer comparison
├── auth.ts         # Login, register, session management
├── config.ts       # Configuration admin (hopitaux, specialites)
├── data.ts         # Dashboard stats, export
├── entries.ts      # CRUD interventions chirurgicales
├── feedback.ts     # Retours utilisateurs
├── followups.ts    # Suivi patients post-operatoire
├── gardes.ts       # Gestion des gardes
├── helpers.ts      # Utilitaires partages
├── index.ts        # Re-exports
├── notes.ts        # Notes personnelles
├── referential.ts  # Referentiels (procedures, techniques)
├── seats.ts        # Gestion postes institutionnels
├── sessions.ts     # Sessions actives
└── users.ts        # Gestion utilisateurs admin
```

### 2. Separation Client / Server

Les composants suivent une convention stricte :

- **Page (`page.tsx`)** : Server Component — fetch les donnees, passe les props
- **Content (`*-content.tsx`)** : Client Component — gere l'interactivite (hooks, state)
- **Charts / Widgets** : Client Components — Recharts, formulaires

```tsx
// page.tsx (Server)
export default async function DashboardPage() {
  const [stats, analytics] = await Promise.all([
    getDashboardStats(),
    getAnalyticsStats(),
  ])
  return <DashboardContent stats={stats} analyticsStats={analytics} />
}

// dashboard-content.tsx (Client)
'use client'
export function DashboardContent({ stats, analyticsStats }) { ... }
```

### 3. Securite en couches

```
Requete HTTP
  │
  ├─► Middleware Supabase (auth token)
  ├─► Rate Limiter (IP-based, configurable par route)
  ├─► Circuit Breaker (coupe les appels si service down)
  ├─► Server Action → RLS Supabase (row-level security)
  ├─► Validation Zod (schemas stricts)
  └─► Error Handler (@ControllerAdvice pattern)
```

**Rate limits :**
| Route | Limite |
|-------|--------|
| Auth POST | 10/min |
| Lookup | 15/min |
| Adhesion | 5/10min |
| Email | 5/min |

### 4. Roles et permissions

| Role | Acces |
|------|-------|
| `student` | Ses propres donnees uniquement |
| `supervisor` | Validation des actes de ses etudiants |
| `admin` | Gestion des utilisateurs, stats etablissement |
| `superadmin` | Tout acces |
| `developer` | Tout acces + debug |

La verification se fait dans chaque Server Action via `requireAdmin()` ou verification manuelle du role dans `profiles`.

## Base de donnees

### Schema Supabase (23 tables)

```
profiles ──────────┐
  │                 │
  ├── entries ──────┤ (interventions chirurgicales)
  ├── gardes        │ (gardes hospitalieres)
  ├── notes         │ (notes personnelles)
  ├── followups     │ (suivi patients)
  ├── feedback      │ (retours app)
  │                 │
hospitals ──────────┤
specialties ────────┤
procedures ─────────┤
  │                 │
des_registry ───────┘ (registre DES)
des_objectives        (objectifs par niveau)
surgical_techniques   (techniques operatoires)
  
subscriptions ────── institutional_seats ────── seat_assignments
                     adhesion_requests

audit_log             (traces securite)
active_sessions       (sessions actives)
```

### Row Level Security (RLS)

Toutes les tables sensibles ont des policies RLS :
- `entries` : SELECT/INSERT/UPDATE/DELETE filtres par `user_id`
- `gardes` : Filtre par `user_id`, admins voient tout
- `profiles` : Lecture publique, ecriture par le proprietaire
- `audit_log` : INSERT only pour tous, SELECT admin only

## Fonctionnalites par module

### Dashboard & Analytics
- Stats de base (total, valides, ce mois)
- Progression DES (jauge circulaire + barres par role)
- Evolution mensuelle (bar chart)
- Repartition (role, specialite, hopital, procedures)
- **Analytique avancee** : heatmap 365j, streaks, distribution jours, taux validation
- **Vue etablissement** (admin) : KPI globaux, par DES, par hopital, top 10, selecteur utilisateur
- **Comparatif anonymise** : percentile vs promotion

### Logbook
- Saisie d'intervention (date, hopital, specialite, procedure, role, superviseur)
- Upload de compte-rendu operatoire
- Validation par le superviseur
- Historique avec filtres et recherche

### Gardes
- Enregistrement des gardes (date, hopital, type, duree)
- Stats par hopital et par mois

### Abonnements (PayPal)
- 3 plans (Free, Premium, Institutionnel)
- Subscription API v2 avec webhook
- Gestion des postes institutionnels (seats)

### PWA & Offline
- Service Worker avec cache-first
- Pre-cache des pages principales
- Page `/offline` de fallback
- Manifest avec shortcuts et icones

## Infrastructure

### CI/CD (GitHub Actions)

```yaml
push main     → lint + build + deploy Vercel
pull request  → lint + build + e2e Playwright
```

3 jobs : Lint & Build, E2E Tests (PR only), Deploy Production (main only).

### Monitoring

- **Sentry** : erreurs runtime + bridge Pino pour 5xx
- **Pino** : structured logging (JSON), niveaux configurables
- **Audit log** : actions sensibles tracees en BDD

### Email (Brevo)

- Emails transactionnels (bienvenue, validation)
- DKIM + DMARC authentifie sur `internlog.app`
- Rate limit 5/min

## Decisions architecturales (ADR)

| ADR | Decision | Raison |
|-----|----------|--------|
| 001 | Supabase comme BaaS | Auth + RLS + Realtime + Storage en un seul service |
| 002 | PayPal Subscriptions | Seul provider de paiement accessible depuis le Benin |
| 003 | Server Actions (pas API routes) | Moins de boilerplate, typage de bout en bout |
| 004 | Brevo pour les emails | API simple, DKIM facile, plan gratuit genereux |

## Performance

- **Turbopack** en dev (hot reload < 200ms)
- **Image optimization** AVIF/WebP via Next.js
- **CSS** : `@layer` pour la cascade, classes utilitaires custom
- **Bundle** : tree-shaking automatique, source maps desactivees en prod
