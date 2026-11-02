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

  it('keeps the side clothing mirrored consistently', () => {
    for (const sprite of [SANTA_HAT, SANTA_COAT]) {
      expect(sprite.frames[9]).toEqual(sprite.frames[6].map(row => [...row].reverse().join('')));
    }
  });
});
