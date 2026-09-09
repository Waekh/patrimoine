# Pixel Art Bible — Patrimoine.net

Référence obligatoire pour tout asset du monde. Un asset qui ne respecte pas ces
règles n'entre pas dans le manifest.

## 1. Projection

- 2D isométrique « 2:1 » : une tuile au sol mesure **64 × 32 px** (losange).
- Axes : `x` vers le bas‑droite, `y` vers le bas‑gauche.
- Conversion grille → écran :
  `screenX = (x − y) × 32`, `screenY = (x + y) × 16`.
- Tous les sprites utilisent exactement cet angle. Aucune rotation.

## 2. Résolution et rendu

- Pixels nets, **aucune interpolation** : `TextureSource.defaultOptions.scaleMode = 'nearest'`, `roundPixels: true`, zoom par paliers (0.5, 1, 2, 3).
- Aucun anti‑aliasing, aucune bordure floue, aucun gradient lisse, pas de 3D, pas de photoréalisme.
- Transparence réelle (PNG RGBA), pas de fond magenta.

## 3. Échelle

| Type               | Largeur | Hauteur max | Emprise au sol |
| ------------------ | ------- | ----------- | -------------- |
| Tuile terrain      | 64      | 32          | 1 × 1          |
| Route              | 64      | 32          | 1 × 1          |
| Arbre              | 32      | 48          | 1 × 1          |
| Personnage         | 16      | 32          | 1 × 1          |
| Maison (lv1‑5)     | 64      | 64–96       | 1 × 1          |
| Banque / financier | 64–128  | 96–128      | 1 × 1 à 2 × 2  |
| Immeuble           | 64–128  | 96–160      | 1 × 1 à 2 × 2  |
| Voiture            | 50–52   | 41–44       | 1 × 1          |
| Buisson            | 24      | 20          | 1 × 1          |
| Lampadaire         | 16      | 46          | 1 × 1          |

Le point d'ancrage d'un sprite est le **centre du losange de base**
(`anchor.x = largeur / 2`, `anchor.y = hauteur − 16` pour une emprise 1 × 1).

## 4. Lumière et ombres

- Source lumineuse unique : en haut à gauche.
- Face gauche des volumes : teinte de base ; face droite : teinte assombrie (−18 % luminance) ; toit : teinte éclaircie (+12 %).
- Ombre portée : losange sombre semi‑transparent (alpha 0,35) posé vers le bas‑droite, sans dégradé.
- Contours : 1 px, couleur sombre de la palette (jamais noir pur `#000`).

## 5. Palette (`src/config/pixel-palette.ts`)

| Nom            | Hex       | Usage                         |
| -------------- | --------- | ----------------------------- |
| `outline`      | `#2b2a33` | contours                      |
| `grass`        | `#7fb069` | terrain                       |
| `grass-dark`   | `#5f8d4e` | ombre terrain                 |
| `water`        | `#4f8fc0` | eau                           |
| `water-dark`   | `#3a6f9c` | eau profonde                  |
| `road`         | `#585765` | enrobé                        |
| `road-dark`    | `#43424e` | grain de l'enrobé             |
| `road-line`    | `#e8e4d8` | marquage et passages piétons  |
| `pavement`     | `#c6c3ba` | trottoirs                     |
| `pavement-dark`| `#a5a299` | joints de dalles              |
| `wall`         | `#e7d8bf` | murs maisons                  |
| `wall-dark`    | `#c8b593` | murs côté ombre               |
| `roof`         | `#b8433a` | toits maisons                 |
| `roof-dark`    | `#8e332c` | toits ombre                   |
| `stone`        | `#b9bcc4` | banques                       |
| `stone-dark`   | `#8f939c` | banques ombre                 |
| `glass`        | `#7fc3d8` | vitrage financier             |
| `glass-dark`   | `#4e93a8` | vitrage ombre                 |
| `brick`        | `#c9775a` | immeubles                     |
| `brick-dark`   | `#9a5540` | immeubles ombre               |
| `wood`         | `#8a6a45` | entrepôts, troncs             |
| `leaf`         | `#4f9a4a` | feuillage                     |
| `leaf-dark`    | `#356d33` | feuillage ombre               |
| `gold`         | `#e0b84a` | accents (coffre)              |
| `skin`         | `#f1c9a5` | personnages                   |
| `goldDark`     | `#a8862f` | ombre des accents dorés       |
| `windowLit`    | `#f2c96b` | fenêtre éclairée              |
| `windowDark`   | `#3c4a58` | fenêtre éteinte               |
| `glassPane`    | `#8fd0e2` | vitrage des tours             |
| `metal`        | `#9aa4ae` | bardage, toitures métalliques |
| `metalDark`    | `#6f7a86` | ombre du métal                |
| `concrete`     | `#cfcabd` | dalles de toiture, socles     |
| `concreteDark` | `#a7a396` | ombre du béton                |
| `awning`       | `#3f7d6a` | stores et auvents             |

Toute nouvelle couleur doit dériver de ces bases (± 12 % luminance).

## 6. Détail des volumes

Les bâtiments ne sont pas des boîtes nues. Chaque volume porte, dessinés dans le
repère de la face pour suivre la pente 2:1 :

- un **soubassement** de 4 px, plus sombre, qui pose le bâtiment au sol ;
- une **texture de matériau** : joints de brique, assises de pierre, nervures du
  bardage métallique, meneaux du vitrage ;
- des **bandeaux d'étage** d'un pixel marquant les niveaux ;
- des **fenêtres** de deux pas de large avec appui, dont certaines éclairées,
  tirées d'un générateur pseudo-aléatoire à graine fixe pour rester identiques
  d'un rendu à l'autre ;
- une **entrée** au rez-de-chaussée, propre au type de bâtiment ;
- une **couronne** : acrotère et accessoires de toiture, ou toiture en pente
  avec faîtage et cheminée.

Le tramage en damier entre deux teintes remplace tout dégradé.

Les toitures en pente sont empilées : chaque assise perd 2 px de large et 1 px
de haut, ce qui donne exactement la pente 2:1 de la projection. Le versant droit
est ensuite réassombri d'un bloc, et le faîtage plat garde la teinte éclairée
puisqu'il regarde le ciel.

Les bâtiments d'un quartier portent l'emblème de leur famille sur une plaque
en haut de façade : `€` pour le quartier bancaire, `%` pour le quartier
financier. Elle n'est dessinée que si le mur est assez haut pour la porter, si
bien que l'immeuble qui ancre un îlot l'affiche et pas ses petits voisins. Une
façade qui se signale déjà seule, comme la porte ronde d'un coffre, n'en reçoit
pas.

Les entrées portent l'identité du bâtiment : porte de bois, portail à fronton,
rideau métallique avec quai de chargement, porte de coffre circulaire à jante
dorée, ou vitrine avec store.

Les tuiles de sol ne sont jamais un aplat : herbe mouchetée en trois verts,
crêtes d'eau suivant la pente 2:1, enrobé grenu bordé d'une bordure claire sur
les deux arêtes hautes.

Chaque bâtiment porte une entrée lisible au rez-de-chaussée, quelle que soit sa
hauteur : baie en retrait, vantaux sombres à imposte éclairée, auvent et deux
marches. Les vantaux prennent une teinte sombre qui leur est propre et non une
teinte dérivée du mur, sans quoi la porte d'une tour de verre disparaîtrait dans
sa façade.

## 7. Texte dans le monde

Le texte affiché dans la scène passe par une police bitmap 5x7 (`font_5x7`) et
jamais par une police système, qui serait lissée au milieu de pixels nets.

- Les métriques et l'ordre des caractères vivent dans `src/config/pixel-font.ts`,
  lu à la fois par le générateur, qui dessine l'atlas, et par le moteur, qui y
  découpe les glyphes. Les deux ne peuvent donc pas diverger.
- Le jeu de caractères est volontairement réduit : capitales, chiffres,
  ponctuation courante et les accents du français. Les libellés sont mis en
  capitales et les caractères inconnus deviennent des espaces.
- Chaque bâtiment porte un panneau planté devant lui, décalé vers la face droite
  pour ne pas masquer la porte. Le libellé de l'actif y est réparti sur deux
  lignes, coupé par un point final s'il dépasse encore.
- Les trois tuiles devant un bâtiment sont réservées : un arbre planté là
  passerait devant le panneau et masquerait le texte.

## 8. Niveaux

Un bâtiment de niveau supérieur est plus haut et/ou plus large, jamais d'un
autre style. Les niveaux 1 à 5 partagent la même base et la même palette.

## 9. La rue

Une rue fait deux cases de large — une chaussée par sens — et est bordée d'une
case de **trottoir** de chaque côté. Le trottoir est du terrain : rien ne s'y
construit, et les quartiers s'arrêtent avant lui. C'est ce qui donne aux
bâtiments une façade sur rue au lieu d'une pelouse.

Le marquage suit les axes du sol, jamais l'écran. La chaussée côté axe médian
porte la ligne discontinue sur l'arête qu'elle partage avec la voie opposée :
une seule des deux cases la dessine, sinon la ligne apparaît en double. L'autre
arête porte la ligne continue du caniveau. Le carrefour lui-même ne porte aucun
marquage — deux jeux de lignes qui se croisent ne se lisent plus.

Les **passages piétons** occupent les quatre abords du carrefour, une case au
delà de celui-ci. Leurs bandes sont parallèles à la circulation.

Les **lampadaires** sont la seule décoration posée sur une case occupée : ils
se tiennent sur le trottoir, tous les six pas. Les piétons marchent sur le
trottoir, jamais sur l'enrobé.

## 10. Véhicules

Une voiture existe en **quatre orientations**, une par sens de circulation :
`north` (vers le haut à droite), `east` (bas droite), `south` (bas gauche),
`west` (haut gauche). Aucune orientation n'est obtenue par symétrie : la
lumière du monde vient du haut à gauche, un miroir la ferait venir du mauvais
côté.

Les pixels sont dans `scripts/lib/car-sprite-data.ts` (planche indexée, une
palette de quatorze teintes propre aux véhicules). Le générateur ne fait que
poser l'ombre au sol, recolorer la carrosserie et enregistrer le sprite. Les
déclinaisons rouge et sable sont des rotations de teinte des seules cases de
carrosserie : vitrage, roues, feux et contour restent identiques, sans quoi les
vitres viraient au vert.

L'ancrage d'une voiture n'est pas la formule générale : c'est le point de
contact au sol mesuré sur l'art de référence, ce qui garantit que les quatre
orientations posent la voiture au même endroit de la tuile.

## 11. Placeholders

Les sprites **générés par script** (`scripts/generate-placeholder-assets.ts`)
portent `"placeholder": true` dans le manifest. Ils respectent la projection,
l'échelle, la palette et l'ancrage, et servent de gabarit pour les assets
finaux. Un placeholder n'est jamais présenté comme un asset final. Les
voitures, qui viennent d'un art de référence, portent `false`.

## 12. Manifest (`public/assets/asset-manifest.json`)

```json
{
  "id": "house_lv1",
  "type": "building",
  "category": "real_estate",
  "level": 1,
  "file": "world/buildings/house_lv1.png",
  "width": 64,
  "height": 80,
  "anchor": { "x": 32, "y": 64 },
  "footprint": { "w": 1, "h": 1 },
  "placeholder": true
}
```

Le code n'utilise que `id`. Un fichier peut changer sans toucher au code.
