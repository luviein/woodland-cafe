import { takeCropWeights, weightBatches, weightKey } from './cropWeights';
import { CROP_IDS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export const CHRISTMAS_TICKET_RATES: Record<CropId, number> = { mushroom: 1, tomato: 2, chilli: 3 };

/** Only Christmas collection entries have an exchange; Golden crops stay stored. */
export function exchangeCrop(id: string): CropId | undefined {
  return CROP_IDS.find(crop => id === `christmas.${crop}`);
}

export const cropTicketValue = (crop: CropId, grams: number): number => Math.max(1, Math.ceil(CHRISTMAS_TICKET_RATES[crop] * grams / 1000));
export function christmasSaleValue(state: GameState, crop: CropId, amount: number | 'all'): number {
  const owned = state.garden.harvests.christmas[crop];
  let left = amount === 'all' ? owned : Math.min(owned, amount), total = 0;
  for (const batch of weightBatches(state.cropWeights, weightKey(crop, 'christmas'), owned)) {
    const count = Math.min(left, batch.count); total += count * cropTicketValue(crop, batch.grams); left -= count;
  }
  return total;
}

/** A sale is atomic: invalid or unaffordable quantities leave both balances alone. */
export function sellChristmasCrop(state: GameState, crop: CropId, amount: number | 'all'): GameState {
  const owned = state.garden.harvests.christmas[crop];
  const quantity = amount === 'all' ? owned : amount;
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > owned) return state;
  const tickets = state.christmasTickets + christmasSaleValue(state, crop, quantity);
  if (!Number.isSafeInteger(tickets)) return state;
  const cropWeights = takeCropWeights(state.cropWeights, weightKey(crop, 'christmas'), owned, quantity).weights;
  return { ...state, cropWeights, christmasTickets: tickets, garden: { ...state.garden,
    harvests: { ...state.garden.harvests, christmas: { ...state.garden.harvests.christmas, [crop]: owned - quantity } },
  } };
}
