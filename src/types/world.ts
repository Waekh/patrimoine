import type { AssetCategory } from "@/config/categories";
import type { BuildingLevel, BuildingType } from "@/config/building-levels";
import type { CurrencyCode } from "@/config/currencies";
import type { DistrictId } from "@/config/districts";
import type { WorldLevelId } from "@/config/world-levels";

export interface GridPosition {
  x: number;
  y: number;
}

export interface Footprint {
  w: number;
  h: number;
}

export const TERRAIN_KINDS = ["GRASS", "WATER", "ROAD"] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

export interface WorldTerrainTile {
  x: number;
  y: number;
  kind: TerrainKind;
  spriteId: string;
}

/** A building is the world counterpart of one financial asset. */
export interface WorldBuilding {
  id: string;
  type: BuildingType;
  level: BuildingLevel;
  position: GridPosition;
  footprint: Footprint;
  spriteId: string;
  district: DistrictId;
  /** Bidirectional mapping: building -> asset. */
  assetId: string;
  assetCategory: AssetCategory;
  label: string;
  valueCents: number;
  currency: CurrencyCode;
  /** Ids of liabilities linked to the asset; surfaced in the detail panel. */
  linkedLiabilityIds: string[];
  /** Linked debt / value, in basis points, when available. */
  debtRatioBps: number | null;
  /** Value threshold (cents) of the next level, null at max level. */
  nextLevelAtCents: number | null;
}

export interface WorldDecoration {
  id: string;
  kind: "TREE" | "PARK" | "POND";
  position: GridPosition;
  spriteId: string;
  /** Tiles covered, anchored at `position`. Trees and ponds take a single one. */
  footprint: Footprint;
}

/** A fish swimming inside a pond; purely decorative, never interactive. */
export interface WorldFish {
  id: string;
  /** The pond tile it swims in. */
  position: GridPosition;
  spriteId: string;
  /** Offsets from the tile centre, in tiles, between which the fish drifts. */
  from: GridPosition;
  to: GridPosition;
  /** Seconds for one crossing, so shoals never swim in lockstep. */
  periodMs: number;
}

export interface WorldCharacter {
  id: string;
  position: GridPosition;
  spriteId: string;
  /** Deterministic walking path (grid positions); empty when idle. */
  path: GridPosition[];
  /**
   * Building the character walks into. It disappears through the door, stays
   * inside, then comes back out. Null when it just wanders the street.
   */
  entersBuildingId: string | null;
  /** Milliseconds spent inside before coming back out. */
  insideMs: number;
  /** Milliseconds of offset in the cycle, so the crowd is not synchronised. */
  phaseMs: number;
}

export interface WorldResources {
  currency: CurrencyCode;
  netWorthCents: number;
  grossAssetsCents: number;
  liabilitiesCents: number;
  wealthScore: number;
  worldLevel: WorldLevelId;
  cityLevel: number;
  nextLevelAtCents: number | null;
  levelProgress: number;
}

export interface WorldCamera {
  zoom: number;
  /** Grid position the camera looks at. */
  center: GridPosition;
}

export interface DistrictArea {
  id: DistrictId;
  x: number;
  y: number;
  w: number;
  h: number;
  buildingCount: number;
}

/** Serialisable, deterministic snapshot of the world. Never persisted. */
export interface WorldState {
  seed: number;
  mapSize: number;
  terrain: WorldTerrainTile[];
  buildings: WorldBuilding[];
  decorations: WorldDecoration[];
  fish: WorldFish[];
  characters: WorldCharacter[];
  resources: WorldResources;
  camera: WorldCamera;
  districts: DistrictArea[];
  /** True when at least one placeholder sprite is used (surfaced in the UI). */
  usesPlaceholders: boolean;
}

/** Intermediate representation between finance and layout. */
export interface WorldEntity {
  assetId: string;
  assetCategory: AssetCategory;
  label: string;
  district: DistrictId;
  buildingType: BuildingType;
  level: BuildingLevel;
  footprint: Footprint;
  spriteId: string;
  valueCents: number;
  currency: CurrencyCode;
  linkedLiabilityIds: string[];
  debtRatioBps: number | null;
  nextLevelAtCents: number | null;
}
