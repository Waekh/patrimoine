# Sécurité — Patrimoine.net

Les données patrimoniales sont sensibles. Principe : **NEVER TRUST THE CLIENT**.

## 1. Authentification

- Supabase Auth (`@supabase/ssr`) en production : session en cookies `httpOnly`, rafraîchie par `src/proxy.ts`.
- `requireUser()` (serveur) est la seule source de vérité de l'identité ; la protection dans `proxy.ts` est optimiste.
- L'adaptateur `local` (développement / tests) est **désactivé en production** : `createAuthService()` lève une erreur si `NODE_ENV=production` et `AUTH_PROVIDER=local`.
- Mots de passe : minimum 8 caractères ; hachage délégué à Supabase (bcrypt) ou `scrypt` (adaptateur local uniquement).

## 2. Autorisation

- Chaque table applicative porte `user_id` et RLS est **activée** avec des policies explicites `auth.uid() = user_id` pour `select / insert / update / delete` sur le rôle `authenticated`.
- Les accès serveur passent par `withUserDb(userId, ...)` qui bascule sur le rôle `authenticated` et injecte `request.jwt.claims` dans la transaction : RLS s'applique aux requêtes Drizzle.
- Les requêtes filtrent aussi par `user_id` (défense en profondeur).
- Tests d'intégration (`tests/integration/rls.test.ts`) : l'utilisateur A ne peut ni lire, ni modifier, ni supprimer les actifs, dettes ou snapshots de l'utilisateur B.
- La clé `service_role` n'est jamais exposée au client ; `getAdminDb()` n'est utilisé que par le seed et l'adaptateur d'auth local.

## 3. Validation

- Toute entrée (formulaire, action serveur, route handler) est validée par Zod (`src/lib/validation/`) : montants (entiers, bornés), devises (enum), dates, tickers (regex), catégories (enum), identifiants (uuid).
- Les montants arrivent en centimes entiers ; les valeurs négatives sont refusées pour les actifs.

## 4. Secrets

- Aucune clé secrète dans le client, `public/` ou `NEXT_PUBLIC_*`.
- `.env` est ignoré par Git ; `.env.example` documente les variables.
- `SUPABASE_SERVICE_ROLE_KEY` est optionnelle et réservée au serveur.

## 5. Journalisation

- `src/lib/logger.ts` : logs structurés, niveaux, **jamais** de montants, de listes d'actifs, de tokens, de mots de passe ni d'adresses.
- Les erreurs serveur sont journalisées avec un identifiant ; l'utilisateur voit « Une erreur est survenue. Veuillez réessayer. »

## 6. Confidentialité

- La localisation d'un bien immobilier n'est jamais rendue publiquement (pas dans `/demo`, pas dans le monde).
- Aucun IBAN, numéro de compte ou document n'est collecté.

## 7. En‑têtes et transport

- `next.config.ts` définit `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.
- Cookies `sameSite=lax`, `secure` hors développement.

## 8. Dépendances

- `npm audit` : `drizzle-kit` dépend d'une version d'`esbuild` signalée (advisory GHSA‑67mh‑4wv8‑2f99, serveur de dev esbuild). Impact limité à l'outillage de migration en développement ; aucune exposition en production. À réévaluer à chaque mise à jour de `drizzle-kit`.

## 9. Checklist livraison

```
[ ] RLS activée et policies présentes pour chaque table
[ ] withUserDb utilisé pour tout accès utilisateur
[ ] Validation Zod côté serveur
[ ] Aucun secret dans Git
[ ] Logs sans données sensibles
[ ] Tests d'isolation inter‑utilisateurs verts
```
