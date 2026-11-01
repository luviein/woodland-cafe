import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';
import { framePixels, spriteProblems, spriteSize, type PixelSprite } from './pixelSprite';
import { ART_NAMES, SPRITE_ART } from './spriteArt';

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

const tiny: PixelSprite = { legend: { o: 'darkBrown', a: 'orange' }, frames: [['.o', 'ao']] };

describe('pixel sprites', () => {
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
    ['"." in the legend', { legend: { '.': 'tan' }, frames: [['.']] }, /always see-through/],
  ])('report %s', (_name, sprite, problem) => {
    expect(spriteProblems(sprite).join('\n')).toMatch(problem);
  });
});
