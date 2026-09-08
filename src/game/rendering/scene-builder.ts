import { Container, Polygon, Sprite } from "pixi.js";
import {
  GLYPH_HEIGHT,
  SIGN_BASE_Y,
  SIGN_BOARD_H,
  SIGN_BOARD_W,
  SIGN_BOARD_X,
  SIGN_BOARD_Y,
  SIGN_LINES,
  SIGN_LINE_GAP,
  SIGN_TEXT_W,
  SIGN_W,
  wrapLabel,
} from "@/config/pixel-font";
import { SPRITE_IDS } from "@/config/sprites";
import { footprintCenter, gridToScreen, type IsoGridConfig } from "@/game/map/iso";
import type { TextureRegistry } from "@/game/assets/texture-loader";
import { zIndexOf } from "@/services/world/world-layout";
import type {
  WorldBuilding,
  WorldCharacter,
  WorldDecoration,
  WorldFish,
  WorldState,
} from "@/types/world";
import { createLabel } from "./label";

export interface BuildingNode {
  building: WorldBuilding;
  container: Container;
  sprite: Sprite;
  scaffold: Sprite | null;
}

export interface CharacterNode {
  character: WorldCharacter;
  sprite: Sprite;
  /** Milliseconds elapsed in the walk-in / stay / walk-out cycle. */
  elapsedMs: number;
}

export interface FishNode {
  fish: WorldFish;
  sprite: Sprite;
  elapsedMs: number;
}

export interface Scene {
  root: Container;
  terrain: Container;
  entities: Container;
  buildings: Map<string, BuildingNode>;
  characters: CharacterNode[];
  fish: FishNode[];
  selection: Sprite;
}

export interface SceneCallbacks {
  onBuildingTap: (buildingId: string) => void;
  onBuildingHover: (buildingId: string | null) => void;
  onGroundTap: () => void;
}

function spriteFor(registry: TextureRegistry, id: string, fallback?: string): Sprite | null {
  const entry = registry.get(id) ?? (fallback ? registry.get(fallback) : null);
  if (!entry) return null;
  const sprite = new Sprite(entry.texture);
  sprite.anchor.set(
    entry.meta.anchor.x / entry.meta.width,
    entry.meta.anchor.y / entry.meta.height,
  );
  return sprite;
}

/** Builds the whole PixiJS scene graph from a WorldState. Terrain is static; entities are z-sorted. */
export function buildScene(
  state: WorldState,
  registry: TextureRegistry,
  grid: IsoGridConfig,
  callbacks: SceneCallbacks,
): Scene {
  const root = new Container();
  const terrain = new Container();
  const entities = new Container();
  entities.sortableChildren = true;
  root.addChild(terrain, entities);

  for (const tile of state.terrain) {
    const sprite = spriteFor(registry, tile.spriteId, SPRITE_IDS.terrainGrass);
    if (!sprite) continue;
    const { x, y } = gridToScreen(tile, grid);
    sprite.position.set(x, y);
    terrain.addChild(sprite);
  }
  // Ground taps clear the selection; buildings stop propagation.
  terrain.eventMode = "static";
  terrain.on("pointertap", () => callbacks.onGroundTap());

  const buildings = new Map<string, BuildingNode>();
  for (const building of state.buildings) {
    const node = buildBuilding(building, registry, grid, callbacks);
    if (!node) continue;
    buildings.set(building.id, node);
    entities.addChild(node.container);
    // The sign is a sibling, not a child: as its own entity it sorts against
    // the neighbours in front of it instead of inheriting the building's depth.
    const sign = buildSign(building, registry, grid, callbacks);
    if (sign) entities.addChild(sign);
  }

  for (const decoration of state.decorations) {
    const node = buildDecoration(decoration, registry, grid);
    if (!node) continue;
    node.eventMode = "none";
    entities.addChild(node);
  }

  const characters: CharacterNode[] = [];
  for (const character of state.characters) {
    const sprite = spriteFor(registry, character.spriteId);
    if (!sprite) continue;
    const { x, y } = gridToScreen(character.position, grid);
    sprite.position.set(x, y);
    sprite.zIndex = zIndexOf(character.position) + 1;
    sprite.eventMode = "none";
    entities.addChild(sprite);
    characters.push({ character, sprite, elapsedMs: character.phaseMs });
  }

  const fish: FishNode[] = [];
  for (const one of state.fish) {
    const sprite = spriteFor(registry, one.spriteId);
    if (!sprite) continue;
    const { x, y } = gridToScreen(one.position, grid);
    sprite.position.set(x, y);
    // Just above the pond tile it swims in, below anything standing on land.
    sprite.zIndex = zIndexOf(one.position) + 1;
    sprite.eventMode = "none";
    entities.addChild(sprite);
    fish.push({ fish: one, sprite, elapsedMs: 0 });
  }

  const selection = spriteFor(registry, SPRITE_IDS.selection) ?? new Sprite();
  selection.eventMode = "none";
  selection.visible = false;
  selection.zIndex = 0;
  entities.addChild(selection);

  return { root, terrain, entities, buildings, characters, fish, selection };
}

/**
 * Signpost planted at the front corner of a building, carrying the asset label
 * so the map says what each building stands for without a click.
 */
function buildSign(
  building: WorldBuilding,
  registry: TextureRegistry,
  grid: IsoGridConfig,
  callbacks: SceneCallbacks,
): Container | null {
  const board = spriteFor(registry, SPRITE_IDS.signBoard);
  const lines = wrapLabel(building.label, SIGN_TEXT_W, SIGN_LINES);
  if (!board || lines.length === 0) return null;
  const container = new Container();
  // The sign names the building, so tapping it selects that building: it sits
  // over part of the facade, and a dead zone there would feel broken.
  container.eventMode = "static";
  container.cursor = "pointer";
  container.on("pointertap", (e) => {
    e.stopPropagation();
    callbacks.onBuildingTap(building.id);
  });
  container.on("pointerover", () => callbacks.onBuildingHover(building.id));
  container.on("pointerout", () => callbacks.onBuildingHover(null));
  // Front corner of the footprint, then a few pixels towards the viewer.
  const front = {
    x: building.position.x + building.footprint.w - 1,
    y: building.position.y + building.footprint.h - 1,
  };
  const { x, y } = gridToScreen(front, grid);
  // Offset towards the right-hand face: the entrance is drawn on the left one,
  // and a sign planted dead centre would hide the door it points at.
  container.position.set(x + grid.tileWidth * 0.36, y + grid.tileHeight / 2 + 2);
  container.zIndex = zIndexOf(front) + 1;
  container.addChild(board);
  // Board coordinates are relative to the sprite anchor (foot of the posts).
  const blockHeight = lines.length * GLYPH_HEIGHT + (lines.length - 1) * SIGN_LINE_GAP;
  const originX = SIGN_BOARD_X + SIGN_BOARD_W / 2 - SIGN_W / 2;
  const originY = SIGN_BOARD_Y - SIGN_BASE_Y + Math.floor((SIGN_BOARD_H - blockHeight) / 2);
  let drawn = 0;
  lines.forEach((line, index) => {
    const label = createLabel(registry, line, SPRITE_IDS.font, { align: "center" });
    if (!label) return;
    label.position.set(originX, originY + index * (GLYPH_HEIGHT + SIGN_LINE_GAP));
    container.addChild(label);
    drawn += 1;
  });
  // A board with no legible text is worse than no sign at all.
  return drawn > 0 ? container : null;
}

function buildBuilding(
  building: WorldBuilding,
  registry: TextureRegistry,
  grid: IsoGridConfig,
  callbacks: SceneCallbacks,
): BuildingNode | null {
  const sprite = spriteFor(registry, building.spriteId);
  if (!sprite) return null;
  const container = new Container();
  const { x, y } = footprintCenter(building.position, building.footprint, grid);
  container.position.set(x, y);
  container.zIndex = zIndexOf(building.position, building.footprint);
  container.addChild(sprite);

  let scaffold: Sprite | null = null;
  if (building.linkedLiabilityIds.length > 0) {
    scaffold = spriteFor(registry, SPRITE_IDS.scaffold);
    if (scaffold) {
      scaffold.alpha = 0.85;
      scaffold.position.set(0, 4);
      container.addChild(scaffold);
    }
  }

  // Hit area: the base diamond extended up to the sprite top, in local (anchor)
  // space. With an anchor at the base of the sprite, the top edge sits at
  // -height * anchor.y; using the distance to the *bottom* edge instead left
  // only the few pixels under the anchor clickable on a tall tower.
  const w = grid.tileWidth * building.footprint.w;
  const h = grid.tileHeight * building.footprint.h;
  const top = -sprite.height * sprite.anchor.y;
  sprite.hitArea = new Polygon([-w / 2, 0, 0, h / 2, w / 2, 0, w / 2, top, -w / 2, top]);
  sprite.eventMode = "static";
  sprite.cursor = "pointer";
  sprite.on("pointertap", (e) => {
    e.stopPropagation();
    callbacks.onBuildingTap(building.id);
  });
  sprite.on("pointerover", () => callbacks.onBuildingHover(building.id));
  sprite.on("pointerout", () => callbacks.onBuildingHover(null));
  return { building, container, sprite, scaffold };
}

function buildDecoration(
  decoration: WorldDecoration,
  registry: TextureRegistry,
  grid: IsoGridConfig,
): Sprite | null {
  const sprite = spriteFor(registry, decoration.spriteId);
  if (!sprite) return null;
  const { x, y } = gridToScreen(decoration.position, grid);
  sprite.position.set(x, y);
  sprite.zIndex = zIndexOf(decoration.position);
  return sprite;
}

export function destroyScene(scene: Scene): void {
  scene.root.destroy({ children: true, texture: false });
}
