<p align="center">
  <img src="public/icons/icon-192x192.png" alt="InternLog" width="80" />
</p>

<h1 align="center">InternLog</h1>

<p align="center">
  <strong>Logbook Médical DES — Suivi des compétences chirurgicales</strong>
</p>

<p align="center">
  <a href="https://internlog.app">Production</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/CONTRIBUTING.md">Contribuer</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PWA-ready-5a0fc8?logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/license-proprietary-red" alt="License" />
</p>

---

## Apercu

InternLog est une Progressive Web App (PWA) destinee aux etudiants en DES (Diplome d'Etudes Specialisees) de chirurgie. Elle permet de :

- **Enregistrer** chaque intervention chirurgicale (role, specialite, hopital, superviseur)
- **Suivre** la progression par rapport aux objectifs DES (DES1 a DES5)
- **Visualiser** des analytiques avancees (heatmap, streaks, distribution, comparatif promotion)
- **Gerer** les gardes, notes personnelles, suivis patients, templates
- **Valider** les actes par les superviseurs (Pr, Dr, Pr Ag)
- **Exporter** les donnees en PDF/Excel
- **Fonctionner hors ligne** grace au Service Worker

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 16.2 (App Router, Server Actions) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Paiement | PayPal Subscriptions (REST API v2) |
| Email | Brevo (API v3, DKIM/DMARC) |
| Monitoring | Sentry 10, Pino (structured logging) |
| Tests | Playwright (Desktop Chrome + Mobile Pixel 7) |
| CI/CD | GitHub Actions (lint, build, e2e, deploy) |
| Deploy | Vercel (Hobby) |
| Validation | Zod 4 |

## Demarrage rapide

### Prerequis

- Node.js >= 20
- npm
- Un projet [Supabase](https://supabase.com) avec les tables configurees

### Installation

```bash
# Cloner le repo
git clone https://github.com/kwennaelhub/elogbook-app.git
cd elogbook-app

# Installer les dependances
npm install

# Copier les variables d'environnement
cp .env.local.example .env.local
# Remplir les variables (voir section ci-dessous)

# Lancer en dev
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

| Variable | Description |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service (server-side uniquement) |
| `NEXT_PUBLIC_APP_URL` | URL de l'app (ex: `https://internlog.app`) |
| `NEXT_PUBLIC_APP_NAME` | Nom affiche (`InternLog`) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry pour le monitoring |
| `PAYPAL_MODE` | `sandbox` ou `live` |
| `PAYPAL_CLIENT_ID` | Client ID PayPal |
| `PAYPAL_CLIENT_SECRET` | Secret PayPal |
| `PAYPAL_WEBHOOK_ID` | ID du webhook PayPal |
| `PAYPAL_PRODUCT_ID` | ID produit PayPal |
| `PAYPAL_PLAN_PREMIUM` | ID plan Premium |
| `PAYPAL_PLAN_INSTITUTIONAL` | ID plan Institutionnel |
| `BREVO_API_KEY` | Cle API Brevo |
| `BREVO_SENDER_EMAIL` | Email expediteur (`noreply@internlog.app`) |
| `LOG_LEVEL` | Niveau de log Pino (`info`, `debug`, `warn`) |

## Structure du projet

```
src/
├── app/
│   ├── (app)/              # Pages protegees (auth requise)
│   │   ├── admin/          # Panel administrateur
│   │   ├── calendar/       # Calendrier des interventions
│   │   ├── dashboard/      # Tableau de bord + analytique
│   │   ├── followups/      # Suivi patients
│   │   ├── logbook/        # Saisie d'interventions
│   │   ├── notes/          # Notes personnelles
│   │   ├── settings/       # Parametres utilisateur
│   │   ├── subscription/   # Gestion abonnement PayPal
│   │   ├── supervision/    # Validation superviseur
│   │   └── templates/      # Templates d'interventions
│   ├── (auth)/             # Pages publiques (login, register)
│   ├── api/                # Routes API (PayPal, export, upload)
│   └── legal/              # Pages legales (CGU, confidentialite)
├── components/
│   ├── ui/                 # Composants shadcn/ui de base
│   ├── admin/              # Composants admin
│   ├── dashboard/          # Charts, heatmap, analytics
│   ├── logbook/            # Formulaires d'intervention
│   └── ...                 # Autres domaines
├── lib/
│   ├── actions/            # Server Actions (15 fichiers)
│   ├── i18n/               # Internationalisation FR/EN
│   ├── supabase/           # Clients Supabase (server/client)
│   ├── circuit-breaker.ts  # Resilience reseau
│   ├── error-handler.ts    # Gestion d'erreurs centralisee
│   ├── exceptions.ts       # Classes d'exceptions custom
│   ├── logger.ts           # Pino structured logging
│   ├── paypal.ts           # Integration PayPal REST API
│   ├── rate-limit.ts       # Rate limiting par IP
│   └── validations.ts      # Schemas Zod
└── middleware.ts            # Auth middleware Supabase
```

## Scripts

```bash
npm run dev        # Serveur de developpement (Turbopack)
npm run build      # Build de production
npm run start      # Demarrer en production
npm run lint       # Linting ESLint
npx playwright test # Tests e2e
```

## Plans d'abonnement

| Plan | Prix | Inclus |
|------|------|--------|
| **Free** | Gratuit | Logbook illimite, validation superviseur, historique basique |
| **Premium DES** | 7,99 EUR/mois | Export PDF, notes illimitees, dashboard avance, newsletter |
| **Institutionnel** | 45,99 EUR/mois | 20 postes chefs de service, vue equipe, analytics etablissement |

## Base de donnees

23 tables Supabase avec Row Level Security (RLS) :

`profiles`, `hospitals`, `specialties`, `procedures`, `entries`, `gardes`, `des_registry`, `des_objectives`, `surgical_techniques`, `cro_templates`, `prescription_templates`, `preop_templates`, `instruments`, `supervisor_assignments`, `active_sessions`, `audit_log`, `subscriptions`, `institutional_seats`, `seat_assignments`, `adhesion_requests`, `feedback`, `notes`, `patient_followups`

## Securite

- **RLS** sur toutes les tables sensibles (23 policies)
- **Rate limiting** par IP (auth 10/min, lookup 15/min, adhesion 5/10min)
- **7 security headers** (CSP, HSTS, Permissions-Policy, X-XSS-Protection)
- **Circuit breaker** (seuil 5, reset 30s)
- **8 classes d'exceptions** custom avec error handler centralise
- **Source maps desactivees** en production
- **Webhook signature** verifiee (PayPal)

## Tests

```bash
# Lancer tous les tests e2e
npx playwright test

# Avec interface graphique
npx playwright test --ui

# Rapport HTML
npx playwright show-report
```

5 specs, 50 tests (25 Desktop Chrome + 25 Mobile Pixel 7).

## Deploiement

Le deploiement est automatise via GitHub Actions sur push vers `main` :

```bash
# Deploiement manuel (si necessaire)
npx vercel build --prod
npx vercel deploy --prebuilt --prod --yes
```

## Licence

Logiciel proprietaire. Copyright (c) 2026 Jean Fagnon / Palabres Consulting.
Tous droits reserves. Voir [LICENSE](LICENSE) pour les details.

## Contact

- **Auteur** : Jean Fagnon
- **Email** : jean@palabres-consulting.com
- **Production** : [https://internlog.app](https://internlog.app)
