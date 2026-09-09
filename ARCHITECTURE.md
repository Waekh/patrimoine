# Architecture — Patrimoine.net

## 1. Principe fondamental

```
USER DATA → DOMAIN MODEL → WEALTH ENGINE → WORLD MODEL → WORLD ENGINE → PIXEL ART ASSETS
```

- La base de données est la source de vérité.
- Les services métier (`src/services`) sont purs et testables, sans React ni PixiJS.
- Le monde (`src/game`) est une représentation dérivée ; il ne persiste rien.
- Les assets graphiques sont adressés par identifiant via un manifest, jamais par nom de fichier.

## 2. Stack

| Couche          | Choix                                                 |
| --------------- | ----------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)                    |
| UI              | React 19, TypeScript strict, Tailwind CSS 4           |
| Monde           | PixiJS 8                                              |
| Base de données | PostgreSQL 16 (Supabase en production)                |
| ORM             | Drizzle ORM + drizzle-kit (migrations SQL)            |
| Auth            | Supabase Auth (`@supabase/ssr`)                       |
| Validation      | Zod 4                                                 |
| Tests           | Vitest (unitaires + intégration DB), Playwright (E2E) |
| Qualité         | ESLint 9 (config Next), Prettier                      |

## 3. Arborescence

```
src/
├── app/                 Routes Next.js (pages, layouts, route handlers)
│   ├── (public)/        home, /demo
│   ├── (auth)/          /login, /register, /forgot-password, /reset-password
│   ├── (app)/           routes protégées : /world, /patrimoine, /assets, ...
│   ├── onboarding/
│   └── auth/callback    échange de code Supabase
├── components/          ui/, charts/, forms/, layout/
├── features/            code React propre à un domaine (auth, onboarding, assets, world, ...)
├── game/                moteur PixiJS : engine, camera, rendering, entities, map, animation
├── services/            services métier purs : finance, valuation, world, market-data
├── db/                  schema/ (Drizzle), queries/, migrations/, client
├── lib/                 auth/, validation/, formatting/, i18n/, utils/, result
├── config/              seuils, niveaux, catégories, devises (aucun seuil ailleurs)
└── types/               types partagés
public/assets/world/     sprites (placeholders générés par script)
public/assets/asset-manifest.json
scripts/                 setup DB locale, seed, génération des placeholders
tests/                   integration/ (Postgres), e2e/ (Playwright)
```

## 4. Modèle de données

Toutes les tables applicatives portent `user_id` et sont protégées par RLS.

| Table                 | Rôle                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | `id` (uuid = sujet Supabase Auth), `email`, timestamps                                                                                                            |
| `assets`              | actifs financiers, `category` (enum `asset_category`), `current_value_cents`, `currency`, `valuation_type` (`MANUAL`/`MARKET`), `ticker`, `quantity`, `is_active` |
| `real_estate_details` | 1‑1 avec un actif `REAL_ESTATE` : `property_type`, `purchase_price_cents`, `purchase_date`, `location`, `monthly_rent_cents`                                      |
| `liabilities`         | `type` (enum), `initial_amount_cents`, `remaining_amount_cents`, `interest_rate_bps`, `monthly_payment_cents`, `linked_asset_id`                                  |
| `income_sources`      | `type`, `frequency`, `amount_cents`, `currency`                                                                                                                   |
| `portfolio_snapshots` | `(user_id, date)` unique, `gross_assets_cents`, `liabilities_cents`, `net_worth_cents`, `currency`                                                                |
| `onboarding_progress` | `user_id` PK, `current_step`, `answers` (jsonb validé par Zod), `completed_at`                                                                                    |

### Décision : montants en centimes entiers

- **Decision** : tous les montants sont stockés en `bigint` (centimes) et manipulés en `number` entier côté TypeScript (type `Money = { amountCents, currency }`).
- **Reason** : évite les erreurs flottantes ; `Number.MAX_SAFE_INTEGER` couvre ~90 000 milliards d'euros.
- **Alternatives** : `numeric` + bibliothèque décimale (dépendance supplémentaire, sérialisation string partout).

### Décision : `remaining_debt` de l'immobilier vit dans `liabilities`

- **Decision** : le formulaire immobilier propose « dette restante », mais la valeur est persistée comme une `liability` de type `MORTGAGE` liée via `linked_asset_id`.
- **Reason** : un seul calcul des dettes, aucune duplication du capital restant dû.

## 5. Sécurité des données : RLS réellement appliquée

- **Decision** : chaque accès aux données d'un utilisateur passe par `withUserDb(userId, fn)` (`src/db/user-db.ts`), qui ouvre une transaction, exécute `SET LOCAL ROLE authenticated` et `set_config('request.jwt.claims', '{"sub": "<uid>"}', true)`, puis exécute les requêtes. Les policies RLS utilisent `auth.uid()`.
- **Reason** : sur Supabase, la connexion directe (`postgres`) contourne RLS. En basculant sur le rôle `authenticated` dans la transaction, les policies s'appliquent aussi aux requêtes Drizzle ; les tests d'intégration vérifient l'isolation entre utilisateurs.
- **Alternatives** : ne compter que sur le filtrage `user_id` en code (fragile) ; passer par PostgREST (perte de Drizzle et des transactions).
- Les requêtes filtrent aussi explicitement par `user_id` : défense en profondeur.
- L'accès admin (`getAdminDb()`) est réservé au seed, aux migrations et à l'adaptateur d'auth local.

## 6. Authentification

- **Decision** : une frontière unique `src/lib/auth/` expose `AuthService` (`signUp`, `signIn`, `signOut`, `getCurrentUser`, `requestPasswordReset`, `updatePassword`). Deux adaptateurs :
  - `SupabaseAuthAdapter` (production, `AUTH_PROVIDER=supabase`) ;
  - `LocalAuthAdapter` (`AUTH_PROVIDER=local`, uniquement `NODE_ENV !== 'production'`) : mots de passe hachés (scrypt) dans la table `auth.users` du shim local, session dans un cookie signé HMAC.
- **Reason** : le projet doit démarrer avec `npm install && npm run dev` et les tests E2E doivent tourner sans projet Supabase ni réseau. L'adaptateur local refuse de démarrer en production.
- **Alternatives** : Supabase CLI local (Docker requis) ; mocks réseau de GoTrue (fragiles).
- Le fichier `src/proxy.ts` rafraîchit la session Supabase et protège les routes de manière optimiste ; la vérification réelle est faite dans les layouts serveur (`requireUser()`).

## 7. Flux de données

```
Server Component / Server Action
   → requireUser()                 (lib/auth)
   → validation Zod                (lib/validation)
   → service métier                (services/*)
   → withUserDb(userId, tx => queries) (db/queries/*)
   → Result<T, E> typé             (lib/result)
   → UI (état loading / error / empty)
```

Aucune requête SQL dans les composants. Aucune logique métier dans `page.tsx`.

## 8. Moteur de monde

```
assets + liabilities
   → WealthCalculationService  → WealthSummary
   → WealthScoreService        → wealthScore, worldLevel, cityLevel
   → WealthToWorldService      → WorldEntity[] (type, level, assetId)
   → WorldLayoutEngine         → îlots par quartier, collisions validées, seed déterministe
   → WorldState (JSON sérialisable)
   → PixiJS WorldRenderer      → sprites via asset-manifest, z-order par (y, x)
```

Chaque famille d'actifs a son quartier (`src/config/districts.ts`), et les
bâtiments d'un quartier sont **accolés** : ils forment une rangée qui part du
carrefour central, l'actif le plus important en tête d'îlot, les autres à sa
suite, avec une rue entre deux rangées. C'est ce qui fait lire un quartier comme
un îlot plutôt que comme des bâtiments dispersés. Conséquence assumée : un
bâtiment qui passe en emprise 2x2 décale ceux qui le suivent dans sa rangée.

Frontière React ↔ PixiJS : `WorldCanvas` (composant client) instancie `WorldApp`
(classe PixiJS) et communique par un petit bus d'événements typé
(`select`, `hover`, `camera`). Aucun DOM React dans PixiJS, aucun appel
PixiJS ailleurs que dans `src/game`.

## 9. Données de marché

`MarketDataProvider` (`getQuote`, `getHistoricalPrices`, `getExchangeRate`)
→ `MarketDataService` (cache mémoire, fraîcheur, gestion d'absence)
→ `ValuationService` (valorisation `MARKET` = quantité × cours, sinon `MANUAL`).
Le fournisseur est choisi par `MARKET_DATA_PROVIDER` (`mock` par défaut).

## 10. Erreurs

Type `Result<T, E>` (`ok`/`err`). Les services renvoient des erreurs typées
(`AppError` avec `code`), les actions serveur les traduisent en messages
utilisateur génériques ; les détails sont journalisés côté serveur sans données
sensibles (`src/lib/logger.ts`).

## 11. Internationalisation

Textes centralisés dans `src/lib/i18n/messages.fr.ts` accessibles via `t()`.
Locale et devise de référence dans `src/config/locale.ts`.

## 12. Environnements

`development` (Postgres local + auth locale), `preview` et `production`
(Supabase). Aucun test n'utilise de données de production.

## 13. Décisions complémentaires (implémentation)

### Onboarding : brouillon JSON puis matérialisation

- **Decision** : les réponses du questionnaire sont sauvegardées à chaque étape dans `onboarding_progress.answers` (jsonb validé par Zod, `src/features/onboarding/schema.ts`). À l'étape « Génération du monde », `completeOnboarding` crée les actifs, dettes et revenus réels dans **une** transaction, marque l'onboarding terminé et enregistre le premier snapshot.
- **Reason** : l'utilisateur peut quitter et revenir sans jamais créer de demi-actifs ; le modèle de données reste la seule source de vérité après génération.
- **Alternatives** : créer les actifs à chaque étape (doublons et incohérences en cas de retour arrière).

### Autosave

- Chaque changement de champ déclenche, après 800 ms, l'action serveur `saveDraftAction` ; le bouton « Continuer » appelle `continueStepAction` qui valide strictement et avance. L'indicateur « Sauvegardé » est un `role="status"` `aria-live="polite"`.

### Snapshots

- Un snapshot par utilisateur et par jour (`unique (user_id, date)`), écrit dans la transaction de chaque mutation patrimoniale (`recalculateAndSnapshot`). La variation affichée compare les deux derniers jours distincts.

### Frontière React ↔ PixiJS

- `WorldCanvas` charge dynamiquement `src/game/engine/world-app.ts` (client uniquement) et ne lui passe que des données sérialisables (`WorldState`, manifest). Le moteur remonte `select`, `hover`, `camera`, `ready`, `error` via `WorldEventBus`. La sélection est un état React ; le moteur ne connaît ni les actifs ni la base.
- Un rendu impossible (WebGL indisponible) affiche un message et laisse la liste textuelle des bâtiments, qui reste la représentation accessible du monde.

### Rendu pixel art

- `TextureSource.defaultOptions.scaleMode = "nearest"`, `roundPixels: true`, `antialias: false`, zoom par paliers (0.5, 1, 2, 3), positions caméra arrondies au pixel.
- Ordre de rendu : `zIndexOf(position, footprint)` = (x + y) de la case la plus lointaine de l'emprise, déterministe.

### Valorisation marché

- `valuationType = MARKET` calcule `quantité × cours` uniquement si le cours est disponible dans la devise de l'actif ; sinon la valeur manuelle est conservée, `valued_at` reste nul et l'interface indique « Donnée indisponible ». Le fournisseur `mock` marque toutes ses données `freshness = "mock"`.

### Décision : un déploiement non configuré doit rester lisible

- **Decision** : `getConfigurationStatus()` (`src/config/env.ts`) évalue l'environnement sans lever d'exception. `getCurrentUser()` renvoie `null` si la configuration est incomplète ou si le fournisseur d'authentification échoue ; les pages publiques (accueil, `/demo`, 404) s'affichent, les pages d'authentification affichent « Service indisponible » et les routes protégées redirigent vers `/login`. `getServerEnv()` continue de lever une `ConfigurationError` pour les chemins qui ne peuvent pas fonctionner sans configuration.
- **Reason** : un déploiement dont les variables ne sont pas encore définies renvoyait une erreur serveur sur toutes les pages, sans indication de la cause. Traiter le visiteur comme anonyme est le comportement le moins privilégié et le plus sûr.
- **Alternatives** : laisser l'exception remonter (aucun diagnostic, page blanche) ; valider au build (impossible, les variables sont lues à l'exécution).

### Décision : endpoint de diagnostic `/api/health`

- **Decision** : `GET /api/health` renvoie l'état de la configuration (noms des variables manquantes, jamais de valeur), la joignabilité de la base et le succès du basculement vers le rôle `authenticated` utilisé par la RLS. Statut HTTP 200 (`ok`) ou 503 (`unconfigured` / `degraded`).
- **Reason** : le basculement de rôle est la dépendance non évidente de l'architecture RLS ; sur une base mal migrée, il échouerait seulement après connexion d'un utilisateur. Le vérifier explicitement rend un déploiement diagnosticable sans lire les journaux de la plateforme.
- **Alternatives** : s'en remettre aux journaux de l'hébergeur (lent, souvent tronqué).

### Décision : pool de connexions dimensionné pour le serverless

- **Decision** : `max` par défaut à 5 (surchargeable par `DATABASE_POOL_MAX`), `idle_timeout` 20 s, `connect_timeout` 15 s, `prepare: false`.
- **Reason** : chaque instance serverless ouvre son propre pool ; un `max` élevé multiplié par le nombre d'instances sature le pooler Supabase.

### Erreurs affichées

`src/app/error.tsx`, `src/app/global-error.tsx` et `src/app/not-found.tsx` rendent un message
générique en français avec la référence (`digest`) permettant de retrouver la trace côté serveur.
Aucune pile d'appels n'est exposée. `src/app/(app)/loading.tsx` évite l'écran vide pendant le
rendu serveur des pages protégées.
