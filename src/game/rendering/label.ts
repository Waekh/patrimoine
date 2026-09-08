import { Container, Rectangle, Sprite, Texture } from "pixi.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  atlasFrame,
  glyphIndex,
  measureLabel,
  truncateLabel,
} from "@/config/pixel-font";
import type { TextureRegistry } from "@/game/assets/texture-loader";

/**
 * One texture per glyph, shared by every label on screen. Keyed by the atlas
 * source so a remounted canvas (new textures) never reuses a destroyed one.
 */
const glyphTextures = new Map<string, Texture>();

function glyphTexture(atlas: Texture, index: number): Texture {
  const key = `${atlas.source.uid}:${index}`;
  const cached = glyphTextures.get(key);
  if (cached && !cached.destroyed) return cached;
  const { x, y } = atlasFrame(index);
  const texture = new Texture({
    source: atlas.source,
    frame: new Rectangle(x, y, GLYPH_WIDTH, GLYPH_HEIGHT),
  });
  glyphTextures.set(key, texture);
  return texture;
}

export interface LabelOptions {
  /** Maximum width in pixels; longer text is cut with a trailing full stop. */
  maxWidth?: number;
  /** Horizontal alignment of the text box around x = 0. */
  align?: "left" | "center";
}

/**
 * Renders a text label as pixel-art glyph sprites out of the font atlas. Text
 * comes from user data (an asset name), so it is normalised and truncated to
 * what the atlas can draw before anything is laid out.
 *
 * Returns null when the font is not loaded: a sign without its text is worse
 * than no sign, so the caller drops the whole thing.
 */
export function createLabel(
  registry: TextureRegistry,
  text: string,
  fontSpriteId: string,
  options: LabelOptions = {},
): Container | null {
  const font = registry.get(fontSpriteId);
  if (!font) return null;
  const label = options.maxWidth ? truncateLabel(text, options.maxWidth) : text;
  if (label.length === 0) return null;

  // Centring shifts the glyphs, not the container, so the caller stays free to
  // position the container wherever the sign board sits.
  const offset = options.align === "center" ? -Math.round(measureLabel(label) / 2) : 0;
  const container = new Container();
  [...label].forEach((char, index) => {
    const glyph = glyphIndex(char);
    if (glyph === null || char === " ") return;
    const sprite = new Sprite(glyphTexture(font.texture, glyph));
    sprite.position.set(offset + index * CELL_WIDTH, 0);
    container.addChild(sprite);
  });
  return container;
}

export { CELL_HEIGHT, measureLabel };
