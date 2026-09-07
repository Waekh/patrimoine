/**
 * Building types and their level thresholds. A building's level depends on
 * the value (reference-currency cents) of the asset(s) it represents.
 * This is the single place where "value > X means level N" lives.
 */
export const BUILDING_TYPES = [
  "HOUSE",
  "APARTMENT",
  "BANK",
  "FINANCIAL_BUILDING",
  "REAL_ESTATE_BUILDING",
  "MARKET",
  "VAULT",
  "PARK",
  "ROAD",
  "WAREHOUSE",
] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export const MIN_BUILDING_LEVEL = 1;
export const MAX_BUILDING_LEVEL = 5;
export type BuildingLevel = 1 | 2 | 3 | 4 | 5;

export interface BuildingLevelConfig {
  type: BuildingType;
  /** Inclusive lower bounds (cents) for levels 2..5. Level 1 is the floor. */
  thresholdsCents: readonly [number, number, number, number];
}

const K = 100_000;

export const BUILDING_LEVELS: Record<BuildingType, BuildingLevelConfig> = {
  HOUSE: { type: "HOUSE", thresholdsCents: [150 * K, 300 * K, 500 * K, 900 * K] },
  APARTMENT: { type: "APARTMENT", thresholdsCents: [100 * K, 200 * K, 400 * K, 800 * K] },
  BANK: { type: "BANK", thresholdsCents: [10 * K, 30 * K, 75 * K, 150 * K] },
  VAULT: { type: "VAULT", thresholdsCents: [10 * K, 30 * K, 75 * K, 150 * K] },
  FINANCIAL_BUILDING: {
    type: "FINANCIAL_BUILDING",
    thresholdsCents: [20 * K, 50 * K, 120 * K, 300 * K],
  },
  MARKET: { type: "MARKET", thresholdsCents: [20 * K, 50 * K, 120 * K, 300 * K] },
  REAL_ESTATE_BUILDING: {
    type: "REAL_ESTATE_BUILDING",
    thresholdsCents: [30 * K, 80 * K, 150 * K, 300 * K],
  },
  WAREHOUSE: { type: "WAREHOUSE", thresholdsCents: [10 * K, 30 * K, 75 * K, 150 * K] },
  PARK: { type: "PARK", thresholdsCents: [Infinity, Infinity, Infinity, Infinity] },
  ROAD: { type: "ROAD", thresholdsCents: [Infinity, Infinity, Infinity, Infinity] },
};

/** Building types that carry an asset and can be selected. */
export const ASSET_BUILDING_TYPES: readonly BuildingType[] = [
  "HOUSE",
  "APARTMENT",
  "BANK",
  "FINANCIAL_BUILDING",
  "REAL_ESTATE_BUILDING",
  "MARKET",
  "VAULT",
  "WAREHOUSE",
];
