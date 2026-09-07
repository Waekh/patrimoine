import type { AssetFamily } from "@/config/categories";
import {
  WEALTH_SCORE_CAP_CENTS,
  WEALTH_SCORE_MAX,
  WORLD_LEVELS,
  type WorldLevelConfig,
  type WorldLevelId,
} from "@/config/world-levels";
import type { Money } from "@/lib/money";

export interface WealthScoreInput {
  netWorthCents: number;
  /** Converted values per family; only the distribution matters. */
  assetDistribution: Record<AssetFamily, Money>;
  liabilitiesCents: number;
}

export interface WealthScoreResult {
  /** 0 .. 1000. A visualisation metric, never a financial rating. */
  wealthScore: number;
  worldLevel: WorldLevelId;
  cityLevel: number;
  /** Net worth needed for the next level, null at the top level. */
  nextLevelAtCents: number | null;
  /** 0 .. 1 progress inside the current level. */
  levelProgress: number;
}

export function getWorldLevelConfig(netWorthCents: number): WorldLevelConfig {
  let current = WORLD_LEVELS[0];
  if (!current) throw new Error("WORLD_LEVELS est vide.");
  for (const level of WORLD_LEVELS) {
    if (netWorthCents >= level.minNetWorthCents) current = level;
  }
  return current;
}

export function getWorldLevel(netWorthCents: number): WorldLevelId {
  return getWorldLevelConfig(netWorthCents).id;
}

function nextLevelOf(level: WorldLevelConfig): WorldLevelConfig | null {
  const index = WORLD_LEVELS.findIndex((l) => l.id === level.id);
  return WORLD_LEVELS[index + 1] ?? null;
}

/**
 * WealthScoreService. Score = 85 % net worth (log-scaled up to the cap) +
 * 15 % diversification (number of asset families present). Liabilities are
 * already reflected in net worth; they never penalise twice.
 */
export function calculateWealthScore(input: WealthScoreInput): WealthScoreResult {
  const net = Math.max(0, input.netWorthCents);
  const cap = WEALTH_SCORE_CAP_CENTS;
  const netScore = cap > 0 ? Math.min(1, Math.log1p(net) / Math.log1p(cap)) : 0;
  const families = Object.values(input.assetDistribution).filter((m) => m.amountCents > 0).length;
  const diversification = Math.min(1, families / 4);
  const wealthScore = Math.round(WEALTH_SCORE_MAX * (0.85 * netScore + 0.15 * diversification));

  const level = getWorldLevelConfig(input.netWorthCents);
  const next = nextLevelOf(level);
  const floor = Number.isFinite(level.minNetWorthCents) ? level.minNetWorthCents : 0;
  const levelProgress = next
    ? Math.min(1, Math.max(0, (input.netWorthCents - floor) / (next.minNetWorthCents - floor)))
    : 1;
  return {
    wealthScore: Math.max(0, Math.min(WEALTH_SCORE_MAX, wealthScore)),
    worldLevel: level.id,
    cityLevel: level.cityLevel,
    nextLevelAtCents: next ? next.minNetWorthCents : null,
    levelProgress,
  };
}
