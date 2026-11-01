import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';
import { framePixels, spriteProblems, spriteSize, type PixelSprite } from './pixelSprite';
import { ART_NAMES, CUSTOMER_ART, customerArt, SPRITE_ART, VIEW_ART } from './spriteArt';
import { VIEW, viewFrame } from './sprites/sheetCritters';

describe('the palette', () => {
  it('is Endesga 32: 32 different colours', () => {
    expect(new Set(Object.values(PALETTE)).size).toBe(32);
  });
});

describe('every code-drawn sprite', () => {
  it.each(ART_NAMES)('%s is well formed', (name) => {
    expect(spriteProblems(SPRITE_ART[name])).toEqual([]);
  });
});

/** See-through pixels that can't reach the frame's edge: holes inside the outline. */
function holes(frame: readonly string[]): number {
  const H = frame.length, W = frame[0].length;
  const outside = new Set<number>();
  const todo: [number, number][] = [];
  for (let x = 0; x < W; x++) todo.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) todo.push([0, y], [W - 1, y]);
  while (todo.length) {
    const [x, y] = todo.pop()!;
    if (x < 0 || y < 0 || x >= W || y >= H || frame[y][x] !== '.' || outside.has(y * W + x)) continue;
    outside.add(y * W + x);
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return frame.reduce((n, row, y) => n + [...row].filter((c, x) => c === '.' && !outside.has(y * W + x)).length, 0);
}

/** A frame mirrored around its own drawn middle. */
function mirrored(frame: readonly string[]): string[] {
  const cols = frame.flatMap((row) => [...row].flatMap((c, x) => (c === '.' ? [] : [x])));
  const sum = Math.min(...cols) + Math.max(...cols);
  return frame.map((row) => [...row].map((_, x) => row[sum - x] ?? '.').join(''));
}

describe("the player's own critter art (quality checks)", () => {
  const views = [...VIEW_ART];

  it.each(views)('%s has no see-through holes inside its outline, in any frame', (name) => {
    SPRITE_ART[name].frames.forEach((frame) => expect(holes(frame)).toBe(0));
  });

  it.each(views)('%s looks the same mirrored from the front and the back (so both eyes match)', (name) => {
    for (const view of [VIEW.front, VIEW.back]) {
      const frame = SPRITE_ART[name].frames[viewFrame(view)];
      expect(mirrored(frame)).toEqual([...frame]);
    }
  });
});

describe('the cast', () => {
  const cast = ['hedgehog', 'raccoon', 'frog', 'badger', ...CUSTOMER_ART] as const;

  it.each(cast.filter((n) => VIEW_ART.has(n)))('%s has four views, each standing plus two steps', (name) => {
    // Each keeps its own size from the sheet, but always taller than a tile.
    expect(spriteSize(SPRITE_ART[name]).height).toBeGreaterThan(24);
    expect(SPRITE_ART[name].frames).toHaveLength(12);
  });

  it.each(cast.filter((n) => !VIEW_ART.has(n)))('%s is 16x24, standing plus two steps', (name) => {
    expect(spriteSize(SPRITE_ART[name])).toEqual({ width: 16, height: 24 });
    expect(SPRITE_ART[name].frames).toHaveLength(3);
  });

  it('customers come as every animal, mixed up', () => {
    const firstFive = [1, 2, 3, 4, 5].map(customerArt);
    expect(new Set(firstFive).size).toBe(5);
    expect(customerArt(6)).toBe(customerArt(1));
    expect(customerArt(1)).toBe('mouse'); // the tutorial's guided customer
  });
});

const tiny: PixelSprite = { legend: { o: 'darkBrown', a: 'orange' }, frames: [['.o', 'ao']] };

describe('pixel sprites', () => {
  it('take #rrggbb colours too (the player\'s own art)', () => {
    const own: PixelSprite = { legend: { m: '#c9a98b' }, frames: [['m']] };
    expect(spriteProblems(own)).toEqual([]);
    expect(framePixels(own, 0)).toEqual([{ x: 0, y: 0, color: 0xc9a98b }]);
  });

  it('know their frame size', () => {
    expect(spriteSize(tiny)).toEqual({ width: 2, height: 2 });
  });

  it('give the coloured pixels of a frame, skipping clear ones', () => {
    expect(framePixels(tiny, 0)).toEqual([
      { x: 1, y: 0, color: PALETTE.darkBrown },
      { x: 0, y: 1, color: PALETTE.orange },
      { x: 1, y: 1, color: PALETTE.darkBrown },
    ]);
  });

  it.each<[string, PixelSprite, RegExp]>([
    ['no frames', { legend: {}, frames: [] }, /no frames/],
    ['uneven rows', { legend: { o: 'darkBrown' }, frames: [['oo', 'o']] }, /row 1 is 1 wide, not 2/],
    ['frames of different sizes', { legend: { o: 'darkBrown' }, frames: [['oo'], ['oo', 'oo']] }, /frame 1 is 2 rows tall/],
    ['a letter missing from the legend', { legend: { o: 'darkBrown' }, frames: [['ox']] }, /"x", which isn't in the legend/],
    ['a colour outside the palette', { legend: { o: 'beige' as 'tan' }, frames: [['o']] }, /isn't a palette colour/],
    ['a broken #rrggbb', { legend: { o: '#12345' }, frames: [['o']] }, /isn't a palette colour or #rrggbb/],
    ['"." in the legend', { legend: { '.': 'tan' }, frames: [['.']] }, /always see-through/],
  ])('report %s', (_name, sprite, problem) => {
    expect(spriteProblems(sprite).join('\n')).toMatch(problem);
  });
});
