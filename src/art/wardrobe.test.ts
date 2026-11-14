import { describe, expect, it } from 'vitest';
import { spriteSize } from './pixelSprite';
import { HEDGEHOG } from './sprites/sheetCritters';
import { HEDGEHOG_SANTA_PREVIEW, SANTA_COAT, SANTA_HAT } from './sprites/wardrobe';
import { CLOTHING_FITS } from '../data/clothingFits';
import { SPRITE_ART } from './spriteArt';
import CLOTHING_RIG from '../data/clothingRig.json';

describe('hedgehog Christmas clothing', () => {
  it('fits every original facing and walking frame without moving the feet', () => {
    for (const sprite of [SANTA_HAT, SANTA_COAT, HEDGEHOG_SANTA_PREVIEW]) {
      expect(spriteSize(sprite)).toEqual(spriteSize(HEDGEHOG));
      expect(sprite.frames).toHaveLength(HEDGEHOG.frames.length);
    }
    HEDGEHOG_SANTA_PREVIEW.frames.forEach((frame, f) => {
      expect(frame.at(-1)).toBe(HEDGEHOG.frames[f].at(-1));
    });
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

describe('shared clothing fittings', () => {
  it('draws the rabbit back seam continuously beside its tail in every right pose', () => {
    const coat = SPRITE_ART[CLOTHING_FITS.rabbit.santaCoat];
    for (const frame of coat.frames.slice(9, 12)) {
      for (const [x, y] of CLOTHING_RIG.rabbit.right.coatOutline) expect(frame[y][x]).toBe('O');
      // Keep the tail itself visible beside the seam.
      for (let y = 28; y <= 31; y++) expect(frame[y].slice(0, 5)).toBe('.....');
    }
  });
  it('joins the rabbit right brim to the forehead outline in every pose', () => {
    const hat = SPRITE_ART[CLOTHING_FITS.rabbit.santaHat];
    for (const frame of hat.frames.slice(9, 12)) {
      for (const [x, y] of CLOTHING_RIG.rabbit.right.outlineJoin) expect(frame[y][x]).toBe('O');
    }
  });
  it('attaches every side hat to its forehead while keeping the eye area clear', () => {
    for (const [animal, rig] of Object.entries(CLOTHING_RIG)) {
      const fit = CLOTHING_FITS[animal as keyof typeof CLOTHING_FITS];
      for (const [side, start] of [['left', 6], ['right', 9]] as const) {
        const { head: [left, right, brim], eyes } = rig[side];
        for (let pose = 0; pose < 3; pose++) {
          const frame = SPRITE_ART[fit.santaHat].frames[start + pose];
          expect(frame[brim].slice(left + 1, right)).toMatch(/^[CT]+$/);
          expect(frame.slice(eyes - 1).every(row => /^\.+$/.test(row))).toBe(true);
        }
      }
    }
  });
  it('continues each hat brim underneath the pompom without a gap', () => {
    for (const fit of Object.values(CLOTHING_FITS)) {
      for (const frame of SPRITE_ART[fit.santaHat].frames) {
        const brim = [...frame].sort((a, b) => (b.match(/[CT]/g)?.length ?? 0) - (a.match(/[CT]/g)?.length ?? 0))[0];
        const start = brim.search(/[CT]/);
        const end = Math.max(brim.lastIndexOf('C'), brim.lastIndexOf('T'));
        expect(start).toBeGreaterThanOrEqual(0);
        expect(brim.slice(start, end + 1)).toMatch(/^[CT]+$/);
      }
    }
  });
  for (const [animal, fit] of Object.entries(CLOTHING_FITS)) {
    it(`keeps ${animal}'s walking feet clear of its Santa clothing`, () => {
      for (const name of [fit.santaHat, fit.santaCoat]) {
        const clothing = SPRITE_ART[name];
        clothing.frames.forEach(frame => {
          expect(frame.at(-1)).toMatch(/^\.+$/);
        });
      }
    });
  }
});
