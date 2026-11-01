import { FURNITURE, type DesignId } from '../data/furniture';
import { INGREDIENT_IDS, INGREDIENTS, type IngredientId } from '../data/ingredients';
import { SHOP_IDS, SHOPS, STALL_COUNTER_HEIGHT, type MonthDay, type ShopDef, type ShopId } from '../data/shops';
import type { OutdoorLocationId } from '../data/outdoorAreas';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import { storePieces } from './furniture';
import { spendLeaves, type GameState } from './gameState';
import type { Point } from './layout';
import { availableRecipes } from './orders';

// Buying at the Marketplace (GAME_DESIGN.md §5.6). Like the rest of logic/,
// these take a state and return a new one; the shop panel only shows what
// they allow and calls them.

/** The player stands this far below a stall's base to shop there. */
const STAND_BELOW_BASE = 10;

/**
 * The shops open at `location` on `today`. A seasonal one (the Christmas
 * stall) only in its season, unless `allSeasons` (for testing, GAME_DESIGN.md §5.10).
 */
export function shopsAt(location: OutdoorLocationId, today: Date, allSeasons = false): ShopId[] {
  return SHOP_IDS.filter((id) => SHOPS[id].location === location && (allSeasons || inSeason(SHOPS[id], today)));
}

/** Whether a shop is there on `today` (by the player's own date). */
export function inSeason(shop: ShopDef, today: Date): boolean {
  if (!shop.season) return true;
  const key = (d: MonthDay) => d.month * 100 + d.day;
  const now = key({ month: today.getMonth() + 1, day: today.getDate() });
  const { from, to } = shop.season;
  // A season can run over New Year (e.g. 20 December to 6 January).
  return key(from) <= key(to) ? now >= key(from) && now <= key(to) : now >= key(from) || now <= key(to);
}

/** Where a stall touches the ground (its base), in pixels: what it's depth-sorted by. */
export function stallBase(id: ShopId): Point {
  const { stall, counterHeight } = SHOPS[id] as ShopDef;
  return { x: stall.x, y: stall.y + (counterHeight ?? STALL_COUNTER_HEIGHT) };
}

/** Where the player walks to shop at `id` (in front of the counter). */
export function shopStandPoint(id: ShopId): Point {
  const base = stallBase(id);
  return { x: base.x, y: base.y + STAND_BELOW_BASE };
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

export function canBuyUpgrade(state: GameState, id: UpgradeId): boolean {
  return !state.upgrades.includes(id) && UPGRADES[id].price <= state.leaves;
}

/** Buys an upgrade for good (it unlocks its modifier). Throws if owned or unaffordable. */
export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  if (state.upgrades.includes(id)) throw new Error(`buyUpgrade: '${id}' is already owned`);
  return addUpgrade(spendLeaves(state, UPGRADES[id].price), id);
}

/** Owns `id` from now on, for free (buyUpgrade charges; the dev console `unlock` doesn't). */
export function addUpgrade(state: GameState, id: UpgradeId): GameState {
  return state.upgrades.includes(id) ? state : { ...state, upgrades: [...state.upgrades, id] };
}

export function canBuyFurniture(state: GameState, design: DesignId): boolean {
  return FURNITURE[design].price <= state.leaves;
}

/** Buys one piece into storage; it's placed from the map's Decorate (GAME_DESIGN.md §5.7). */
export function buyFurniture(state: GameState, design: DesignId): GameState {
  const paid = spendLeaves(state, FURNITURE[design].price);
  return { ...paid, furniture: storePieces(paid.furniture, design, 1) };
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
  return addIngredient(spendLeaves(state, price), id);
}

/** Owns `id` from now on, for free and with no stock (unlockIngredient charges; dev `unlock` doesn't). */
export function addIngredient(state: GameState, id: IngredientId): GameState {
  // Kept in the catalogue order (ingredients.ts), not the order bought, so
  // each prep bin and its number key stay put as more are bought.
  const ingredients = INGREDIENT_IDS.filter((i) => i === id || state.ingredients.includes(i));
  return { ...state, ingredients };
}
