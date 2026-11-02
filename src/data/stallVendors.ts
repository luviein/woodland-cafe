import type { ArtName } from '../art/spriteArt';
import { layoutPoint } from '../layout/positions';
import { SHOPS } from './shops';

export const CHRISTMAS_VENDOR = {
  art: 'deerSantaPreview' as ArtName,
  // The awning hides the antlers and upper hat; the counter hides the legs.
  crop: { width: 30, height: 14, sourceY: 11 },
  get position() {
    const stall = SHOPS.christmas.stall;
    return layoutPoint('marketplace', 'vendor.christmas', { x: stall.x, y: stall.y - 8 });
  },
};
