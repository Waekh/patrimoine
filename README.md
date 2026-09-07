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

## Déploiement sur Vercel

L'application a besoin d'une base PostgreSQL et d'un fournisseur d'authentification :
en production, c'est un projet Supabase. Tant que ces variables ne sont pas définies,
le déploiement répond quand même (accueil et `/demo` s'affichent, les pages de connexion
indiquent « Service indisponible ») mais aucune donnée n'est accessible.

1. **Créer un projet Supabase** et activer l'authentification e-mail / mot de passe.

2. **Appliquer les migrations** depuis votre machine, avec la connexion **directe**
   (port 5432) et non le pooler, car les migrations créent des types, des tables et des policies :

   ```bash
   DATABASE_URL="postgresql://postgres:<mot-de-passe>@db.<ref>.supabase.co:5432/postgres" npm run db:migrate
   ```

   La connexion directe de Supabase répond en **IPv6**. Depuis un réseau IPv4 seul, la commande
   échoue avec une erreur réseau : utilisez alors le **Session pooler** (port 5432, hôte
   `…pooler.supabase.com`), proposé par Supabase exactement pour ce cas. Le *Transaction pooler*
   ne convient pas ici : il est destiné à l'exécution de l'application, pas aux migrations.

   Si le mot de passe contient des caractères spéciaux, encodez-les en pourcentage dans l'URI.

   Ne pas lancer `npm run db:setup` sur Supabase : les rôles et le schéma `auth` y existent déjà.

3. **Déclarer les variables sur Vercel** (Settings → Environment Variables), pour *Production* et *Preview* :

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_URL` | URI du **Transaction pooler** Supabase (port 6543), adapté au serverless |
   | `AUTH_PROVIDER` | `supabase` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` ou clé `sb_publishable_…` du projet |
   | `APP_ENV` | `production` |
   | `NEXT_PUBLIC_APP_URL` | facultatif : déduit automatiquement de l'URL Vercel |
   | `DATABASE_POOL_MAX` | facultatif : 5 par défaut, adapté au serverless |

   Supabase propose désormais une clé « publishable » (`sb_publishable_…`) à la place de la clé
   `anon` historique : les deux se placent dans la même variable, et le nom
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` employé par les extraits Supabase est également accepté.
   Les étapes « Install packages » et « Add files » proposées par la fenêtre *Connect* de Supabase
   ne concernent pas ce projet : le client, le rafraîchissement de session et le middleware
   existent déjà (`src/lib/auth/supabase/`, `src/proxy.ts`).

4. **Supabase → Authentication → URL Configuration** : ajouter `https://<domaine>/auth/callback`
   aux *Redirect URLs*, sinon la confirmation d'e-mail et la réinitialisation de mot de passe échouent.

5. **Redéployer** : les variables d'environnement ne sont lues qu'au déploiement suivant.

6. **Vérifier** `https://<domaine>/api/health` :

   ```json
   { "status": "ok", "database": { "ok": true }, "rls": { "ok": true } }
   ```

### Diagnostic d'un déploiement

`/api/health` indique précisément ce qui manque, sans jamais exposer de valeur secrète.

| Réponse | Cause | Correction |
| --- | --- | --- |
| `"status": "unconfigured"` avec `missing` | variables d'environnement absentes | définir les variables listées, puis **redéployer** |
| `database.ok: false` | base injoignable ou URI incorrecte | vérifier `DATABASE_URL` : Transaction pooler, mot de passe encodé, caractères spéciaux |
| `rls.ok: false` | le rôle `authenticated` n'est pas disponible | vérifier que les migrations ont bien été appliquées sur cette base |
| `"status": "ok"` | tout fonctionne | — |

Les détails des erreurs restent dans les journaux du serveur ; la réponse ne contient qu'une
référence (`reference`) permettant de retrouver la ligne correspondante.

### Autres hébergeurs

Tout hébergeur Node ≥ 20.9 convient (`npm run build` puis `npm run start`).
Les assets de `public/` peuvent être servis par un CDN. Environnements prévus :
`development` (PostgreSQL local + auth locale), `preview` et `production` (Supabase).

## Assets graphiques

Les sprites actuels sont des **placeholders générés par script** (`scripts/generate-placeholder-assets.ts`),
identifiés `"placeholder": true` dans `public/assets/asset-manifest.json`. Le code ne référence que
des identifiants (`house_lv1`) : remplacer un fichier ne nécessite aucune modification de code.
Règles de production des assets : [PIXEL_ART_BIBLE.md](PIXEL_ART_BIBLE.md).

## Mentions

Les visualisations ne constituent ni un conseil financier, ni une recommandation, ni une prédiction
ou une garantie de performance.
