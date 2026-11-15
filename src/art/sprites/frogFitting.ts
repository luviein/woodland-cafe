import type { PixelSprite } from '../pixelSprite';
import { FROG as FROG_BODY } from './sheetCritters2';

export const FROG_HEADROOM = 6;

/** Derive clothing space from the untouched source, never shifting a regenerated body twice. */
export const FROG: PixelSprite = {
  ...FROG_BODY, frames: FROG_BODY.frames.map(frame => [
    ...Array<string>(FROG_HEADROOM).fill('.'.repeat(frame[0].length)), ...frame,
  ]),
};
