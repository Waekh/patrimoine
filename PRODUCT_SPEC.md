# Patrimoine.net — Spécification produit

> "Your wealth becomes your world."

Patrimoine.net est une application de gestion patrimoniale qui transforme le
patrimoine financier de l'utilisateur en un monde 2D isométrique en pixel art.
Ce n'est ni un jeu d'argent, ni une plateforme de trading, ni un outil de
conseil financier. Le monde est une **représentation** ; le patrimoine saisi
par l'utilisateur est la **source de vérité**.

## 1. Vision

L'utilisateur renseigne son patrimoine. L'application le transforme en monde :

| Élément patrimonial                                     | Représentation dans le monde                                 |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| Résidence principale                                    | Maison (`HOUSE`)                                             |
| Immobilier locatif / autre                              | Immeuble (`APARTMENT`)                                       |
| SCPI                                                    | Quartier immobilier (`REAL_ESTATE_BUILDING`)                 |
| ETF, actions, PEA, CTO, obligations, assurance-vie, PEE | Bâtiments financiers (`FINANCIAL_BUILDING`, `MARKET`)        |
| Liquidités, épargne                                     | Banque / trésorerie (`BANK`, `VAULT`)                        |
| Crypto, véhicules, objets de collection, autres         | Entrepôt / district alternatif (`WAREHOUSE`)                 |
| Dettes                                                  | Indicateur visuel associé au bâtiment concerné (échafaudage) |
| Patrimoine net                                          | Niveau du monde (Hameau → Mégapole)                          |

## 2. Trois niveaux de lecture

1. **Mon monde** : la scène isométrique, plein écran, UI minimale.
2. **Mon patrimoine** : patrimoine net, actifs bruts, dettes, allocation.
3. **Les détails financiers** : chaque actif, chaque dette, l'historique.

L'utilisateur doit comprendre son patrimoine en quelques secondes.

## 3. Parcours MVP (vertical slice)

```
REGISTER → ONBOARDING → PRIMARY RESIDENCE → CASH → ETF → LIABILITY
        → NET WORTH → WORLD → BUILDINGS → DETAIL PANEL
```

Le MVP est terminé lorsque l'utilisateur peut :

1. créer un compte ;
2. se connecter ;
3. compléter le questionnaire ;
4. ajouter ses actifs ;
5. ajouter ses dettes ;
6. obtenir son patrimoine net ;
7. voir son monde ;
8. voir les bâtiments correspondants ;
9. cliquer sur un bâtiment ;
10. voir le détail financier ;
11. modifier un actif ;
12. voir le monde se mettre à jour ;
13. revenir plus tard ;
14. retrouver ses données.

## 4. Routes

| Route              | Rôle                                          | Accès          |
| ------------------ | --------------------------------------------- | -------------- |
| `/`                | Home publique                                 | public         |
| `/demo`            | Monde de démonstration (aucune donnée réelle) | public         |
| `/login`           | Connexion                                     | public         |
| `/register`        | Inscription                                   | public         |
| `/forgot-password` | Demande de réinitialisation                   | public         |
| `/reset-password`  | Nouveau mot de passe                          | public (jeton) |
| `/onboarding`      | Questionnaire progressif                      | connecté       |
| `/world`           | Mon monde (route principale après connexion)  | connecté       |
| `/patrimoine`      | Synthèse patrimoniale                         | connecté       |
| `/assets`          | Liste et gestion des actifs                   | connecté       |
| `/liabilities`     | Liste et gestion des dettes                   | connecté       |
| `/history`         | Évolution (snapshots)                         | connecté       |
| `/settings`        | Paramètres, devise, mentions                  | connecté       |

Un utilisateur connecté qui n'a pas terminé l'onboarding est redirigé vers
`/onboarding`. Un utilisateur qui l'a terminé et revient sur `/onboarding`
est redirigé vers `/world`.

## 5. Modèle de données

Voir `ARCHITECTURE.md` §4 et `src/db/schema/`. Résumé :

- `users` — identité applicative (id = identifiant Supabase Auth).
- `assets` — tout actif financier, catégorisé par `asset_category`.
- `real_estate_details` — détails spécifiques à l'immobilier (1‑1 avec un actif `REAL_ESTATE`).
- `liabilities` — dettes, éventuellement liées à un actif.
- `income_sources` — revenus.
- `portfolio_snapshots` — historique (un snapshot par utilisateur et par jour).
- `onboarding_progress` — brouillon du questionnaire et étape courante.

Catégories d'actifs : `REAL_ESTATE, CASH, SAVINGS, ETF, STOCK, BOND, PEA, CTO,
LIFE_INSURANCE, PEE, SCPI, CRYPTO, VEHICLE, COLLECTIBLE, OTHER`.

Types de biens : `PRIMARY_RESIDENCE, RENTAL, SECOND_HOME, COMMERCIAL, PARKING, OTHER`.

Types de dettes : `MORTGAGE, CONSUMER_LOAN, STUDENT_LOAN, PERSONAL_LOAN, OTHER`.

Types de revenus : `SALARY, RENT, DIVIDENDS, INTEREST, BUSINESS, OTHER` ;
fréquences : `MONTHLY, YEARLY, IRREGULAR`.

## 6. Calcul patrimonial

Service unique : `WealthCalculationService` (`src/services/finance/`).

```
gross_assets      = Σ valeur des actifs actifs (convertie en devise de référence)
total_liabilities = Σ capital restant dû
net_worth         = gross_assets − total_liabilities
```

Tous les montants sont manipulés en **centimes entiers** avec une devise
explicite. Un montant sans devise n'existe pas dans le domaine.

Devise de référence MVP : `EUR`. Devises préparées : `USD, GBP, JPY, CHF, CAD`.
Une conversion sans taux disponible rend l'actif « non convertible » : il est
exclu du total et signalé dans l'interface (jamais compté avec un taux inventé).

## 7. Wealth Score et niveaux du monde

`WealthScoreService` produit un score de visualisation (0‑1000), un niveau de
monde et un niveau de ville. Ce n'est **pas** une notation financière.

Seuils (configurables dans `src/config/world-levels.ts`) :

| Patrimoine net | Niveau       |
| -------------- | ------------ |
| 0 – 50 k€      | Hameau       |
| 50 – 150 k€    | Village      |
| 150 – 300 k€   | Bourg        |
| 300 – 500 k€   | Ville        |
| 500 k€ – 1 M€  | Grande ville |
| 1 – 3 M€       | Métropole    |
| 3 M€ +         | Mégapole     |

Chaque bâtiment évolue par niveaux (1 à 5) selon des seuils par type de
bâtiment définis dans `src/config/building-levels.ts`. La progression visuelle
ne représente jamais chaque euro ; une baisse produit une stabilisation, jamais
une destruction.

## 8. Onboarding

Progressif, adaptatif, sauvegardé à chaque étape côté serveur. Étapes :

1. Bienvenue
2. Situation patrimoniale (quelles catégories possédez‑vous ?)
3. Résidence principale
4. Immobilier
5. Comptes bancaires
6. Épargne
7. Investissements (introduction)
8. ETF
9. Actions
10. PEA
11. Assurance‑vie
12. PEE
13. SCPI
14. Crypto
15. Autres actifs
16. Dettes
17. Revenus
18. Vérification
19. Génération du monde

Les étapes 3 à 17 ne s'affichent que si la catégorie a été déclarée à l'étape 2.
L'indicateur « Sauvegardé » est discret, sans popup.

## 9. Monde isométrique

- Projection 2D isométrique, tuile 64×32 px, carte initiale 20×20.
- `WorldState` : terrain, bâtiments, décorations, personnages, ressources, caméra.
- Génération déterministe (seed dérivé de l'identifiant utilisateur).
- Districts : `HOME, FINANCE, REAL_ESTATE, CASH, ALTERNATIVE`.
- Clic sur un bâtiment → panneau de détail (side panel desktop, bottom sheet mobile).
- Mapping bidirectionnel actif ↔ bâtiment.
- Animations courtes ; respect de `prefers-reduced-motion`.

## 10. Données de marché

`MarketDataProvider` (interface) → `MockMarketDataProvider` en développement.
Toute donnée porte `timestamp`, `provider`, `currency`, `freshness`
(`live | delayed | cached | manual | mock`). Si la donnée est indisponible,
l'interface affiche « Donnée indisponible ». Aucune valeur n'est inventée.

## 11. Ce qui n'est pas dans le MVP

Export CSV/PDF/JSON, import, agrégation bancaire, objectifs / FIRE,
notifications, multi‑utilisateurs, simulations. L'architecture les prépare
(services séparés, providers abstraits) sans les implémenter.

## 12. Mentions

Les visualisations ne constituent ni un conseil financier, ni une
recommandation, ni une prédiction. La mention figure dans `/settings` et dans
le pied de page public.
