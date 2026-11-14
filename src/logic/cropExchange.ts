import { CROP_IDS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export const CHRISTMAS_TICKET_RATES: Record<CropId, number> = { mushroom: 1, tomato: 2, chilli: 3 };

/** Only Christmas collection entries have an exchange; Golden crops stay stored. */
export function exchangeCrop(id: string): CropId | undefined {
  return CROP_IDS.find(crop => id === `christmas.${crop}`);
}

/** A sale is atomic: invalid or unaffordable quantities leave both balances alone. */
export function sellChristmasCrop(state: GameState, crop: CropId, amount: number | 'all'): GameState {
  const owned = state.garden.harvests.christmas[crop];
  const quantity = amount === 'all' ? owned : amount;
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > owned) return state;
  const tickets = state.christmasTickets + quantity * CHRISTMAS_TICKET_RATES[crop];
  if (!Number.isSafeInteger(tickets)) return state;
  return { ...state, christmasTickets: tickets, garden: { ...state.garden,
    harvests: { ...state.garden.harvests, christmas: { ...state.garden.harvests.christmas, [crop]: owned - quantity } },
  } };
}
