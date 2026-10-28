import type { IngredientId } from './ingredients';

// How strict dish scoring is. See GAME_DESIGN.md (Prep Scene).
export interface ScoringConfig {
  /**
   * A dish is "close" if it's at most this many mistakes away from the recipe.
   * A mistake = one layer missing, extra, replaced, or two neighbours swapped
   * (see logic/layerDistance.ts). 0 mistakes = perfect.
   */
  closeTolerance: number;
  /**
   * Ingredients that must sit exactly where the recipe puts them. Everything
   * between them can go in any order: bread > tomato > tuna > bread is as
   * good as bread > tuna > tomato > bread.
   */
  fixedIngredients: readonly IngredientId[];
}

export const SCORING_CONFIG: ScoringConfig = {
  closeTolerance: 1,
  fixedIngredients: ['bread'],
};
