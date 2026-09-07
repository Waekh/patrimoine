@AGENTS.md

# Patrimoine.net — guide de travail

Lire dans l'ordre : `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`,
`PIXEL_ART_BIBLE.md`, `SECURITY.md`. En cas d'ambiguïté : option la plus simple
et la plus maintenable, décision documentée dans `ARCHITECTURE.md`.

## Commandes

```
npm run dev            démarre Next.js
npm run db:setup       crée le shim auth + rôles + migrations sur la base locale
npm run db:migrate     applique les migrations (src/db/migrations)
npm run db:generate    génère une migration après modification du schéma
npm run db:seed        crée l'utilisateur de démonstration
npm run lint / typecheck / test / test:integration / test:e2e / build
```

## Règles non négociables

- Montants en centimes entiers avec devise explicite (`Money`). Jamais de `number` flottant pour de l'argent.
- Calcul patrimonial uniquement dans `src/services/finance/wealth-calculation.ts`.
- Seuils et niveaux uniquement dans `src/config/`.
- Catégories via les enums de `src/config/categories.ts`.
- Accès données via `withUserDb(userId, ...)` et `src/db/queries/*`. Jamais de SQL dans un composant.
- Formatage via `formatCurrency` / `formatPercentage` (`src/lib/formatting`).
- Textes UI via `src/lib/i18n`. Aucun emoji dans l'interface.
- PixiJS uniquement dans `src/game`. React uniquement hors de `src/game`.
- Assets via `asset-manifest.json` et identifiant, jamais par nom de fichier.
- `any` interdit ; `unknown` + validation Zod.
- Avant de terminer : `npm run lint && npm run typecheck && npm run test && npm run build`.
