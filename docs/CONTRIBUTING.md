# Guide de contribution — InternLog

> Ce guide explique comment configurer l'environnement de developpement,
> les conventions du projet, et le workflow de contribution.

## Prerequis

- **Node.js** >= 20 (recommande : derniere LTS)
- **npm** (inclus avec Node.js)
- **Git**
- Un projet **Supabase** avec le schema configure
- (optionnel) **Playwright** pour les tests e2e

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/kwennaelhub/elogbook-app.git
cd elogbook-app

# 2. Installer les dependances
npm install

# 3. Configurer l'environnement
cp .env.local.example .env.local
# Remplir chaque variable (voir README.md pour la liste)

# 4. Lancer le serveur de dev
npm run dev
```

## Conventions de code

### Structure des fichiers

```
src/
├── app/          # Pages et routes (App Router)
├── components/   # Composants React (par domaine)
├── lib/          # Logique metier et utilitaires
│   ├── actions/  # Server Actions ('use server')
│   ├── i18n/     # Internationalisation
│   └── supabase/ # Clients Supabase
└── middleware.ts  # Middleware d'authentification
```

### Nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Fichiers composants | kebab-case | `analytics-section.tsx` |
| Composants React | PascalCase | `AnalyticsSection` |
| Server Actions | camelCase | `getAnalyticsStats()` |
| Fichiers actions | kebab-case | `analytics.ts` |
| Variables CSS | kebab-case | `--color-primary` |
| Tables Supabase | snake_case | `patient_followups` |

### Pattern Server/Client

```tsx
// ===== page.tsx (Server Component) =====
// - Fetch les donnees
// - Pas de hooks, pas de state
// - Passe tout via props
export default async function MyPage() {
  const data = await getMyData()
  return <MyContent data={data} />
}

// ===== my-content.tsx (Client Component) =====
'use client'
// - Gere l'interactivite
// - Hooks, state, event handlers
export function MyContent({ data }: { data: MyData }) {
  const [state, setState] = useState(...)
  return <div>...</div>
}
```

### CSS

Le projet utilise **Tailwind CSS 4** avec `@layer` pour la cascade :

```css
@layer base    { /* reset, tokens */ }
@layer components { /* card-base, input-field, btn-primary */ }
@layer utilities  { /* overrides */ }
```

Classes utilitaires custom : `input-field`, `btn-primary`, `card-base`, `caption`.

### Validation

Tous les inputs utilisateur sont valides avec **Zod** :

```typescript
import { z } from 'zod'

const entrySchema = z.object({
  intervention_date: z.string().date(),
  hospital_id: z.string().uuid(),
  specialty_id: z.string().uuid(),
  // ...
})
```

## Workflow Git

### Branches

| Branche | Usage |
|---------|-------|
| `main` | Production (deploy auto sur push) |
| `feature/*` | Nouvelle fonctionnalite |
| `fix/*` | Correction de bug |
| `docs/*` | Documentation |

### Commits

Format : `type(scope): description`

```
feat(dashboard): add analytics heatmap and streaks
fix(auth): handle expired session redirect
docs(readme): update environment variables
style(theme): migrate components to dark navy tokens
chore(ci): add GitHub Actions workflow
```

Types : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests

1. Creer une branche depuis `main`
2. Faire les modifications
3. S'assurer que le build passe : `npm run build`
4. Lancer les tests : `npx playwright test`
5. Ouvrir une PR vers `main`
6. Le CI (GitHub Actions) verifie automatiquement

## Tests

### E2E (Playwright)

```bash
# Installer les navigateurs (premiere fois)
npx playwright install

# Lancer tous les tests
npx playwright test

# Mode interactif
npx playwright test --ui

# Un seul fichier
npx playwright test e2e/auth.spec.ts

# Voir le rapport
npx playwright show-report
```

**Configuration :** 2 navigateurs (Desktop Chrome + Mobile Pixel 7), timeout 60s, retry x2 en CI.

### Ajouter un test

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Ma fonctionnalite', () => {
  test('doit faire X', async ({ page }) => {
    await page.goto('/my-page')
    await expect(page.getByRole('heading')).toContainText('Titre')
  })
})
```

## Ajouter une Server Action

1. Creer ou editer un fichier dans `src/lib/actions/`
2. Marquer avec `'use server'` en haut du fichier
3. Exporter une fonction async
4. Toujours verifier l'authentification :

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function myAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Logique metier...
}
```

5. Pour les actions admin, verifier le role :

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
  return null
}
```

## Ajouter un composant

1. Creer le fichier dans `src/components/{domaine}/`
2. Utiliser les classes utilitaires existantes (`card-base`, `input-field`, `btn-primary`)
3. Respecter le theme dark navy (tokens CSS dans `globals.css`)
4. Tester en mode mobile (viewport Pixel 7 : 412px)

## Internationalisation (i18n)

Les traductions sont dans `src/lib/i18n/dictionaries.ts` :

```typescript
// Ajouter une cle
export const dictionaries = {
  fr: {
    'myFeature.title': 'Mon titre',
    'myFeature.description': 'Ma description',
  },
  en: {
    'myFeature.title': 'My title',
    'myFeature.description': 'My description',
  },
}
```

Utilisation cote client :
```tsx
const { t } = useI18n()
return <h1>{t('myFeature.title')}</h1>
```

Utilisation cote serveur :
```tsx
const t = await getServerT()
return <h1>{t('myFeature.title')}</h1>
```

## Deploiement

Le deploiement est automatise via GitHub Actions. En cas de besoin manuel :

```bash
# Build
npx vercel build --prod

# Deploy
npx vercel deploy --prebuilt --prod --yes
```

**Variables Vercel** : 20 variables configurees. Voir le README pour la liste complete.

## Securite

- Ne jamais committer de fichiers `.env` ou de cles API
- Toujours utiliser RLS cote Supabase pour filtrer les donnees
- Valider tous les inputs avec Zod
- Verifier le role utilisateur dans chaque Server Action sensible
- Les source maps sont desactivees en production

## Licence

Ce projet est sous licence proprietaire. Voir [LICENSE](../LICENSE).
Toute contribution implique l'accord avec les termes de la licence.
