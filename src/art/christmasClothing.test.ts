import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from '../data/clothing';
import { clothingArt } from '../data/clothingFits';
import { CLOTHING_ANIMALS } from '../data/clothingAnimals';
import { holes, strayPixels } from './checks';
import { spriteSize, spriteProblems } from './pixelSprite';
import { SPRITE_ART } from './spriteArt';

describe('Christmas clothing collection', () => {
  it('covers the two rabbit cuff gaps rather than showing base outline specks', () => {
    for (const id of ['treeJumper', 'reindeerSweater', 'festiveJumper'] as const) {
      for (const frame of SPRITE_ART[clothingArt('rabbit', id)].frames.slice(0, 3)) {
        expect(frame[30][4]).not.toBe('.');
        expect(frame[30][16]).not.toBe('.');
      }
    }
  });
  it('leaves the mouse rear tail visible when boots are equipped', () => {
    for (const id of ['redBoots', 'brownBoots', 'buckleBoots', 'fluffyBoots'] as const) {
      for (const frame of SPRITE_ART[clothingArt('mouse', id)].frames.slice(3, 6)) {
        for (let y = 28; y < 32; y++) expect(frame[y].slice(11, 15)).toBe('....');
      }
    }
  });
  for (const animal of CLOTHING_ANIMALS) {
    it(`fits ${animal}'s frame grid without holes or stray pixels in every outfit view`, () => {
      const body = SPRITE_ART[animal];
      for (const id of CLOTHING_IDS) {
        const sprite = SPRITE_ART[clothingArt(animal, id)];
        expect(spriteSize(sprite)).toEqual(spriteSize(body));
        expect(spriteProblems(sprite)).toEqual([]);
        expect(sprite.frames).toHaveLength(12);
        sprite.frames.forEach((frame, f) => {
          const combined = body.frames[f].map((row, y) => [...row].map((c, x) => frame[y][x] === '.' ? c : frame[y][x]).join(''));
          expect(holes(combined), `${id} frame ${f}`).toBe(0);
          expect(strayPixels(combined), `${id} frame ${f}`).toBe(0);
        });
      }
    });
  }
});
