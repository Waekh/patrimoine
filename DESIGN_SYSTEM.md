# Design System — Patrimoine.net

Le monde et l'interface partagent le même langage graphique. Le projet a d'abord
opposé une UI contemporaine à un monde rétro ; ce choix a été inversé, parce que
le contraste faisait lire la scène comme une image collée dans un tableau de
bord générique.

## 1. Principes

- Toutes les couleurs viennent de la palette du monde (`src/config/pixel-palette.ts`)
  ou en dérivent. Le contraste WCAG AA est vérifié par `src/app/globals.test.ts`,
  qui lit les tokens directement dans la feuille de style.
- Aucun angle arrondi sur les contrôles et aucun flou : le monde n'en a pas non
  plus. Les rayons valent 0 et aucune ombre n'a de rayon de flou.
- **Deux repères de profondeur, jamais mélangés.** Ce qui se clique est en
  relief : `.hard-shadow` décale l'ombre de 2 px, `.pressable` déplace l'élément
  sur son ombre à l'activation. Ce qui se remplit est en creux : `.sunken` porte
  la même ombre vers l'intérieur. Boutons, cartes, panneaux et blocs d'options
  sont en relief ; champs, listes déroulantes et barres de progression en creux.
- Bordures de 2 px en `--color-ink`, la teinte du contour des sprites, pour tout
  bloc autonome. Le trait fin `--color-border` ne sert plus qu'aux séparateurs
  internes.
- Rien de continu : la barre de progression est faite de blocs, la répartition
  patrimoniale a des bouts droits, le témoin de chargement est une marquise de
  trois carrés et non un anneau qui tourne, et `.blink` clignote en deux états
  au lieu de fondre.
- Les icônes ont un trait de 2 px à bouts carrés et `shapeRendering: crispEdges`.
- Typographie nette, hiérarchie claire, espaces blancs. La police reste Geist :
  une police bitmap serait illisible en corps de texte. Le pixel n'est utilisé
  que dans la scène, où `font_5x7` dessine les enseignes.
- Animations courtes (≤ 200 ms), micro‑interactions, respect de `prefers-reduced-motion`.
- Jamais : emojis, gradients violets génériques, glassmorphism massif, ombres lourdes,
  illustrations stock, boutons géants, textes marketing artificiels.
- Les icônes sont des SVG monochromes (`src/components/ui/icons.tsx`).

## 2. Tokens (Tailwind 4, `src/app/globals.css`)

| Token               | Valeur (clair) | Usage                           |
| ------------------- | -------------- | ------------------------------- |
| `--color-bg`        | `#f2ede2`      | fond de page (parchemin)        |
| `--color-surface`   | `#fdfbf6`      | cartes, panneaux                |
| `--color-surface-2` | `#ece6d9`      | fond secondaire, lignes zébrées |
| `--color-border`    | `#cfc7b4`      | séparateurs discrets            |
| `--color-ink`       | `#2b2a33`      | contour des contrôles et ombres |
| `--color-fg`        | `#2b2a33`      | texte principal                 |
| `--color-fg-muted`  | `#5c5749`      | texte secondaire                |
| `--color-accent`    | `#356d33`      | actions primaires (`leafDark`)  |
| `--color-accent-fg` | `#ffffff`      | texte sur accent                |
| `--color-positive`  | `#276b3b`      | variation positive              |
| `--color-negative`  | `#8f2f28`      | variation négative (toit)       |
| `--color-warning`   | `#7a5810`      | avertissements (or assombri)    |
| `--color-focus`     | `#3a6f9c`      | anneau de focus (`waterDark`)   |

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
