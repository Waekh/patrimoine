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
| `APP_URL`                                                   | Base des liens envoyés par e-mail. `NEXT_PUBLIC_APP_URL` reste accepté.              |
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
4. Renseigner la _Site URL_ du projet et ajouter `<APP_URL>/auth/callback` aux _Redirect URLs_.

### PostgreSQL local

`npm run db:setup` crée les rôles `anon` / `authenticated` / `service_role`, le schéma `auth`
(`auth.users`, `auth.uid()`) et applique les migrations. Les comptes de l'adaptateur `local`
sont stockés dans `auth.users` avec un hachage scrypt.

## Scripts

| Commande                                     | Description                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`            | Next.js                                                                 |
| `npm run lint` · `typecheck` · `format`      | Qualité                                                                 |
| `npm run test`                               | Tests unitaires (Vitest)                                                |
| `npm run test:integration`                   | Tests d'intégration PostgreSQL (RLS, services) — base `patrimoine_test` |
| `npm run test:e2e`                           | Playwright (build + serveur de test automatiques)                       |
| `npm run assets:generate`                    | Régénère les sprites _placeholder_ et `asset-manifest.json`             |
| `npm run assets:catalogue -- <fichier.html>` | Planche de contact de tous les sprites, pour revue visuelle             |
| `npm run check`                              | lint + typecheck + tests + build                                        |

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
   `…pooler.supabase.com`), proposé par Supabase exactement pour ce cas. Le _Transaction pooler_
   ne convient pas ici : il est destiné à l'exécution de l'application, pas aux migrations.

   Si le mot de passe contient des caractères spéciaux, encodez-les en pourcentage dans l'URI.

   Ne pas lancer `npm run db:setup` sur Supabase : les rôles et le schéma `auth` y existent déjà.

   **Sans terminal**, utilisez l'éditeur SQL de Supabase : ouvrez `scripts/supabase-setup.sql`,
   copiez tout le fichier, collez-le dans Supabase → SQL Editor → Run. Ce fichier est généré par
   `npm run db:sql` à partir des migrations et renseigne aussi le journal de Drizzle, si bien
   qu'un futur `npm run db:migrate` verra les migrations comme déjà appliquées au lieu de les
   rejouer. Il s'exécute une seule fois, sur une base vide.

3. **Déclarer les variables sur Vercel** (Settings → Environment Variables), pour _Production_ et _Preview_ :

   | Variable            | Valeur                                                                       |
   | ------------------- | ---------------------------------------------------------------------------- |
   | `DATABASE_URL`      | URI du **Transaction pooler** Supabase (port 6543), adapté au serverless     |
   | `AUTH_PROVIDER`     | `supabase`                                                                   |
   | `SUPABASE_URL`      | `https://<ref>.supabase.co`                                                  |
   | `SUPABASE_ANON_KEY` | clé `anon` ou clé `sb_publishable_…` du projet                               |
   | `APP_ENV`           | `production`                                                                 |
   | `APP_URL`           | facultatif : déduit de l'URL Vercel, à définir si les liens e-mail sont faux |
   | `DATABASE_POOL_MAX` | facultatif : 5 par défaut, adapté au serverless                              |

   Ces deux variables sont aussi acceptées sous les noms `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, qui sont ceux
   affichés par Supabase. **Préférez les noms sans préfixe** : l'application n'utilise jamais
   Supabase dans le navigateur, donc rien n'a besoin d'être exposé côté client, et l'hébergeur
   n'affiche alors aucun avertissement sur le préfixe public. La clé « publishable »
   (`sb_publishable_…`) et l'ancienne clé `anon` se placent indifféremment dans la même variable.
   Les étapes « Install packages » et « Add files » proposées par la fenêtre _Connect_ de Supabase
   ne concernent pas ce projet : le client, le rafraîchissement de session et le middleware
   existent déjà (`src/lib/auth/supabase/`, `src/proxy.ts`).

4. **Supabase → Authentication → URL Configuration**, deux réglages distincts :
   - **Site URL** : `https://<domaine>`. Sa valeur par défaut est `http://localhost:3000`, ce qui
     fait pointer les e-mails de confirmation vers votre machine.
   - **Redirect URLs** : ajouter `https://<domaine>/auth/callback`. Une adresse de redirection
     absente de cette liste est ignorée par Supabase, qui retombe alors sur la _Site URL_.

   Les e-mails déjà envoyés conservent l'ancien lien : demandez-en un nouveau après correction.

   Le message de confirmation d'inscription est fourni dans
   `supabase/emails/confirm-signup.html`, à coller dans Authentication → Emails → _Confirm signup_,
   avec pour objet « Confirmez votre adresse e-mail ».

5. **Redéployer** : les variables d'environnement ne sont lues qu'au déploiement suivant.

6. **Vérifier** `https://<domaine>/api/health` :

   ```json
   { "status": "ok", "database": { "ok": true }, "rls": { "ok": true } }
   ```

### Diagnostic d'un déploiement

`/api/health` indique précisément ce qui manque, sans jamais exposer de valeur secrète.

| Réponse                                             | Cause                                            | Correction                                                                             |
| --------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `"status": "unconfigured"` avec `missing`           | variables d'environnement absentes               | définir les variables listées, puis **redéployer**                                     |
| `database.ok: false`                                | base injoignable ou URI incorrecte               | vérifier `DATABASE_URL` : Transaction pooler, mot de passe encodé, caractères spéciaux |
| `rls.ok: false`                                     | le rôle `authenticated` n'a pas accès aux tables | vérifier que le schéma est installé, puis appliquer les droits ci-dessous              |
| `configuration.appUrl` vaut `http://localhost:3000` | l'URL publique n'a pas pu être déduite           | définir `APP_URL`, sinon les liens envoyés par e-mail pointeront vers localhost        |
| `"status": "ok"`                                    | tout fonctionne                                  | —                                                                                      |

Le contrôle `rls` lit réellement une table sous le rôle `authenticated` : il couvre donc à la fois
le basculement de rôle et les droits de ce rôle sur les tables. Supabase accorde ces droits
automatiquement aux tables créées dans `public` ; si ce n'était pas le cas, exécutez ceci dans le
SQL Editor :

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

Ces droits ne contournent pas la RLS : les policies restent seules juges des lignes visibles.

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
