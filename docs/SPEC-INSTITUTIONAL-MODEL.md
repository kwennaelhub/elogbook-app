# Spec — Modele Institutionnel InternLog

> Document de specification architecturale.
> Auteur : Jean Fagnon | Date : 17 avril 2026 | Statut : DRAFT — en attente validation

---

## 1. Probleme actuel

Le modele actuel est **plat** : tous les utilisateurs voient la meme app, un seul role `admin`
peut tout faire sur tout le monde. Pas de notion de service, pas de scoping par hopital.

## 2. Objectif

Transformer InternLog en plateforme **multi-institutions** ou chaque hopital/CHU est un
espace autonome avec sa propre hierarchie, ses propres couleurs, et son propre admin.

---

## 3. Hierarchie des roles (du plus bas au plus haut)

```
DES / Interne (student)
    │
    ├── Il est RATTACHE a un hopital de reference (home_hospital)
    │   → Seul l'admin de cet hopital peut le revoquer/supprimer
    │
    ├── Il peut faire des STAGES dans d'autres hopitaux
    │   → Les superviseurs du stage peuvent VALIDER ses interventions
    │   → Mais PAS le supprimer ni modifier son profil
    │
Superviseur (supervisor)
    │
    ├── Rattache a un hopital + un service
    │   → Valide les interventions/gardes des DES presents dans son service
    │   → Pas d'acces admin
    │
Chef de service (service_chief) ← NOUVEAU ROLE
    │
    ├── Admin de SON service uniquement
    │   → Voit les stats de son service
    │   → Gere les superviseurs de son service
    │   → Gere les DES affectes a son service
    │   → NE PEUT PAS voir les autres services
    │
Recteur / Directeur (institution_admin) ← NOUVEAU ROLE
    │
    ├── Memes droits qu'un chef de service MAIS :
    │   → Vue transversale sur TOUS les services de son hopital
    │   → Statistiques globales etablissement
    │   → NE PEUT PAS modifier les DES d'un autre hopital
    │
Developpeur (developer)
    │
    └── Acces total, cross-hopital, debug, configuration globale
```

## 4. Notion de service au sein d'un hopital

Un hopital contient plusieurs **services chirurgicaux** :

```
CNHU-HKM (hopital)
├── Chirurgie Viscerale      → Chef : Pr X
├── Traumatologie-Orthopedie → Chef : Pr Y
├── Chirurgie Thoracique     → Chef : Dr Z
├── Chirurgie Pediatrique    → Chef : Pr W
└── Urologie                 → Chef : Dr V
```

Chaque service a :
- Un nom
- Un chef de service (role `service_chief`)
- Des superviseurs rattaches
- Des DES en stage (temporaire) ou en poste (permanent)

## 5. Nouvelles tables Supabase

### 5.1 `hospital_services`

```sql
CREATE TABLE hospital_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES hospitals(id) NOT NULL,
  name text NOT NULL,                    -- "Chirurgie Viscerale"
  chief_id uuid REFERENCES profiles(id), -- Chef de service
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_hospital_services_hospital ON hospital_services(hospital_id);
```

### 5.2 Modifications `profiles`

```sql
ALTER TABLE profiles ADD COLUMN home_hospital_id uuid REFERENCES hospitals(id);
-- L'hopital de REFERENCE du DES (celui qui peut le revoquer)
-- Distinct de hospital_id qui peut etre l'hopital de stage actuel

ALTER TABLE profiles ADD COLUMN service_id uuid REFERENCES hospital_services(id);
-- Le service actuel (stage ou poste)
```

### 5.3 `hospital_settings` (personnalisation)

```sql
CREATE TABLE hospital_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES hospitals(id) UNIQUE NOT NULL,
  primary_color text DEFAULT '#4f6fff',    -- Couleur principale
  secondary_color text DEFAULT '#34d399',  -- Couleur secondaire
  accent_color text DEFAULT '#fbbf24',     -- Couleur accent
  max_services int DEFAULT 3,             -- Limite du forfait
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);
```

### 5.4 Forfaits institutionnels (remplace l'ancien plan unique)

```
Plans individuels (inchanges) :
  Free      → 0 EUR   — Logbook illimite, validation
  Premium   → 7,99 EUR/mois — Export PDF, notes, dashboard avance

Plans institutionnels (NOUVEAUX, remplacent l'ancien "Institutionnel") :
  Starter   → a definir — Jusqu'a 3 services, 1 recteur, chefs de service
  Pro       → a definir — Jusqu'a 6 services, stats avancees
  Enterprise→ a definir — 10+ services (illimite), support prioritaire
```

### 5.4 Modification `hospitals`

```sql
ALTER TABLE hospitals ADD COLUMN logo_url text DEFAULT NULL;
-- Deja prevu dans le code actuel
```

## 6. Regles de permissions (RLS refonte)

### 6.1 Qui peut modifier/supprimer un DES ?

| Action | Qui peut | Condition |
|--------|---------|-----------|
| Supprimer un DES | Admin de son `home_hospital` | `profiles.home_hospital_id = admin.hospital_id` |
| Supprimer un DES | Developer | Toujours |
| Modifier profil DES | Le DES lui-meme | Son propre profil |
| Modifier profil DES | Admin de son `home_hospital` | `profiles.home_hospital_id = admin.hospital_id` |
| Revoquer d'un stage | Chef du service d'accueil | `profiles.service_id = chief.service_id` |

### 6.2 Qui peut valider une intervention ?

| Action | Qui peut | Condition |
|--------|---------|-----------|
| Valider intervention | Superviseur present | Meme `hospital_id` au moment de l'intervention |
| Valider intervention | Chef du service | `entry.service_id = chief.service_id` |
| Valider intervention | Recteur de l'hopital | `entry.hospital_id = recteur.hospital_id` |

### 6.3 Qui peut voir les statistiques ?

| Donnees | Qui voit | Scope |
|---------|---------|-------|
| Ses propres stats | DES | Soi-meme |
| Stats du service | Chef de service | Son service uniquement |
| Stats de l'hopital | Recteur / institution_admin | Tous les services de son hopital |
| Stats globales | Developer | Tout |
| Comparatif anonymise | DES | Sa promotion (meme DES level) |

### 6.4 Qui peut modifier le logo / les couleurs ?

| Action | Qui peut |
|--------|---------|
| Modifier logo hopital | Developer |
| Modifier logo hopital | Institution_admin (recteur) de CET hopital |
| Modifier logo hopital | Abonne institutionnel de CET hopital |
| Modifier couleurs | Memes regles que logo |

## 7. Impact sur le code existant

### 7.1 Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `types/database.ts` | Ajouter `Hospital_Service`, modifier `Profile` (home_hospital_id, service_id) |
| `lib/actions/admin/helpers.ts` | `requireAdmin()` → scoper par hopital |
| `lib/actions/admin/config.ts` | CRUD services, permissions logo/couleurs |
| `lib/actions/admin/users.ts` | `deleteUser` scoper par home_hospital, `updateUserRole` scoper |
| `lib/actions/analytics.ts` | `getInstitutionStats()` scoper par hopital, `getAnalyticsStats()` scoper par service |
| `lib/actions/entries.ts` | Ajouter `service_id` a chaque entry |
| `middleware.ts` | Injecter theme/couleurs selon hopital |
| `components/admin/config-tab.tsx` | Section services, upload logo scope |
| `components/dashboard/dashboard-content.tsx` | Theme dynamique, logo |
| `app/globals.css` | Variables CSS dynamiques pour couleurs hopital |
| `app/(app)/layout.tsx` | Injecter les couleurs depuis hospital_settings |

### 7.2 Nouvelles Server Actions

```
createService(hospitalId, name)
updateService(serviceId, data)
deleteService(serviceId)
assignChief(serviceId, userId)
getHospitalServices(hospitalId)
updateHospitalSettings(hospitalId, colors)
getHospitalSettings(hospitalId)
transferDES(desId, fromHospitalId, toHospitalId) // stage
```

## 8. Personnalisation couleurs

L'app utilise des CSS custom properties. On peut les surcharger par hopital :

```css
/* Valeurs par defaut (globals.css) */
:root {
  --color-primary: oklch(0.55 0.15 260);
}

/* Surcharge dynamique (injectee server-side) */
:root[data-hospital="cnhu"] {
  --color-primary: oklch(0.45 0.12 145); /* Vert CNHU */
}
```

Le layout server-side injecte l'attribut `data-hospital` ou un `<style>` inline
avec les custom properties extraites de `hospital_settings`.

## 9. Plan d'implementation (par phases)

### Phase A — Fondations (cette session)
1. ✅ Colonne `logo_url` + bucket Storage
2. ✅ Upload logo (API route + UI admin)
3. ⬜ SQL : `ALTER TABLE hospitals ADD COLUMN logo_url`
4. ⬜ Deploy + test logo

### Phase B — Services + Roles (prochaine session)
1. Table `hospital_services`
2. Colonnes `home_hospital_id`, `service_id` sur `profiles`
3. Nouveaux roles : `service_chief`, `institution_admin`
4. CRUD services dans admin
5. Affectation chef de service
6. Migration des DES existants (home_hospital = hospital actuel)

### Phase C — Permissions scopees
1. Refonte `requireAdmin()` → `requireHospitalAdmin(hospitalId)`
2. RLS : entries, gardes, profiles scopes par hopital/service
3. `deleteUser` scope par home_hospital
4. Validation scoped (superviseur du service)
5. Dashboard analytics scope par service/hopital

### Phase D — Personnalisation visuelle
1. Table `hospital_settings` (couleurs)
2. Extraction couleurs dominantes du logo (optionnel)
3. Injection CSS dynamique dans layout
4. Preview couleurs dans admin

### Phase E — UX institutionnelle
1. Onboarding institution (premier admin)
2. Vue "Mon etablissement" pour recteur
3. Vue "Mon service" pour chef
4. Gestion des stages (DES temporaires)
5. Dashboard multi-service pour recteur

---

## 10. Modele de stages — VALIDE par Jean (17/04/2026)

Un DES a un **hopital de reference** (`home_hospital_id`) permanent.
Il effectue des **stages** dans des services, qui peuvent etre :

- **Intra-hopital** : meme hopital de reference, service different
  - Ex : DES visceral CNHU-HKM → stage en traumatologie au CNHU-HKM
- **Extra-hopital** : hopital different, service specifique
  - Ex : DES visceral CNHU-HKM → stage en visceral au CHD-OP Porto-Novo

### Table `stage_assignments`

```sql
CREATE TABLE stage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  des_id uuid REFERENCES profiles(id) NOT NULL,
  hospital_id uuid REFERENCES hospitals(id) NOT NULL,
  service_id uuid REFERENCES hospital_services(id) NOT NULL,
  start_date date NOT NULL,
  end_date date,                        -- NULL = stage en cours
  is_current boolean DEFAULT true,
  assigned_by uuid REFERENCES profiles(id), -- Qui a affecte le DES
  created_at timestamptz DEFAULT now()
);

-- Un seul stage en cours par DES
CREATE UNIQUE INDEX idx_stage_current ON stage_assignments(des_id) WHERE is_current = true;
CREATE INDEX idx_stage_hospital ON stage_assignments(hospital_id);
CREATE INDEX idx_stage_service ON stage_assignments(service_id);
```

### Regles de permission pour les stages

| Action | Qui peut | Condition |
|--------|---------|-----------|
| Creer un stage | Chef du service d'accueil | — |
| Creer un stage | Recteur de l'hopital d'accueil | — |
| Creer un stage | Admin home_hospital du DES | — |
| Creer un stage | Developer | Toujours |
| Terminer un stage | Memes regles que creation | — |
| Supprimer le DES | Admin de `home_hospital` UNIQUEMENT | `profiles.home_hospital_id` |
| Valider intervention | Superviseur du service de stage | Pendant la periode du stage |

### Impact sur les entries

Chaque intervention doit enregistrer le contexte du stage :

```sql
ALTER TABLE entries ADD COLUMN service_id uuid REFERENCES hospital_services(id);
-- Permet de savoir dans quel service l'intervention a eu lieu
```

---

## 11. Questions — TOUTES REPONDUES (17/04/2026)

1. ~~Un DES peut-il etre rattache a PLUSIEURS hopitaux simultanement ?~~
   → **OUI** : via `stage_assignments`. Un home_hospital + stages multiples.

2. **Qui cree le premier recteur ?**
   → **REPONDU** : Le recteur est designe a l'inscription de l'institution.
   Le developer peut aussi le creer sur demande de validation externe/ulterieure.
   Le recteur nomme ensuite ses chefs de service.

3. **Quelles couleurs voit un DES en stage ailleurs ?**
   → **REPONDU** : Toujours les couleurs de son hopital de REFERENCE (home_hospital).

4. **Le recteur peut-il modifier les objectifs DES ?**
   → **REPONDU** : Oui, sous validation du chef de service concerne.
   C'est un privilege du chef de service (le recteur peut proposer, le chef valide).

5. **L'abonnement institutionnel — quel modele ?**
   → **REPONDU** : Au niveau HOPITAL, avec 3 forfaits selon le nombre de services :

   | Forfait | Services inclus | Prix (a definir) |
   |---------|----------------|-------------------|
   | Starter | Jusqu'a 3 services | a definir |
   | Pro | Jusqu'a 6 services | a definir |
   | Enterprise | Plus de 10 services (illimite) | a definir |

   Le recteur souscrit, tous les services inclus dans le forfait en beneficient.

6. ~~Faut-il un historique des stages ?~~
   → **OUI** : table `stage_assignments` avec dates debut/fin

---

*Ce document est un DRAFT. Aucun code ne sera ecrit avant validation par Jean Fagnon.*
