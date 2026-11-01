import { STARTER_INGREDIENTS, type IngredientId } from '../data/ingredients';
import { LEAF_CONFIG, type LeafConfig } from '../data/leafConfig';
import type { UpgradeId } from '../data/upgrades';
import type { EmployeeRole } from '../data/employees';
import { startingFurniture, type Furniture } from './furniture';
import { startingStock, type Stock } from './stock';
import type { TutorialState } from './tutorial';
import { TIP_IDS, type TipId } from '../data/tutorial';

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
 * Unlocked locations join it in the milestone that needs them.
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
  /** Leaves picked up from the ground today, for the daily cap (data/leafConfig.ts). */
  leavesPickedToday: number;
  /** Ids of forage spots gathered today; they grow back the next day (foraging.ts). */
  foragedToday: readonly string[];
  /** Tables and chairs: placed in the cafe, and in storage (furniture.ts). */
  furniture: Furniture;
  /** Roles hired at the Notice Board; each works every day until let go (employees.ts). */
  employees: readonly EmployeeRole[];
  /** Where the player is in Grandma Badger's tutorial (tutorial.ts); 'done' once over. */
  tutorial: TutorialState;
  /** One-off tips already shown (or skipped), e.g. Decorate's (data/tutorial.ts). */
  tipsSeen: readonly TipId[];
}

export function createNewGame(): GameState {
  return {
    day: 1,
    leaves: 0,
    ingredients: STARTER_INGREDIENTS,
    upgrades: [],
    stock: startingStock(),
    leavesPickedToday: 0,
    foragedToday: [],
    furniture: startingFurniture(),
    employees: [],
    tutorial: 'intro',
    tipsSeen: [],
  };
}

/** Marks a one-off tip as shown, so it never shows again. */
export function seeTip(state: GameState, tip: TipId): GameState {
  return state.tipsSeen.includes(tip) ? state : { ...state, tipsSeen: TIP_IDS.filter((t) => t === tip || state.tipsSeen.includes(t)) };
}

/** Both place guides seen: the tutorial's explore step is done (GAME_DESIGN.md §5.9). */
export function exploredAll(state: GameState): boolean {
  return state.tipsSeen.includes('marketplace') && state.tipsSeen.includes('forest');
}

/** Skip tutorial: the tutorial is over, and the one-off tips are skipped too (GAME_DESIGN.md §5.9). */
export function skipTutorial(state: GameState): GameState {
  return { ...state, tutorial: 'done', tipsSeen: [...TIP_IDS] };
}

/**
 * On to the next day. Leaves and everything owned carry over; the leaf
 * pickup cap starts again and forage spots grow back.
 */
export function startNextDay(state: GameState): GameState {
  return { ...state, day: state.day + 1, leavesPickedToday: 0, foragedToday: [] };
}

/** How many more Leaves can be picked up from the ground today (never below 0). */
export function leavesLeftToday(state: GameState, config: LeafConfig = LEAF_CONFIG): number {
  return Math.max(0, config.leavesPerDay - state.leavesPickedToday);
}

/** `count` Leaves picked up from the ground: into the wallet, and towards today's cap. */
export function pickUpLeaves(state: GameState, count: number): GameState {
  return { ...earnLeaves(state, count), leavesPickedToday: state.leavesPickedToday + count };
}

/**
 * The state with `amount` Leaves added. Returns a new object, like the floor
 * functions, so a state handed to a scene can't change behind its back.
 * Throws on a negative or fractional amount: that's always a bug. (Rush
 * deliveries spend Leaves through useIngredients(), the shop through
 * spendLeaves().)
 */
export function earnLeaves(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`earnLeaves: amount must be a whole number, 0 or more (got ${amount})`);
  }
  return { ...state, leaves: state.leaves + amount };
}

/**
 * The state with `amount` Leaves taken out. Throws if the wallet can't pay:
 * callers check first (the shop greys out what you can't afford), so a
 * throw here means a bug, never a wallet below 0.
 */
export function spendLeaves(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`spendLeaves: amount must be a whole number, 0 or more (got ${amount})`);
  }
  if (amount > state.leaves) throw new Error(`spendLeaves: can't pay ${amount} with ${state.leaves} Leaves`);
  return { ...state, leaves: state.leaves - amount };
}
