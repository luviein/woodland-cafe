import { describe, expect, it } from 'vitest';
import { holes, strayPixels } from './checks';
import { spriteProblems, spriteSize } from './pixelSprite';
import { HEDGEHOG } from './sprites/sheetCritters';
import { HEDGEHOG_SANTA_PREVIEW, SANTA_COAT, SANTA_HAT } from './sprites/wardrobe';

describe('hedgehog Christmas clothing', () => {
  it('fits every original facing and walking frame without moving the feet', () => {
    for (const sprite of [SANTA_HAT, SANTA_COAT, HEDGEHOG_SANTA_PREVIEW]) {
      expect(spriteProblems(sprite)).toEqual([]);
      expect(spriteSize(sprite)).toEqual(spriteSize(HEDGEHOG));
      expect(sprite.frames).toHaveLength(HEDGEHOG.frames.length);
    }
    HEDGEHOG_SANTA_PREVIEW.frames.forEach((frame, f) => {
      expect(frame.at(-1)).toBe(HEDGEHOG.frames[f].at(-1));
      expect(holes(frame)).toBe(0);
      expect(strayPixels(frame)).toBe(0);
    });
  });

  it('keeps the side hats mirrored consistently', () => {
    expect(SANTA_HAT.frames[9]).toEqual(SANTA_HAT.frames[6].map(row => [...row].reverse().join('')));
  });

  it('keeps the coat off the back quills and fits the front and left torso', () => {
    for (const frame of SANTA_COAT.frames.slice(3, 6)) expect(frame.every(row => /^\.+$/.test(row))).toBe(true);
    // These views were painted over the spines or left bare fur beside the coat.
    for (const f of [0, 1, 2, 6, 7, 8]) {
      for (let y = 20; y <= 26; y++) {
        [...HEDGEHOG.frames[f][y]].forEach((colour, x) => {
          const covered = SANTA_COAT.frames[f][y][x] !== '.';
          expect(covered).toBe('efghijklmnpqrstuv'.includes(colour));
        });
      }
    }
  });
});
