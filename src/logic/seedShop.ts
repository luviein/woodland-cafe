import { CROP_IDS, CROPS, type CropEvent, type SeedType } from '../data/crops';
import { canBuySeed, seedCount, seedPrice } from './garden';
import type { GameState } from './gameState';

/** Live shop data stays separate from the sample numbers printed on the reference. */
export function seedShopEntries(state: GameState, event: CropEvent | null) {
  return (['normal', 'christmas'] as const).flatMap(seed => CROP_IDS.map(crop => ({
    crop, seed: seed as SeedType, name: CROPS[crop].name,
    art: `seedPacket${crop[0].toUpperCase()}${crop.slice(1)}`,
    price: seedPrice(crop, seed), owned: seedCount(state.garden, crop, seed),
    locked: !state.ingredients.includes(crop), outOfSeason: seed === 'christmas' && !event,
    enabled: canBuySeed(state, crop, seed, event),
  })));
}
