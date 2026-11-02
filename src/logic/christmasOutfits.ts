import { CLOTHING_SLOTS, clothingIn } from '../data/clothing';
import { SHOPS } from '../data/shops';
import { inSeason } from './shop';
import { seededRng } from './random';
import { emptyOutfit, equip, type Outfit } from './wardrobe';

/** Stable for one visit, without consuming the order generator's randomness. */
export function christmasCustomerOutfit(id: number, day: number, today: Date, allSeasons = false): Outfit {
  if (!allSeasons && !inSeason(SHOPS.christmas, today)) return emptyOutfit();
  const rng = seededRng(day * 1000003 + id * 7919);
  let outfit = emptyOutfit();
  for (const slot of CLOTHING_SLOTS) {
    if (rng() >= 0.65) continue;
    const items = clothingIn(slot);
    outfit = equip(outfit, slot, items[Math.floor(rng() * items.length)]);
  }
  if (!Object.values(outfit).some(Boolean)) {
    const tops = clothingIn('top');
    outfit.top = tops[Math.floor(rng() * tops.length)] as Outfit['top'];
  }
  return outfit;
}
