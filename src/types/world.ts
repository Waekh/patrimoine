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
  /** Ids of liabilities linked to the asset (rendered as scaffolding). */
  linkedLiabilityIds: string[];
  /** Linked debt / value, in basis points, when available. */
  debtRatioBps: number | null;
  /** Value threshold (cents) of the next level, null at max level. */
  nextLevelAtCents: number | null;
}

export interface WorldDecoration {
  id: string;
  kind: "TREE" | "PARK";
  position: GridPosition;
  spriteId: string;
}

export interface WorldCharacter {
  id: string;
  position: GridPosition;
  spriteId: string;
  /** Deterministic walking path (grid positions); empty when idle. */
  path: GridPosition[];
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
