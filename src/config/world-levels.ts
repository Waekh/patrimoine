/**
 * World level thresholds, expressed in reference-currency cents.
 * Editing this file changes the world's progression without touching the
 * rendering engine or the wealth engine.
 */
export const WORLD_LEVEL_IDS = [
  "HAMLET",
  "VILLAGE",
  "TOWN",
  "CITY",
  "LARGE_CITY",
  "METROPOLIS",
  "MEGAPOLIS",
] as const;
export type WorldLevelId = (typeof WORLD_LEVEL_IDS)[number];

export interface WorldLevelConfig {
  id: WorldLevelId;
  /** Inclusive lower bound of net worth (cents). */
  minNetWorthCents: number;
  /** Map size (tiles per side) unlocked at this level. */
  mapSize: number;
  /** Districts visible at this level, in unlock order. */
  cityLevel: number;
}

const K = 100_000; // 1 000 € in cents

export const WORLD_LEVELS: readonly WorldLevelConfig[] = [
  { id: "HAMLET", minNetWorthCents: Number.NEGATIVE_INFINITY, mapSize: 20, cityLevel: 1 },
  { id: "VILLAGE", minNetWorthCents: 50 * K, mapSize: 20, cityLevel: 2 },
  { id: "TOWN", minNetWorthCents: 150 * K, mapSize: 20, cityLevel: 3 },
  { id: "CITY", minNetWorthCents: 300 * K, mapSize: 24, cityLevel: 4 },
  { id: "LARGE_CITY", minNetWorthCents: 500 * K, mapSize: 24, cityLevel: 5 },
  { id: "METROPOLIS", minNetWorthCents: 1_000 * K, mapSize: 28, cityLevel: 6 },
  { id: "MEGAPOLIS", minNetWorthCents: 3_000 * K, mapSize: 32, cityLevel: 7 },
];

/** Net worth at which the wealth score reaches its maximum (1000). */
export const WEALTH_SCORE_CAP_CENTS = 5_000 * K;
export const WEALTH_SCORE_MAX = 1000;
