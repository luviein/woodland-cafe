import { PALETTE, type PaletteName } from './palette';

// Sprites drawn in code as text grids (GAME_DESIGN.md §8.2): each row is a
// string, each letter one pixel. The legend says which palette colour a
// letter means, per sprite, so letters can be picked to read well ("o" for
// outline, "e" for eye). Plain data, so tests can check every sprite without
// a browser; the Boot scene turns them into textures.

/** The letter for a see-through pixel, in every sprite. */
export const CLEAR = '.';

/** A colour of the player's own art, outside the palette, e.g. '#c9a98b'. */
export type HexColour = `#${string}`;
export type LegendColour = PaletteName | HexColour;

const HEX = /^#[0-9a-f]{6}$/i;

/** The colour as a number, or null if it's neither a palette name nor #rrggbb. */
export function colourValue(colour: string): number | null {
  if (Object.hasOwn(PALETTE, colour)) return PALETTE[colour as PaletteName];
  return HEX.test(colour) ? parseInt(colour.slice(1), 16) : null;
}

export interface PixelSprite {
  /**
   * Letter -> colour: a palette name for code-drawn art, or '#rrggbb' for
   * the player's own art, which keeps its own colours (GAME_DESIGN.md §8.1).
   */
  readonly legend: Readonly<Record<string, LegendColour>>;
  /** One grid per animation frame; every frame is the same size. */
  readonly frames: readonly (readonly string[])[];
}

export interface Pixel {
  readonly x: number;
  readonly y: number;
  readonly color: number;
}

/** Width and height of one frame. */
export function spriteSize(sprite: PixelSprite): { width: number; height: number } {
  const first = sprite.frames[0] ?? [];
  return { width: first[0]?.length ?? 0, height: first.length };
}

/** Everything wrong with a sprite, as readable messages; empty when it's fine. */
export function spriteProblems(sprite: PixelSprite): string[] {
  const problems: string[] = [];
  for (const [letter, color] of Object.entries(sprite.legend)) {
    if (letter.length !== 1) problems.push(`legend key "${letter}" must be one letter`);
    if (letter === CLEAR) problems.push(`"${CLEAR}" is always see-through and can't be in the legend`);
    if (colourValue(color) === null) problems.push(`"${letter}" is "${color}", which isn't a palette colour or #rrggbb`);
  }
  if (sprite.frames.length === 0) return [...problems, 'no frames'];

  const { width, height } = spriteSize(sprite);
  if (width === 0) problems.push('the first frame is empty');
  sprite.frames.forEach((frame, f) => {
    if (frame.length !== height) problems.push(`frame ${f} is ${frame.length} rows tall, not ${height}`);
    frame.forEach((row, y) => {
      if (row.length !== width) problems.push(`frame ${f} row ${y} is ${row.length} wide, not ${width}`);
      for (const letter of new Set(row)) {
        if (letter !== CLEAR && !(letter in sprite.legend)) {
          problems.push(`frame ${f} row ${y} uses "${letter}", which isn't in the legend`);
        }
      }
    });
  });
  return problems;
}

/** The coloured (non-clear) pixels of one frame. */
export function framePixels(sprite: PixelSprite, frame: number): Pixel[] {
  const pixels: Pixel[] = [];
  (sprite.frames[frame] ?? []).forEach((row, y) => {
    [...row].forEach((letter, x) => {
      const name = sprite.legend[letter];
      const color = letter !== CLEAR && name ? colourValue(name) : null;
      if (color !== null) pixels.push({ x, y, color });
    });
  });
  return pixels;
}
