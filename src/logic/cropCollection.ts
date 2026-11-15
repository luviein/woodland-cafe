import { cropRecord, heaviestCrop, takeCropWeights, weightKey } from './cropWeights';
import { CROP_IDS, SPECIAL_VARIANTS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export type CollectionId = `${typeof SPECIAL_VARIANTS[number]}.${CropId}`;
export const COLLECTION_ITEMS = SPECIAL_VARIANTS.flatMap(variant => CROP_IDS.map(crop => ({
  id: `${variant}.${crop}` as CollectionId, variant, crop,
})));
export const COLLECTION_IDS = COLLECTION_ITEMS.map(item => item.id);

/** Donate the heaviest specimen; upgrades spend stock only when the record improves. */
export function donateCrop(state: GameState, id: CollectionId): GameState {
  const item = COLLECTION_ITEMS.find(item => item.id === id);
  if (!item || heaviestCrop(state, item.crop, item.variant) <= cropRecord(state, id)) return state;
  const { variant, crop } = item;
  const taken = takeCropWeights(state.cropWeights, weightKey(crop, variant), state.garden.harvests[variant][crop], 1, true);
  return { ...state, cropWeights: taken.weights, cropRecords: { ...state.cropRecords, [id]: taken.taken[0].grams },
    cropCollection: COLLECTION_IDS.filter(entry => entry === id || state.cropCollection.includes(entry)),
    garden: { ...state.garden, harvests: { ...state.garden.harvests,
      [variant]: { ...state.garden.harvests[variant], [crop]: state.garden.harvests[variant][crop] - 1 },
    } },
  };
}
