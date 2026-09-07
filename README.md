# Patrimoine.net

> Your wealth becomes your world.

Application de gestion patrimoniale qui transforme le patrimoine de l'utilisateur
en un monde 2D isométrique en pixel art. Ce n'est ni un jeu d'argent, ni une
plateforme de trading, ni un outil de conseil financier.

Documentation : [PRODUCT_SPEC.md](PRODUCT_SPEC.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [PIXEL_ART_BIBLE.md](PIXEL_ART_BIBLE.md) · [SECURITY.md](SECURITY.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · PixiJS 8 ·
PostgreSQL 16 / Supabase · Drizzle ORM · Zod · Vitest · Playwright.

## Installation

Prérequis : Node.js ≥ 20.9, PostgreSQL ≥ 14 (local) **ou** un projet Supabase.

```bash
npm install
cp .env.example .env        # puis ajuster DATABASE_URL
npm run db:setup            # rôles + schéma auth local + migrations
npm run db:seed             # compte de démonstration (optionnel)
npm run dev                 # http://localhost:3000
```

Compte de démonstration après `db:seed` : `demo@patrimoine.local` / `demo-patrimoine-2026`.
Le monde de démonstration est aussi visible sans compte sur `/demo`.

## Variables d'environnement

| Variable                                                    | Rôle                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                              | Connexion PostgreSQL. Sur Supabase, utiliser le _Transaction pooler_ (port 6543).    |
| `AUTH_PROVIDER`                                             | `local` (développement / tests, refusé en production) ou `supabase`.                 |
| `LOCAL_AUTH_SECRET`                                         | Secret HMAC des sessions de l'adaptateur local.                                      |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Requis avec `AUTH_PROVIDER=supabase`.                                                |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Optionnel, serveur uniquement. Jamais côté client.                                   |
| `MARKET_DATA_PROVIDER`                                      | `mock` (seul fournisseur livré : données simulées, jamais présentées comme réelles). |
| `NEXT_PUBLIC_APP_URL`                                       | URL publique (liens de confirmation / réinitialisation).                             |
| `APP_ENV`                                                   | `development`, `test`, `preview`, `production`.                                      |

Aucun secret n'est commité ; `.env` est ignoré par Git.

## Base de données

- Schéma Drizzle : `src/db/schema/`. Migrations SQL versionnées : `src/db/migrations/`.
- `npm run db:generate` génère une migration après modification du schéma ; `npm run db:migrate` l'applique.
- Toutes les tables sont protégées par **Row Level Security** (policies `auth.uid() = user_id`).
  Côté application, chaque accès passe par `withUserDb(userId, …)` qui bascule sur le rôle
  `authenticated` dans la transaction : RLS s'applique aussi aux requêtes Drizzle.

### Supabase

1. Créer un projet Supabase et activer l'authentification e-mail / mot de passe.
2. Renseigner `DATABASE_URL` (pooler), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AUTH_PROVIDER=supabase`.
3. `npm run db:migrate` (ne pas lancer `db:setup`, réservé au PostgreSQL local).
4. Ajouter `NEXT_PUBLIC_APP_URL/auth/callback` aux _Redirect URLs_ du projet.

### PostgreSQL local

`npm run db:setup` crée les rôles `anon` / `authenticated` / `service_role`, le schéma `auth`
(`auth.users`, `auth.uid()`) et applique les migrations. Les comptes de l'adaptateur `local`
sont stockés dans `auth.users` avec un hachage scrypt.

## Scripts

| Commande                                | Description                                                             |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js                                                                 |
| `npm run lint` · `typecheck` · `format` | Qualité                                                                 |
| `npm run test`                          | Tests unitaires (Vitest)                                                |
| `npm run test:integration`              | Tests d'intégration PostgreSQL (RLS, services) — base `patrimoine_test` |
| `npm run test:e2e`                      | Playwright (build + serveur de test automatiques)                       |
| `npm run assets:generate`               | Régénère les sprites _placeholder_ et `asset-manifest.json`             |
| `npm run check`                         | lint + typecheck + tests + build                                        |

Les tests d'intégration et E2E utilisent `TEST_DATABASE_URL` / `E2E_DATABASE_URL`
(défaut : `postgres://postgres:postgres@127.0.0.1:5432/patrimoine_test`). Jamais de données de production.
Playwright télécharge Chromium (`npx playwright install chromium`) ; pour réutiliser un Chromium déjà
installé, définir `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/vers/chrome`.

## Déploiement

- Next.js sur Vercel (ou tout hébergeur Node ≥ 20), Supabase pour la base et l'authentification,
  assets statiques servis depuis `public/` (CDN de l'hébergeur).
- Environnements : `development` (Postgres local + auth locale), `preview` et `production` (Supabase, `AUTH_PROVIDER=supabase`).
- `npm run build` doit passer sans erreur TypeScript ni ESLint avant tout déploiement.

## Assets graphiques

Les sprites actuels sont des **placeholders générés par script** (`scripts/generate-placeholder-assets.ts`),
identifiés `"placeholder": true` dans `public/assets/asset-manifest.json`. Le code ne référence que
des identifiants (`house_lv1`) : remplacer un fichier ne nécessite aucune modification de code.
Règles de production des assets : [PIXEL_ART_BIBLE.md](PIXEL_ART_BIBLE.md).

## Mentions

Les visualisations ne constituent ni un conseil financier, ni une recommandation, ni une prédiction
ou une garantie de performance.
