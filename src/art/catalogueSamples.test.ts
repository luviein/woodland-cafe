import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from '../data/clothing';
import { PLAYER_ANIMALS } from '../data/playerAnimals';
import { spriteSize } from './pixelSprite';
import { SPRITE_ART } from './spriteArt';
import { clothingArt } from '../data/clothingFits';
import { CATALOGUE_SAMPLES, catalogueSampleName } from './sprites/catalogueSamples';

describe('catalogue outfit samples', () => {
  for (const animal of PLAYER_ANIMALS) {
    it(`shows the active ${animal} with its original body and advertised garment`, () => {
      for (const item of CLOTHING_IDS) {
        const dummy = CATALOGUE_SAMPLES[catalogueSampleName(animal, item)];
        expect(spriteSize(dummy).height * 2).toBeLessThanOrEqual(84);
        const body = SPRITE_ART[animal], garment = SPRITE_ART[clothingArt(animal, item)];
        expect(spriteSize(dummy)).toEqual(spriteSize(body));
        const expected = body.frames[0].map((row, y) => [...row].map((pixel, x) => {
          const garmentPixel = garment.frames[0][y][x];
          return garmentPixel === '.' ? pixel : garmentPixel;
        }).join(''));
        expect(dummy.frames[0], item).toEqual(expected);
      }
    });
  }

});
