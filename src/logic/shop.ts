import { INGREDIENT_IDS, INGREDIENTS, type IngredientId } from '../data/ingredients';
import { SHOP_IDS, SHOPS, type ShopId } from '../data/shops';
import type { OutdoorLocationId } from '../data/outdoorAreas';
import { spendLeaves, type GameState } from './gameState';
import type { Point } from './layout';
import { availableRecipes } from './orders';

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

/** Ingredients the Specialty stall sells: everything with an unlock price, owned or not. */
export function unlockableIngredients(): IngredientId[] {
  return INGREDIENT_IDS.filter((id) => INGREDIENTS[id].unlockPrice !== null);
}

export function canUnlock(state: GameState, id: IngredientId): boolean {
  const price = INGREDIENTS[id].unlockPrice;
  return price !== null && !state.ingredients.includes(id) && price <= state.leaves;
}

/** How many more recipes could be ordered if `id` were owned too (shown in the shop). */
export function newRecipesWith(state: GameState, id: IngredientId): number {
  if (state.ingredients.includes(id)) return 0;
  const withIt = { ...state, ingredients: [...state.ingredients, id] };
  return availableRecipes(withIt).length - availableRecipes(state).length;
}

/**
 * Buys an ingredient for good: its recipes can appear in orders, its bin
 * shows at the prep station, and the Pantry sells its stock. It comes with
 * no stock. Throws if it isn't for sale, is already owned, or can't be paid.
 */
export function unlockIngredient(state: GameState, id: IngredientId): GameState {
  const price = INGREDIENTS[id].unlockPrice;
  if (price === null) throw new Error(`unlockIngredient: '${id}' isn't for sale`);
  if (state.ingredients.includes(id)) throw new Error(`unlockIngredient: '${id}' is already owned`);
  const paid = spendLeaves(state, price);
  // Kept in the catalogue order (ingredients.ts), not the order bought, so
  // each prep bin and its number key stay put as more are bought.
  const ingredients = INGREDIENT_IDS.filter((i) => i === id || state.ingredients.includes(i));
  return { ...paid, ingredients };
}
