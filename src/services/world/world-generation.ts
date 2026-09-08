import { getWorldLevelConfig, calculateWealthScore } from "@/services/finance/wealth-score";
import type { WealthSummary } from "@/services/finance/wealth-calculation";
import type { WorldEntity, WorldState } from "@/types/world";
import { seedFromString } from "./seeded-random";
import { layoutWorld } from "./world-layout";

export interface GenerateWorldInput {
  /** Stable identity of the world (user id or "demo"). */
  worldKey: string;
  summary: WealthSummary;
  entities: readonly WorldEntity[];
  /** True while placeholder sprites are in use (from the asset manifest). */
  usesPlaceholders: boolean;
}

/**
 * WorldGenerationService: wealth summary + entities -> WorldState.
 * Deterministic: same input -> same world.
 */
export function generateWorldState(input: GenerateWorldInput): WorldState {
  const { summary } = input;
  const score = calculateWealthScore({
    netWorthCents: summary.netWorth.amountCents,
    assetDistribution: summary.byFamily,
    liabilitiesCents: summary.totalLiabilities.amountCents,
  });
  const level = getWorldLevelConfig(summary.netWorth.amountCents);
  const seed = seedFromString(`${input.worldKey}:${level.id}`);
  const layout = layoutWorld(input.entities, {
    mapSize: level.mapSize,
    seed,
    cityLevel: level.cityLevel,
  });
  const center = Math.floor(level.mapSize / 2);
  return {
    seed,
    mapSize: level.mapSize,
    terrain: layout.terrain,
    buildings: layout.buildings,
    decorations: layout.decorations,
    fish: layout.fish,
    vehicles: layout.vehicles,
    characters: layout.characters,
    districts: layout.districts,
    resources: {
      currency: summary.currency,
      netWorthCents: summary.netWorth.amountCents,
      grossAssetsCents: summary.grossAssets.amountCents,
      liabilitiesCents: summary.totalLiabilities.amountCents,
      wealthScore: score.wealthScore,
      worldLevel: score.worldLevel,
      cityLevel: score.cityLevel,
      nextLevelAtCents: score.nextLevelAtCents,
      levelProgress: score.levelProgress,
    },
    camera: { zoom: 1, center: { x: center, y: center } },
    usesPlaceholders: input.usesPlaceholders,
  };
}
