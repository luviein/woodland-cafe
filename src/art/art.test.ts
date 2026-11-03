import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';
import { framePixels, spriteProblems, spriteSize, type PixelSprite } from './pixelSprite';
import { ART_NAMES, CUSTOMER_ART, customerArt, SPRITE_ART, VIEW_ART } from './spriteArt';
import { face, holes, spriteQuality, strayPixels } from './checks';

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

describe('sprite quality (the same checks as the sprite gallery)', () => {
  it.each(ART_NAMES)('%s passes', (name) => {
    expect(spriteQuality(name)).toEqual([]);
  });

  it('catches holes, stray pixels and an uneven front view', () => {
    expect(holes(['ooo', 'o.o', 'ooo'])).toBe(1);
    expect(holes(['o.o', 'ooo'])).toBe(0); // open to the edge: not a hole
    expect(strayPixels(['o..', '...', '.oo'])).toBe(1);
    expect(face(['o...o', 'axbxa'])).toEqual(['...', 'xbx']); // the middle half, between the ears
    expect(face(['.o...o', 'faxbxa'])).toEqual(['...', 'xbx']); // fluff off to one side doesn't count
  });
});

describe('the cast', () => {
  const cast = ['hedgehog', 'raccoon', 'frog', 'badger', ...CUSTOMER_ART] as const;

  it.each(cast.filter((n) => VIEW_ART.has(n)))('%s has four views, each standing plus two steps', (name) => {
    // Each keeps its own size from the sheet, but always taller than a tile.
    expect(spriteSize(SPRITE_ART[name]).height).toBeGreaterThan(24);
    expect(SPRITE_ART[name].frames).toHaveLength(12);
  });

  it('every critter is the player\'s own four-view art', () => {
    expect(cast.filter((n) => !VIEW_ART.has(n))).toEqual([]);
  });

  it('customers come as every animal, mixed up', () => {
    const firstCycle = Array.from({ length: CUSTOMER_ART.length }, (_, i) => customerArt(i + 1));
    expect(new Set(firstCycle).size).toBe(CUSTOMER_ART.length);
    expect(customerArt(CUSTOMER_ART.length + 1)).toBe(customerArt(1));
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
