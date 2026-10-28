import type { IngredientId } from '../data/ingredients';

/** Each ingredient once, in first-seen order: ['bread', 'jam', 'bread'] -> ['bread', 'jam']. */
export function uniqueIngredients(layers: readonly IngredientId[]): IngredientId[] {
  return [...new Set(layers)];
}
