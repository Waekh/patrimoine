import { Container, Polygon, Sprite } from "pixi.js";
import { SPRITE_IDS } from "@/config/sprites";
import { footprintCenter, gridToScreen, type IsoGridConfig } from "@/game/map/iso";
import type { TextureRegistry } from "@/game/assets/texture-loader";
import { zIndexOf } from "@/services/world/world-layout";
import type { WorldBuilding, WorldCharacter, WorldDecoration, WorldState } from "@/types/world";

export interface BuildingNode {
  building: WorldBuilding;
  container: Container;
  sprite: Sprite;
  scaffold: Sprite | null;
}

export interface CharacterNode {
  character: WorldCharacter;
  sprite: Sprite;
  /** 0..1 progress along the path, ping-pong. */
  t: number;
  direction: 1 | -1;
}

export interface Scene {
  root: Container;
  terrain: Container;
  entities: Container;
  buildings: Map<string, BuildingNode>;
  characters: CharacterNode[];
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
  }

  for (const decoration of state.decorations) {
    const node = buildDecoration(decoration, registry, grid);
    if (node) entities.addChild(node);
  }

  const characters: CharacterNode[] = [];
  for (const character of state.characters) {
    const sprite = spriteFor(registry, character.spriteId);
    if (!sprite) continue;
    const { x, y } = gridToScreen(character.position, grid);
    sprite.position.set(x, y);
    sprite.zIndex = zIndexOf(character.position) + 1;
    entities.addChild(sprite);
    characters.push({ character, sprite, t: 0, direction: 1 });
  }

  const selection = spriteFor(registry, SPRITE_IDS.selection) ?? new Sprite();
  selection.visible = false;
  selection.zIndex = 0;
  entities.addChild(selection);

  return { root, terrain, entities, buildings, characters, selection };
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

  // Hit area: the base diamond extended up to the sprite top, in local (anchor) space.
  const w = grid.tileWidth * building.footprint.w;
  const h = grid.tileHeight * building.footprint.h;
  const top = -(sprite.height - sprite.height * sprite.anchor.y);
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
