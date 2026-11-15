import { cropRecord, heaviestCrop } from './cropWeights';
import { CROP_IDS, SPECIAL_VARIANTS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export type CollectionId = `${typeof SPECIAL_VARIANTS[number]}.${CropId}`;
export const COLLECTION_ITEMS = SPECIAL_VARIANTS.flatMap(variant => CROP_IDS.map(crop => ({
  id: `${variant}.${crop}` as CollectionId, variant, crop,
})));
export const COLLECTION_IDS = COLLECTION_ITEMS.map(item => item.id);

/** Recording never spends a specimen; selling later cannot erase a discovered record. */
export function recordSpecialCrops(state: GameState): GameState {
  let next = state;
  for (const { id, crop, variant } of COLLECTION_ITEMS) {
    const grams = heaviestCrop(next, crop, variant);
    if (grams <= cropRecord(next, id)) continue;
    next = { ...next, cropRecords: { ...next.cropRecords, [id]: grams },
      cropCollection: COLLECTION_IDS.filter(entry => entry === id || next.cropCollection.includes(entry)) };
  }
  return next;
}
