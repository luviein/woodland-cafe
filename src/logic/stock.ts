import { INGREDIENT_IDS, INGREDIENTS, type IngredientId } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { STOCK_CONFIG, type StockConfig } from '../data/stockConfig';
import type { Order } from './types';

/** How many of each ingredient the cafe has (GAME_DESIGN.md §3.6). */
export type Stock = Record<IngredientId, number>;

/** The bits of the game state that stock rules need. */
export interface Pantry {
  stock: Stock;
  leaves: number;
}

/** How one ingredient of a dish is supplied: from stock first, the rest rush-bought. */
export interface IngredientUse {
  id: IngredientId;
  fromStock: number;
  rushed: number;
}

export interface IngredientPlan {
  /** One entry per ingredient, in the order they first appear in the layers. */
  uses: IngredientUse[];
  /** Leaves the rush deliveries cost. */
  rushCost: number;
}

export function startingStock(): Stock {
  return Object.fromEntries(INGREDIENT_IDS.map((id) => [id, INGREDIENTS[id].startingStock])) as Stock;
}

/** Leaves for one unit bought on the spot. */
export function rushPrice(id: IngredientId, config: StockConfig = STOCK_CONFIG): number {
  return INGREDIENTS[id].unitPrice * config.rushPriceMultiplier;
}

/** A plate's layers times the order quantity: a double order uses everything twice. */
export function plateIngredients(layers: readonly IngredientId[], quantity: number): IngredientId[] {
  return Array.from({ length: quantity }, () => layers).flat();
}

/** Everything the order's dish needs, if made right. */
export function orderIngredients(order: Order): IngredientId[] {
  return plateIngredients(RECIPES[order.recipeId].layers, order.quantity);
}

/**
 * How `ingredients` would be supplied: stock first, the rest rush-bought.
 * null if the wallet can't pay for the rush deliveries.
 *
 * One function answers "can I make this?", "can I add this layer?" and
 * "what does serving cost?", so the three can never disagree.
 */
export function planIngredients(
  pantry: Pantry,
  ingredients: readonly IngredientId[],
  config: StockConfig = STOCK_CONFIG,
): IngredientPlan | null {
  // Map keeps insertion order, so `uses` lists ingredients as they appear.
  const needed = new Map<IngredientId, number>();
  for (const id of ingredients) needed.set(id, (needed.get(id) ?? 0) + 1);

  const uses: IngredientUse[] = [];
  let rushCost = 0;
  for (const [id, count] of needed) {
    const fromStock = Math.min(count, pantry.stock[id]);
    const rushed = count - fromStock;
    uses.push({ id, fromStock, rushed });
    rushCost += rushed * rushPrice(id, config);
  }
  return rushCost <= pantry.leaves ? { uses, rushCost } : null;
}

/** True if the order's dish can be made right now (stock + affordable rush). */
export function canMakeOrder(pantry: Pantry, order: Order, config: StockConfig = STOCK_CONFIG): boolean {
  return planIngredients(pantry, orderIngredients(order), config) !== null;
}

/**
 * For the "Out of jam" message when a dish can't be made: the first
 * ingredient that's short on stock. null if the dish can be made.
 */
export function missingIngredient(
  pantry: Pantry,
  ingredients: readonly IngredientId[],
  config: StockConfig = STOCK_CONFIG,
): IngredientId | null {
  const plan = planIngredients(pantry, ingredients, config);
  if (plan) return null;
  // Can't be made with the wallet as it is, so something must be rushed.
  return planIngredients({ ...pantry, leaves: Infinity }, ingredients, config)!.uses.find((u) => u.rushed > 0)!.id;
}

/** What a prep bin shows: stock left, the rush price at 0, or out (can't add). */
export type BinStatus = { kind: 'stock'; left: number } | { kind: 'rush'; price: number } | { kind: 'out' };

/**
 * The bin for `id`, with `plate` already on the plate (those layers are
 * reserved, not used yet). `quantity` matters: a double order needs each
 * layer twice.
 */
export function binStatus(
  pantry: Pantry,
  plate: readonly IngredientId[],
  id: IngredientId,
  quantity: number,
  config: StockConfig = STOCK_CONFIG,
): BinStatus {
  if (!planIngredients(pantry, plateIngredients([...plate, id], quantity), config)) return { kind: 'out' };
  const reserved = plateIngredients(plate, quantity).filter((l) => l === id).length;
  const left = pantry.stock[id] - reserved;
  return left > 0 ? { kind: 'stock', left } : { kind: 'rush', price: rushPrice(id, config) };
}

/**
 * Uses `ingredients` up: stock goes down and rush deliveries are paid for.
 * Returns the new state (the old one is left untouched) and what was used,
 * for the day summary. Throws if they can't be paid for: the prep bins stop
 * that happening, so it would be a bug.
 */
export function useIngredients<T extends Pantry>(
  state: T,
  ingredients: readonly IngredientId[],
  config: StockConfig = STOCK_CONFIG,
): { state: T; plan: IngredientPlan } {
  const plan = planIngredients(state, ingredients, config);
  if (!plan) throw new Error(`useIngredients: can't pay for ${ingredients.join(', ')}`);
  const stock = { ...state.stock };
  for (const u of plan.uses) stock[u.id] -= u.fromStock;
  return { state: { ...state, stock, leaves: state.leaves - plan.rushCost }, plan };
}
