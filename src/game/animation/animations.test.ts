import { describe, expect, it } from "vitest";
import { DEFAULT_ISO_GRID } from "@/game/map/iso";
import type { CharacterNode, FishNode } from "@/game/rendering/scene-builder";
import type { WorldCharacter, WorldFish } from "@/types/world";
import { updateCharacters, updateFish } from "./animations";

/** Minimal stand-in for a PixiJS sprite: the animation only writes these. */
function fakeSprite() {
  return {
    alpha: 1,
    visible: true,
    zIndex: 0,
    position: {
      x: 0,
      y: 0,
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
      },
    },
    scale: { x: 1, y: 1 },
  };
}

function characterNode(overrides: Partial<WorldCharacter> = {}): CharacterNode {
  const character: WorldCharacter = {
    id: "c1",
    position: { x: 5, y: 7 },
    spriteId: "character_basic",
    // Two tiles of approach, so one crossing lasts 2 * 900 ms.
    path: [
      { x: 5, y: 7 },
      { x: 5, y: 5 },
    ],
    entersBuildingId: "building_a",
    insideMs: 4000,
    phaseMs: 0,
    ...overrides,
  };
  return {
    character,
    sprite: fakeSprite() as unknown as CharacterNode["sprite"],
    elapsedMs: character.phaseMs,
  };
}

/** Runs the animation in 100 ms steps and reports the state at `atMs`. */
function stateAt(node: CharacterNode, atMs: number) {
  const step = 100;
  for (let t = 0; t < atMs; t += step) updateCharacters([node], step, DEFAULT_ISO_GRID);
  return { visible: node.sprite.visible, alpha: node.sprite.alpha, y: node.sprite.position.y };
}

describe("character animation", () => {
  const WALK_MS = 2 * 900;

  it("walks to the door, disappears inside, then comes back out", () => {
    const node = characterNode();
    // Mid-approach: on screen, somewhere between the street and the door.
    const walking = stateAt(node, WALK_MS / 2);
    expect(walking.visible).toBe(true);
    expect(walking.alpha).toBe(1);

    // Just after reaching the door: gone inside.
    const inside = stateAt(node, WALK_MS / 2 + 500);
    expect(inside.visible).toBe(false);
    expect(inside.alpha).toBe(0);

    // It must not stay inside for ever: it is back out before the cycle ends.
    const out = stateAt(node, node.character.insideMs + WALK_MS);
    expect(out.visible).toBe(true);
    expect(out.alpha).toBeGreaterThan(0);
  });

  it("fades rather than popping in and out of the doorway", () => {
    const node = characterNode();
    // 200 ms before the door, the fade out has already started.
    const fading = stateAt(node, WALK_MS - 200);
    expect(fading.alpha).toBeGreaterThan(0);
    expect(fading.alpha).toBeLessThan(1);
  });

  it("keeps a street wanderer visible the whole time", () => {
    const node = characterNode({ entersBuildingId: null, insideMs: 0 });
    for (const at of [500, 1500, 3000, 5000]) {
      const state = stateAt(node, at);
      expect(state.visible).toBe(true);
      expect(state.alpha).toBe(1);
    }
  });

  it("moves the character between the two ends of its path", () => {
    const node = characterNode();
    const start = stateAt(node, 100);
    const near = stateAt(node, WALK_MS - 400);
    expect(near.y).not.toBe(start.y);
  });
});

describe("fish animation", () => {
  it("drifts inside its pond and turns around", () => {
    const fish: WorldFish = {
      id: "f1",
      position: { x: 4, y: 4 },
      spriteId: "fish_basic",
      from: { x: -0.25, y: 0 },
      to: { x: 0.25, y: 0 },
      periodMs: 1000,
    };
    const node: FishNode = {
      fish,
      sprite: fakeSprite() as unknown as FishNode["sprite"],
      elapsedMs: 0,
    };
    updateFish([node], 500, DEFAULT_ISO_GRID);
    const forward = { x: node.sprite.position.x, scale: node.sprite.scale.x };
    expect(forward.scale).toBe(1);
    // Past one period it swims the other way, mirrored.
    updateFish([node], 800, DEFAULT_ISO_GRID);
    expect(node.sprite.scale.x).toBe(-1);
    // And it never leaves the tile it belongs to.
    const centre = ((fish.position.x - fish.position.y) * DEFAULT_ISO_GRID.tileWidth) / 2;
    expect(Math.abs(node.sprite.position.x - centre)).toBeLessThanOrEqual(
      DEFAULT_ISO_GRID.tileWidth / 2,
    );
  });
});
