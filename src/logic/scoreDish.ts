import type { IngredientCounts, IngredientId } from '../data/ingredients';
import { SCORING_CONFIG } from '../data/scoring';
import type { Plate, ScoreResult } from './types';

/** Total number of items on a plate, e.g. { bread: 1, jam: 2 } -> 3. */
export function countItems(ingredients: IngredientCounts): number {
  return Object.values(ingredients).reduce((sum, n) => sum + (n ?? 0), 0);
}

/**
 * Compares what the player made against what was ordered.
 *
 * Pure function: no Phaser, no global state, same inputs -> same output.
 * That's what makes it easy to unit test, and reusable later by employees
 * (milestone 8) that serve automatically.
 */
export function scoreDish(
  expected: Plate,
  actual: Plate,
  closeTolerance: number = SCORING_CONFIG.closeTolerance,
): ScoreResult {
  const missingModifiers = expected.modifiers.filter((m) => !actual.modifiers.includes(m));

  // An empty plate is always wrong. Without this rule, serving nothing for
  // Plain Bread (1 item) would count as "one missing" and score close.
  if (countItems(actual.ingredients) === 0) {
    return { score: 'wrong', missingModifiers };
  }

  // Look at every ingredient that appears on either plate.
  const ids = new Set([
    ...Object.keys(expected.ingredients),
    ...Object.keys(actual.ingredients),
  ]) as Set<IngredientId>;

  let missing = 0; // items the order wanted but the dish lacks
  let extra = 0; // items on the dish the order didn't want
  for (const id of ids) {
    const diff = (actual.ingredients[id] ?? 0) - (expected.ingredients[id] ?? 0);
    if (diff > 0) extra += diff;
    else missing -= diff;
  }

  // A swap (jam instead of mushroom) shows up as 1 missing + 1 extra, so
  // checking both counts against the tolerance covers missing/extra/swapped.
  if (missing === 0 && extra === 0) {
    return { score: 'perfect', missingModifiers };
  }
  if (missing <= closeTolerance && extra <= closeTolerance) {
    return { score: 'close', missingModifiers };
  }
  return { score: 'wrong', missingModifiers };
}
