import {
  BUILDING_LEVELS,
  MAX_BUILDING_LEVEL,
  MIN_BUILDING_LEVEL,
  type BuildingLevel,
  type BuildingType,
} from "@/config/building-levels";

/** BuildingProgressionService: value (cents) -> level, from the central config. */
export function getBuildingLevel(type: BuildingType, valueCents: number): BuildingLevel {
  const thresholds = BUILDING_LEVELS[type].thresholdsCents;
  let level: number = MIN_BUILDING_LEVEL;
  for (const threshold of thresholds) {
    if (valueCents >= threshold) level += 1;
  }
  return Math.min(MAX_BUILDING_LEVEL, level) as BuildingLevel;
}

export function getNextLevelThreshold(type: BuildingType, level: BuildingLevel): number | null {
  if (level >= MAX_BUILDING_LEVEL) return null;
  const threshold = BUILDING_LEVELS[type].thresholdsCents[level - 1];
  return threshold == null || !Number.isFinite(threshold) ? null : threshold;
}

export interface ValueChange {
  oldValueCents: number;
  newValueCents: number;
  differenceCents: number;
  /** Basis points relative to the old value; null when the old value was zero. */
  percentageBps: number | null;
  /** Experience points: positive variations grant XP proportionally to the relative change. */
  xp: number;
}

export function describeValueChange(oldValueCents: number, newValueCents: number): ValueChange {
  const differenceCents = newValueCents - oldValueCents;
  const percentageBps =
    oldValueCents === 0 ? null : Math.round((differenceCents * 10_000) / oldValueCents);
  const xp = differenceCents > 0 ? Math.min(100, Math.round((percentageBps ?? 10_000) / 100)) : 0;
  return { oldValueCents, newValueCents, differenceCents, percentageBps, xp };
}
