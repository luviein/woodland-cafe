import type { IngredientCounts } from '../data/ingredients';
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
 * One plate of food: which ingredients are on it and which modifiers were
 * applied. Used both for what the order expects and what the player made,
 * so the two can be compared like-for-like.
 */
export interface Plate {
  ingredients: IngredientCounts;
  modifiers: readonly ModifierId[];
}

export type Score = 'perfect' | 'close' | 'wrong';

export interface ScoreResult {
  /** Based on ingredients only. */
  score: Score;
  /**
   * Requested modifiers the dish doesn't have. Kept separate from `score`
   * because the design treats them differently: a missing modifier cuts the
   * tip (to 20%) rather than changing perfect/close/wrong.
   */
  missingModifiers: ModifierId[];
}
