import type {
  BuildingNode,
  CharacterNode,
  FishNode,
  TreeNode,
  VehicleNode,
} from "@/game/rendering/scene-builder";
import { gridToScreen, type IsoGridConfig } from "@/game/map/iso";
import { zIndexOf } from "@/services/world/world-layout";
import type { GridPosition } from "@/types/world";

export interface TimedAnimation {
  /** Returns false when finished. */
  update(deltaMs: number): boolean;
}

const BUILD_DURATION_MS = 280;
const STAGGER_MS = 60;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Construction: the building rises from the ground with a small overshoot. */
export function createBuildAnimation(node: BuildingNode, index: number): TimedAnimation {
  let elapsed = -index * STAGGER_MS;
  node.sprite.scale.y = 0;
  node.sprite.alpha = 0;
  return {
    update(deltaMs) {
      elapsed += deltaMs;
      if (elapsed < 0) return true;
      const t = Math.min(1, elapsed / BUILD_DURATION_MS);
      node.sprite.scale.y = Math.max(0, easeOutBack(t));
      node.sprite.alpha = Math.min(1, t * 2);
      if (t >= 1) {
        node.sprite.scale.y = 1;
        node.sprite.alpha = 1;
        return false;
      }
      return true;
    },
  };
}

/** Level-up: a quick squash and stretch, no destruction ever. */
export function createUpgradeAnimation(node: BuildingNode): TimedAnimation {
  let elapsed = 0;
  return {
    update(deltaMs) {
      elapsed += deltaMs;
      const t = Math.min(1, elapsed / 220);
      const s = 1 + Math.sin(t * Math.PI) * 0.12;
      node.sprite.scale.set(1 / Math.sqrt(s), s);
      if (t >= 1) {
        node.sprite.scale.set(1, 1);
        return false;
      }
      return true;
    },
  };
}

/** Milliseconds spent walking one tile. */
const WALK_MS_PER_TILE = 900;
/** Fade in and out through the doorway, so nobody pops in or out of existence. */
const DOOR_FADE_MS = 260;

function pathLength(from: GridPosition, to: GridPosition): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) || 1;
}

/**
 * Walk in, stay inside, walk back out, wait, repeat. `elapsedMs` runs freely
 * and the phase is derived from it, so a character can be added or removed
 * without disturbing the others.
 */
function characterPhase(node: CharacterNode, walkMs: number): { progress: number; alpha: number } {
  const { insideMs } = node.character;
  const waitMs = 1200;
  const cycle = walkMs * 2 + insideMs + waitMs;
  const t = node.elapsedMs % cycle;
  if (t < walkMs) {
    // Walking towards the door, fading out over the last steps.
    const remaining = walkMs - t;
    return { progress: t / walkMs, alpha: Math.min(1, remaining / DOOR_FADE_MS) };
  }
  if (t < walkMs + insideMs) return { progress: 1, alpha: 0 };
  const out = t - walkMs - insideMs;
  if (out < walkMs) {
    // Coming back out, fading in as it clears the doorway.
    return { progress: 1 - out / walkMs, alpha: Math.min(1, out / DOOR_FADE_MS) };
  }
  return { progress: 0, alpha: 1 };
}

/** Characters walk their path; disabled with reduced motion. */
export function updateCharacters(
  characters: CharacterNode[],
  deltaMs: number,
  grid: IsoGridConfig,
): void {
  for (const node of characters) {
    const [from, to] = node.character.path;
    if (!from || !to) continue;
    node.elapsedMs += deltaMs;
    const walkMs = pathLength(from, to) * WALK_MS_PER_TILE;
    let progress: number;
    let alpha = 1;
    if (node.character.entersBuildingId) {
      ({ progress, alpha } = characterPhase(node, walkMs));
    } else {
      // Street wanderer: a plain ping-pong along the road.
      const cycle = walkMs * 2;
      const t = node.elapsedMs % cycle;
      progress = t < walkMs ? t / walkMs : 2 - t / walkMs;
    }
    node.sprite.alpha = alpha;
    node.sprite.visible = alpha > 0;
    if (alpha === 0) continue;
    const pos = {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };
    const { x, y } = gridToScreen(pos, grid);
    node.sprite.position.set(Math.round(x), Math.round(y));
    node.sprite.zIndex = zIndexOf({ x: Math.round(pos.x), y: Math.round(pos.y) }) + 1;
  }
}

/** Fish drift back and forth inside their pond, flipping to face the way they swim. */
export function updateFish(fish: FishNode[], deltaMs: number, grid: IsoGridConfig): void {
  for (const node of fish) {
    node.elapsedMs += deltaMs;
    const cycle = node.fish.periodMs * 2;
    const t = node.elapsedMs % cycle;
    const forward = t < node.fish.periodMs;
    const progress = forward ? t / node.fish.periodMs : 2 - t / node.fish.periodMs;
    const { from, to } = node.fish;
    const pos = {
      x: node.fish.position.x + from.x + (to.x - from.x) * progress,
      y: node.fish.position.y + from.y + (to.y - from.y) * progress,
    };
    const { x, y } = gridToScreen(pos, grid);
    node.sprite.position.set(Math.round(x), Math.round(y));
    node.sprite.scale.x = forward ? 1 : -1;
  }
}

/**
 * Cars drive from one end of their road to the other and wrap back to the
 * start, so they never reverse into their own tail lights. A parked car has no
 * period and simply stays where it was put.
 */
export function updateVehicles(
  vehicles: VehicleNode[],
  deltaMs: number,
  grid: IsoGridConfig,
): void {
  for (const node of vehicles) {
    const { from, to, periodMs } = node.vehicle;
    if (periodMs <= 0) continue;
    node.elapsedMs += deltaMs;
    const progress = (node.elapsedMs % periodMs) / periodMs;
    const pos = {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };
    const { x, y } = gridToScreen(pos, grid);
    node.sprite.position.set(Math.round(x), Math.round(y));
    node.sprite.zIndex = zIndexOf({ x: Math.round(pos.x), y: Math.round(pos.y) }) + 1;
  }
}

/** Amplitude of the sway, as a fraction of the sprite width. */
const SWAY = 0.02;
const SWAY_PERIOD_MS = 3600;

/** Foliage leans a little, out of phase from tree to tree. */
export function updateTrees(trees: TreeNode[], deltaMs: number): void {
  for (const node of trees) {
    node.elapsedMs += deltaMs;
    const phase = ((node.elapsedMs + node.phaseMs) % SWAY_PERIOD_MS) / SWAY_PERIOD_MS;
    node.sprite.skew.x = Math.sin(phase * Math.PI * 2) * SWAY;
  }
}
