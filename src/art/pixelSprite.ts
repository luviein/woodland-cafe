import { PALETTE, type PaletteName } from './palette';

// Sprites drawn in code as text grids (GAME_DESIGN.md §8.2): each row is a
// string, each letter one pixel. The legend says which palette colour a
// letter means, per sprite, so letters can be picked to read well ("o" for
// outline, "e" for eye). Plain data, so tests can check every sprite without
// a browser; the Boot scene turns them into textures.

/** The letter for a see-through pixel, in every sprite. */
export const CLEAR = '.';

export interface PixelSprite {
  readonly legend: Readonly<Record<string, PaletteName>>;
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
    if (!(color in PALETTE)) problems.push(`"${letter}" is "${color}", which isn't a palette colour`);
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
      if (letter !== CLEAR && name) pixels.push({ x, y, color: PALETTE[name] });
    });
  });
  return pixels;
}
