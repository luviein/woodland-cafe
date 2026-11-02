import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from '../data/clothing';
import { PLAYER_ANIMALS } from '../data/playerAnimals';
import { spriteProblems, spriteSize } from './pixelSprite';
import { CRITTER_SKELETON } from './sprites/critterSkeleton';
import { MANNEQUIN_ART, mannequinArtName } from './sprites/mannequins';
import { DEER_VENDOR_IDLE } from './sprites/stallVendorIdle';
import { holes, strayPixels } from './checks';

describe('catalogue mannequins', () => {
  for (const animal of PLAYER_ANIMALS) {
    it(`uses the shared grey skeleton for every ${animal} catalogue display`, () => {
      for (const item of CLOTHING_IDS) {
        const dummy = MANNEQUIN_ART[mannequinArtName(animal, item)];
        expect(spriteProblems(dummy)).toEqual([]);
        expect(spriteSize(dummy).height * 2).toBeLessThanOrEqual(84);
        expect(holes(dummy.frames[0]), item).toBe(0);
        expect(strayPixels(dummy.frames[0]), item).toBe(0);
        expect(spriteSize(dummy)).toEqual({ width: 32, height: 40 });
        let garmentPixels = 0;
        dummy.frames[0].forEach((row, y) => [...row].forEach((c, x) => {
          if (c === '.' || ['J', 'K', 'L'].includes(c)) expect(c).toBe(CRITTER_SKELETON.frames[0][y][x]);
          else garmentPixels++;
        }));
        expect(garmentPixels).toBeGreaterThan(0);
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
