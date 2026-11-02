import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from '../data/clothing';
import { clothingArt } from '../data/clothingFits';
import { PLAYER_ANIMALS } from '../data/playerAnimals';
import { spriteProblems, spriteSize } from './pixelSprite';
import { SPRITE_ART } from './spriteArt';
import { MANNEQUIN_ART, mannequinArtName } from './sprites/mannequins';
import { DEER_VENDOR_IDLE } from './sprites/stallVendorIdle';
import { holes, strayPixels } from './checks';

describe('catalogue mannequins', () => {
  for (const animal of PLAYER_ANIMALS) {
    it(`shows every ${animal} garment unchanged on a clean wooden display`, () => {
      for (const item of CLOTHING_IDS) {
        const dummy = MANNEQUIN_ART[mannequinArtName(animal, item)];
        expect(spriteProblems(dummy)).toEqual([]);
        expect(spriteSize(dummy).height * 2).toBeLessThanOrEqual(84);
        expect(holes(dummy.frames[0]), item).toBe(0);
        expect(strayPixels(dummy.frames[0]), item).toBe(0);
        const clothing = SPRITE_ART[clothingArt(animal, item)];
        // The display must use the critter itself, not a generic oval-headed form.
        SPRITE_ART[animal].frames[0].forEach((row, y) => [...row].forEach((c, x) => {
          if (c !== '.' && clothing.frames[0][y][x] === '.') expect(['J', 'K', 'L']).toContain(dummy.frames[0][y][x]);
        }));
        clothing.frames[0].forEach((row, y) => [...row].forEach((c, x) => {
          if (c !== '.') expect(dummy.frames[0][y][x]).toBe(c);
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
