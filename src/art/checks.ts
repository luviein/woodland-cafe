import { CLEAR, spriteProblems, type PixelSprite } from './pixelSprite';
import { CUSTOMER_ART, SPRITE_ART, VIEW_ART, type ArtName } from './spriteArt';
import { VIEW, viewFrame } from './sprites/sheetCritters';

// Quality checks on sprites (GAME_DESIGN.md §9.2), shared by the tests and the
// sprite gallery. Every sprite must be a well-formed grid; critters must also
// be clean: no see-through holes inside the outline, no stray lone pixels,
// and a symmetrical head in the front view (both eyes the same).

/** Every critter: the cast and the customers. */
export const CRITTER_ART: readonly ArtName[] = ['hedgehog', 'raccoon', 'frog', 'badger', ...CUSTOMER_ART];

/** See-through pixels that can't reach the frame's edge: holes inside the outline. */
export function holes(frame: readonly string[]): number {
  const H = frame.length;
  const W = frame[0]?.length ?? 0;
  const outside = new Set<number>();
  const todo: [number, number][] = [];
  for (let x = 0; x < W; x++) todo.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) todo.push([0, y], [W - 1, y]);
  while (todo.length) {
    const [x, y] = todo.pop()!;
    if (x < 0 || y < 0 || x >= W || y >= H || frame[y][x] !== CLEAR || outside.has(y * W + x)) continue;
    outside.add(y * W + x);
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return frame.reduce((n, row, y) => n + [...row].filter((c, x) => c === CLEAR && !outside.has(y * W + x)).length, 0);
}

/** Drawn pixels with nothing drawn on any side of them: specks left over from drawing or converting. */
export function strayPixels(frame: readonly string[]): number {
  const drawn = (x: number, y: number) => (frame[y]?.[x] ?? CLEAR) !== CLEAR;
  let n = 0;
  frame.forEach((row, y) =>
    [...row].forEach((_, x) => {
      if (drawn(x, y) && !drawn(x + 1, y) && !drawn(x - 1, y) && !drawn(x, y + 1) && !drawn(x, y - 1)) n++;
    }),
  );
  return n;
}

/** A frame mirrored around its own drawn middle. */
export function mirrored(frame: readonly string[]): string[] {
  const cols = frame.flatMap((row) => [...row].flatMap((c, x) => (c === CLEAR ? [] : [x])));
  const sum = Math.min(...cols) + Math.max(...cols);
  return frame.map((row) => [...row].map((_, x) => row[sum - x] ?? CLEAR).join(''));
}

/** The head: the top 55% of a frame's drawn rows (where the face is; a tail may stick out lower down). */
export function head(frame: readonly string[]): string[] {
  const rows = frame.map((row, y) => (row.replaceAll(CLEAR, '') ? y : -1)).filter((y) => y >= 0);
  const top = rows[0], bottom = rows[rows.length - 1];
  return frame.slice(top, top + Math.round((bottom - top) * 0.55) + 1);
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((row, i) => row === b[i]);

/** Everything a sprite should be checked for, as short sentences; empty when it's fine. */
export function spriteQuality(name: ArtName, sprite: PixelSprite = SPRITE_ART[name]): string[] {
  const problems = spriteProblems(sprite);
  if (problems.length || !CRITTER_ART.includes(name)) return problems;
  sprite.frames.forEach((frame, f) => {
    const h = holes(frame);
    if (h) problems.push(`frame ${f}: ${h} see-through pixel${h > 1 ? 's' : ''} inside the outline`);
    const s = strayPixels(frame);
    if (s) problems.push(`frame ${f}: ${s} stray pixel${s > 1 ? 's' : ''} on their own`);
  });
  if (VIEW_ART.has(name)) {
    const face = head(sprite.frames[viewFrame(VIEW.front)] ?? []);
    if (face.length && !same(mirrored(face), face)) problems.push("the front view's head isn't symmetrical (e.g. the eyes don't match)");
  }
  return problems;
}
