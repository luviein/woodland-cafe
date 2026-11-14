import { CROP_IDS, CROPS, type CropEvent, type CropId, type SeedType } from '../data/crops';
import { canBuySeed, seedCount, seedPrice } from './garden';
import type { GameState } from './gameState';

/** The pouch and shop use the same packet family, at their respective native sizes. */
export function seedPacketArtName(crop: CropId, seed: SeedType, small = false): string {
  return `seed${small ? 'Shop' : ''}Packet${crop[0].toUpperCase()}${crop.slice(1)}${seed === 'christmas' ? 'Christmas' : ''}`;
}

/** Live shop data stays separate from the sample numbers printed on the reference. */
export function seedShopEntries(state: GameState, event: CropEvent | null) {
  return (['normal', 'christmas'] as const).flatMap(seed => CROP_IDS.map(crop => ({
    crop, seed: seed as SeedType, name: CROPS[crop].name,
    art: seedPacketArtName(crop, seed),
    price: seedPrice(crop, seed), owned: seedCount(state.garden, crop, seed),
    locked: !state.ingredients.includes(crop), outOfSeason: seed === 'christmas' && !event,
    enabled: canBuySeed(state, crop, seed, event),
  })));
}
