# Design System — Patrimoine.net

Le monde est rétro (pixel art). L'interface est contemporaine. Le contraste est
voulu : une UI calme, précise et dense entoure une scène vivante.

## 1. Principes

- Typographie nette, hiérarchie claire, espaces blancs.
- Bordures discrètes (1 px), rayons modérés (6–10 px), ombres légères ou absentes.
- Animations courtes (≤ 200 ms), micro‑interactions, respect de `prefers-reduced-motion`.
- Jamais : emojis, gradients violets génériques, glassmorphism massif, ombres lourdes,
  illustrations stock, boutons géants, textes marketing artificiels.
- Les icônes sont des SVG monochromes (`src/components/ui/icons.tsx`).

## 2. Tokens (Tailwind 4, `src/app/globals.css`)

| Token               | Valeur (clair) | Usage                            |
| ------------------- | -------------- | -------------------------------- |
| `--color-bg`        | `#f6f5f2`      | fond de page                     |
| `--color-surface`   | `#ffffff`      | cartes, panneaux                 |
| `--color-surface-2` | `#f0eee9`      | fond secondaire, lignes zébrées  |
| `--color-border`    | `#e3e0d8`      | bordures                         |
| `--color-fg`        | `#17181a`      | texte principal                  |
| `--color-fg-muted`  | `#6b6e75`      | texte secondaire                 |
| `--color-accent`    | `#1f6f5b`      | actions primaires (vert profond) |
| `--color-accent-fg` | `#ffffff`      | texte sur accent                 |
| `--color-positive`  | `#1f7a4d`      | variation positive               |
| `--color-negative`  | `#b23a3a`      | variation négative               |
| `--color-warning`   | `#9a6b00`      | avertissements                   |
| `--color-focus`     | `#2f6fdd`      | anneau de focus                  |

Le mode sombre inverse les surfaces (`#121314`, `#1a1b1d`) et conserve les accents.

Police : `Geist` (sans) pour l'UI, `Geist Mono` pour les montants tabulaires.
Les montants utilisent `font-variant-numeric: tabular-nums`.

## 3. Composants (`src/components/ui`)

| Composant                     | Notes                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `Button`                      | variantes `primary`, `secondary`, `ghost`, `danger` ; tailles `sm`, `md` ; état `loading` |
| `Input`, `Select`, `Textarea` | label obligatoire, `error` textuel lié par `aria-describedby`                             |
| `CurrencyInput`               | saisie en euros, conversion en centimes, formatage Intl                                   |
| `PercentageInput`             | saisie en %, stockage en points de base                                                   |
| `Card`, `Panel`               | surfaces ; `Panel` a un en‑tête et une action de fermeture                                |
| `Modal`, `Drawer`             | fermeture clavier (Échap), focus piégé, `aria-modal`                                      |
| `Tabs`                        | navigation clavier flèches                                                                |
| `Tooltip`                     | apparaît au focus et au survol                                                            |
| `Progress`                    | barre de progression accessible (`role=progressbar`)                                      |
| `Toast`                       | annonces `aria-live=polite`, disparition automatique                                      |
| `Metric`                      | libellé + valeur + variation (couleur **et** signe)                                       |
| `AssetCard`                   | résumé d'un actif                                                                         |
| `EmptyState`                  | titre, description, action                                                                |
| `Skeleton`                    | chargement                                                                                |
| `ErrorState`                  | message générique + « Réessayer »                                                         |

## 4. Formatage

- `formatCurrency(money)` → `102 430 €` (Intl, `fr-FR`, sans décimales par défaut).
- `formatPercentage(bps)` → `+8,42 %` (signe explicite).
- Jamais de concaténation manuelle `value + " €"`.

## 5. Accessibilité

- WCAG AA : contraste ≥ 4,5:1 pour le texte.
- Toute information du monde existe en texte (liste des bâtiments dans `/world` et `/patrimoine`).
- Focus visible partout, navigation clavier complète, `aria-live` pour les statuts (« Sauvegardé »).
- Les erreurs de formulaire sont textuelles, jamais uniquement colorées.

## 6. Layout

- Desktop : navigation latérale gauche (200 px), contenu à droite. `/world` : scène + side panel droit (360 px).
- Mobile (< 768 px) : barre de navigation basse ; `/world` : scène plein écran + bottom sheet.
- Largeur max de lecture : 1120 px.

## 7. Microcopy

Simple, précis, sobre. « Ajouter un actif », « Patrimoine net », « Sauvegardé ».
Jamais infantilisant, jamais anxiogène.
