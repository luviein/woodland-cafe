import type { IngredientCounts, IngredientId } from '../data/ingredients';

/**
 * The prep scene stores the dish as a list in the order items were added
 * (so it can draw them stacked in that order). Scoring wants counts, so this
 * converts ['bread', 'jam', 'bread'] -> { bread: 2, jam: 1 }.
 */
export function toCounts(items: readonly IngredientId[]): IngredientCounts {
  const counts: IngredientCounts = {};
  for (const id of items) {
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
