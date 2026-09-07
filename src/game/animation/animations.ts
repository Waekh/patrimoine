import type { BuildingNode, CharacterNode } from "@/game/rendering/scene-builder";
import { gridToScreen, type IsoGridConfig } from "@/game/map/iso";
import { zIndexOf } from "@/services/world/world-layout";

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

/** Characters walk back and forth along their path; disabled with reduced motion. */
export function updateCharacters(
  characters: CharacterNode[],
  deltaMs: number,
  grid: IsoGridConfig,
): void {
  for (const node of characters) {
    const [from, to] = node.character.path;
    if (!from || !to) continue;
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) || 1;
    node.t += (node.direction * deltaMs) / (length * 900);
    if (node.t >= 1) {
      node.t = 1;
      node.direction = -1;
    } else if (node.t <= 0) {
      node.t = 0;
      node.direction = 1;
    }
    const pos = { x: from.x + (to.x - from.x) * node.t, y: from.y + (to.y - from.y) * node.t };
    const { x, y } = gridToScreen(pos, grid);
    node.sprite.position.set(Math.round(x), Math.round(y));
    node.sprite.zIndex = zIndexOf({ x: Math.round(pos.x), y: Math.round(pos.y) }) + 1;
  }
}
