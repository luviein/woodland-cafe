import { CROP_IDS, SPECIAL_VARIANTS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export type CollectionId = `${typeof SPECIAL_VARIANTS[number]}.${CropId}`;
export const COLLECTION_ITEMS = SPECIAL_VARIANTS.flatMap(variant => CROP_IDS.map(crop => ({
  id: `${variant}.${crop}` as CollectionId, variant, crop,
})));
export const COLLECTION_IDS = COLLECTION_ITEMS.map(item => item.id);

/** Donate once from special harvests; cooking stock and both wallets stay untouched. */
export function donateCrop(state: GameState, id: CollectionId): GameState {
  const item = COLLECTION_ITEMS.find(item => item.id === id);
  if (!item || state.cropCollection.includes(id) || state.garden.harvests[item.variant][item.crop] < 1) return state;
  const { variant, crop } = item;
  return { ...state,
    cropCollection: COLLECTION_IDS.filter(entry => entry === id || state.cropCollection.includes(entry)),
    garden: { ...state.garden, harvests: { ...state.garden.harvests,
      [variant]: { ...state.garden.harvests[variant], [crop]: state.garden.harvests[variant][crop] - 1 },
    } },
  };
}
