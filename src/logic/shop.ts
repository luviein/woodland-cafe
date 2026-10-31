import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { SHOP_IDS, SHOPS, type ShopId } from '../data/shops';
import type { OutdoorLocationId } from '../data/outdoorAreas';
import { spendLeaves, type GameState } from './gameState';
import type { Point } from './layout';

// Buying at the Marketplace (GAME_DESIGN.md §5.6). Like the rest of logic/,
// these take a state and return a new one; the shop panel only shows what
// they allow and calls them.

/** The player stands this far below a stall's counter to shop there. */
const STAND_BELOW = 26;

export function shopsAt(location: OutdoorLocationId): ShopId[] {
  return SHOP_IDS.filter((id) => SHOPS[id].location === location);
}

/** Where the player walks to shop at `id` (in front of the counter). */
export function shopStandPoint(id: ShopId): Point {
  const { x, y } = SHOPS[id].stall;
  return { x, y: y + STAND_BELOW };
}

/** Leaves for `quantity` units of stock, at the unit price (no rush markup). */
export function stockCost(id: IngredientId, quantity: number): number {
  return INGREDIENTS[id].unitPrice * quantity;
}

export function canBuyStock(state: GameState, id: IngredientId, quantity: number): boolean {
  return state.ingredients.includes(id) && stockCost(id, quantity) <= state.leaves;
}

/**
 * Buys `quantity` units of an owned ingredient into stock. Throws if it
 * isn't owned or can't be paid for: the panel greys those buttons out, so
 * getting here anyway is a bug.
 */
export function buyStock(state: GameState, id: IngredientId, quantity: number): GameState {
  if (!state.ingredients.includes(id)) throw new Error(`buyStock: '${id}' isn't owned`);
  const paid = spendLeaves(state, stockCost(id, quantity));
  return { ...paid, stock: { ...paid.stock, [id]: paid.stock[id] + quantity } };
}
