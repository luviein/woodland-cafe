import { STARTER_INGREDIENTS, type IngredientId } from '../data/ingredients';
import type { UpgradeId } from '../data/upgrades';
import { startingStock, type Stock } from './stock';

/**
 * Everything about the player's progress, in one place (GAME_DESIGN.md §6).
 *
 * Plain data only: numbers, strings and arrays, no Phaser objects, classes
 * or functions. That's what makes it "serializable": JSON.stringify() and
 * JSON.parse() give back exactly the same thing, so saving and loading
 * (milestone 9) is just writing and reading this object.
 *
 * Its `ingredients` and `upgrades` fields match the Owned type in orders.ts,
 * so a GameState can be passed straight to order generation.
 *
 * Furniture, the cafe layout and unlocked locations join it in the
 * milestones that need them.
 */
export interface GameState {
  /** Which day it is, starting at 1. */
  day: number;
  /** The wallet. Always a whole number, never negative. */
  leaves: number;
  /** Ingredients OWNED: their recipes can appear in orders. */
  ingredients: readonly IngredientId[];
  upgrades: readonly UpgradeId[];
  /** How many of each ingredient are in stock (rules in stock.ts). */
  stock: Stock;
}

export function createNewGame(): GameState {
  return { day: 1, leaves: 0, ingredients: STARTER_INGREDIENTS, upgrades: [], stock: startingStock() };
}

/** On to the next day. Leaves and everything owned carry over. */
export function startNextDay(state: GameState): GameState {
  return { ...state, day: state.day + 1 };
}

/**
 * The state with `amount` Leaves added. Returns a new object, like the floor
 * functions, so a state handed to a scene can't change behind its back.
 * Throws on a negative or fractional amount: that's always a bug. (Rush
 * deliveries spend Leaves through useIngredients(); the shop gets its own
 * spending function in milestone 6.)
 */
export function earnLeaves(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`earnLeaves: amount must be a whole number, 0 or more (got ${amount})`);
  }
  return { ...state, leaves: state.leaves + amount };
}
