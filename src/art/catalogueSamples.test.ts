import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from '../data/clothing';
import { PLAYER_ANIMALS } from '../data/playerAnimals';
import { spriteProblems, spriteSize } from './pixelSprite';
import { SPRITE_ART } from './spriteArt';
import { clothingArt } from '../data/clothingFits';
import { CATALOGUE_SAMPLES, catalogueSampleName } from './sprites/catalogueSamples';
import { DEER_VENDOR_IDLE } from './sprites/stallVendorIdle';
import { holes, strayPixels } from './checks';

describe('catalogue outfit samples', () => {
  it('keeps the bunny ear gap clear in its standing and walking front views', () => {
    for (const frame of SPRITE_ART.rabbit.frames.slice(0, 3)) {
      expect(frame[5].slice(9, 12)).toBe('...');
      expect(frame[5][8]).toBe('a');
      expect(frame[5][12]).toBe('a');
    }
    for (const item of CLOTHING_IDS) {
      const sample = CATALOGUE_SAMPLES[catalogueSampleName('rabbit', item)];
      // Hats can cover the gap deliberately; uncovered pixels stay clear.
      const garment = SPRITE_ART[clothingArt('rabbit', item)].frames[0];
      for (const x of [9, 11]) if (garment[5][x] === '.') expect(sample.frames[0][5][x]).toBe('.');
    }
  });
  for (const animal of PLAYER_ANIMALS) {
    it(`shows the active ${animal} with its original body and advertised garment`, () => {
      for (const item of CLOTHING_IDS) {
        const dummy = CATALOGUE_SAMPLES[catalogueSampleName(animal, item)];
        expect(spriteProblems(dummy)).toEqual([]);
        expect(spriteSize(dummy).height * 2).toBeLessThanOrEqual(84);
        expect(holes(dummy.frames[0]), item).toBe(0);
        expect(strayPixels(dummy.frames[0]), item).toBe(0);
        const body = SPRITE_ART[animal], garment = SPRITE_ART[clothingArt(animal, item)];
        expect(spriteSize(dummy)).toEqual(spriteSize(body));
        body.frames[0].forEach((row, y) => [...row].forEach((c, x) => {
          const expected = garment.frames[0][y][x];
          expect(dummy.frames[0][y][x]).toBe(expected === '.' ? c : expected);
        }));
      }
    });
  }

  it('keeps the vendor blink confined to the two eyes', () => {
    expect(spriteProblems(DEER_VENDOR_IDLE)).toEqual([]);
    const [open, closed] = DEER_VENDOR_IDLE.frames;
    let changed = 0;
    open.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== closed[y][x]) {
        changed++;
        expect([9, 10, 17, 18]).toContain(x);
        expect(y).toBeGreaterThanOrEqual(16);
        expect(y).toBeLessThanOrEqual(18);
      }
    }));
    expect(changed).toBeGreaterThan(0);
  });
});
