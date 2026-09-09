/**
 * Metrics of the 5x7 bitmap font used for in-world signs. Shared contract
 * between the asset generator (which draws the atlas) and the renderer (which
 * frames glyphs out of it), so the two can never disagree on the layout.
 *
 * The glyph bitmaps themselves live in the generator: the renderer only needs
 * to know where each character sits in the atlas.
 */
export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** One pixel of tracking baked into the cell, so glyphs never touch. */
export const CELL_WIDTH = GLYPH_WIDTH + 1;
export const CELL_HEIGHT = GLYPH_HEIGHT + 1;
export const ATLAS_COLUMNS = 16;

/**
 * Characters in atlas order; the index is the glyph's frame index. Signs render
 * an upper-cased label, so lower case is folded away and accents are limited to
 * the ones French needs.
 */
export const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'-/:()+%&°€ÉÈÊÀÂÇÔÎÏÛÙ?!";

const INDEX_BY_CHAR = new Map([...CHARSET].map((char, index) => [char, index]));

export function glyphIndex(char: string): number | null {
  return INDEX_BY_CHAR.get(char) ?? null;
}

export function atlasFrame(index: number): { x: number; y: number } {
  return {
    x: (index % ATLAS_COLUMNS) * CELL_WIDTH,
    y: Math.floor(index / ATLAS_COLUMNS) * CELL_HEIGHT,
  };
}

export function atlasSize(): { width: number; height: number } {
  return {
    width: ATLAS_COLUMNS * CELL_WIDTH,
    height: Math.ceil(CHARSET.length / ATLAS_COLUMNS) * CELL_HEIGHT,
  };
}

/** Folds a label to what the atlas can draw; unknown characters become spaces. */
export function normaliseLabel(text: string): string {
  let out = "";
  for (const char of text.toUpperCase()) out += INDEX_BY_CHAR.has(char) ? char : " ";
  return out.replace(/\s+/g, " ").trim();
}

/** Width in pixels of a label once normalised. */
export function measureLabel(text: string): number {
  const label = normaliseLabel(text);
  return label.length === 0 ? 0 : label.length * CELL_WIDTH - 1;
}

/** Shortens a label to fit `maxWidth` pixels, with a trailing ellipsis. */
export function truncateLabel(text: string, maxWidth: number): string {
  const label = normaliseLabel(text);
  if (measureLabel(label) <= maxWidth) return label;
  let cut = label.length;
  while (cut > 1 && measureLabel(`${label.slice(0, cut)}.`) > maxWidth) cut -= 1;
  return `${label.slice(0, cut).trimEnd()}.`;
}

/**
 * Geometry of the signpost sprite, in pixels. Declared here rather than in the
 * generator because the renderer has to place the label on the board: both
 * sides read the same numbers, so the text can never drift off the panel.
 */
/**
 * Buildings in a block are attached, so a sign much wider than the facade it
 * names runs into its neighbours'. The board is therefore barely wider than one
 * tile and gains a third line instead of width: at one tile exactly it was
 * cutting ordinary French words such as "PRINCIPALE" in half.
 */
export const SIGN_W = 80;
export const SIGN_LINES = 3;
export const SIGN_LINE_GAP = 2;
export const SIGN_BOARD_W = 72;
export const SIGN_BOARD_H = SIGN_LINES * GLYPH_HEIGHT + (SIGN_LINES - 1) * SIGN_LINE_GAP + 6;

/**
 * Two post heights, alternated from tile to tile. A board is wider than the
 * facade it names — an eleven-letter French word needs more than one tile at
 * this cell width — so two neighbours in a terrace would otherwise overlap.
 * Staggering their height lets both stay whole and readable.
 */
export const SIGN_POST_H = 10;
export const SIGN_POST_H_HIGH = 30;
export const SIGN_H = SIGN_BOARD_H + SIGN_POST_H_HIGH + 8;
/** Sprite anchor: where the posts meet the ground. */
export const SIGN_BASE_Y = SIGN_H - 3;
export const SIGN_BOARD_X = (SIGN_W - SIGN_BOARD_W) / 2;

/** Top of the board, for a given post height, relative to the canvas. */
export function signBoardY(postHeight: number): number {
  return SIGN_BASE_Y - postHeight - SIGN_BOARD_H;
}

/** Usable text width inside the board, leaving a 3 px margin on each side. */
export const SIGN_TEXT_W = SIGN_BOARD_W - 6;

/**
 * Splits a label over at most `maxLines` lines of `maxWidth` pixels, breaking
 * on spaces and hard-cutting a word that is too long on its own. The last line
 * is truncated with a full stop when the text still does not fit.
 */
export function wrapLabel(text: string, maxWidth: number, maxLines: number): string[] {
  const words = normaliseLabel(text).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureLabel(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length === maxLines) break;
    // A single word wider than the board is cut rather than dropped.
    current = measureLabel(word) <= maxWidth ? word : truncateLabel(word, maxWidth);
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [];
  const consumed = lines.join(" ");
  const remaining = normaliseLabel(text).slice(consumed.length).trim();
  if (remaining.length > 0) {
    const last = lines[lines.length - 1]!;
    lines[lines.length - 1] = truncateLabel(`${last} ${remaining}`, maxWidth);
  }
  return lines;
}
