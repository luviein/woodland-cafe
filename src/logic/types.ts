import type { IngredientId } from '../data/ingredients';
import type { ModifierId } from '../data/modifiers';
import type { RecipeId } from '../data/recipes';

/** What a customer asked for. Plain data, so it can live in saved game state. */
export interface Order {
  recipeId: RecipeId;
  modifiers: ModifierId[];
  /** 2 = double order (Serving Tray). Always 1 until milestone 6. */
  quantity: number;
}

/**
 * One plate of food: its layers (bottom to top) and which modifiers were
 * applied. Used both for what the order expects and what the player made,
 * so the two can be compared like-for-like.
 */
export interface Plate {
  layers: readonly IngredientId[];
  modifiers: readonly ModifierId[];
}

export type Score = 'perfect' | 'close' | 'wrong';

export interface ScoreResult {
  /** Layer mistakes plus modifier mistakes (each missing or extra modifier is one). */
  score: Score;
  /** Requested modifiers the dish doesn't have (each one is a mistake in `score`). */
  missingModifiers: ModifierId[];
  /** Modifiers the dish has that weren't asked for (also a mistake each). */
  extraModifiers: ModifierId[];
}
