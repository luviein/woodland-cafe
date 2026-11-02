import type { PixelSprite } from '../pixelSprite';
import { DEER_SANTA_PREVIEW } from './wardrobeCritters';

const open = DEER_SANTA_PREVIEW.frames[0];
const blink = open.map((row, y) => [...row].map((c, x) => {
  // Replace both eyes with fur and one matching closed eyelid each.
  if ((x === 9 || x === 10 || x === 17 || x === 18) && y >= 16 && y <= 18) {
    return y === 17 ? 'o' : y === 16 ? 'g' : 't';
  }
  return c;
}).join(''));

export const DEER_VENDOR_IDLE: PixelSprite = {
  legend: DEER_SANTA_PREVIEW.legend,
  frames: [open, blink],
};
