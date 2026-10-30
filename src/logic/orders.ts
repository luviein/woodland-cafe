import type { IngredientId } from '../data/ingredients';
import { MODIFIERS, MODIFIER_IDS, type ModifierId, type RecipeFilter } from '../data/modifiers';
import { ORDER_CONFIG, type OrderConfig } from '../data/orderConfig';
import { RECIPES, RECIPE_IDS, type RecipeDef, type RecipeId } from '../data/recipes';
import { UPGRADES, type UpgradeDef, type UpgradeId } from '../data/upgrades';
import { pickOne, shuffled, type Rng } from './random';
import type { Order, Plate } from './types';

/**
 * The parts of player state that decide what can be ordered. A GameState
 * fits this as-is. Passed in rather than read from a global, so these
 * functions stay pure and easy to test.
 */
export interface Owned {
  ingredients: readonly IngredientId[];
  upgrades: readonly UpgradeId[];
}

/** Recipes whose ingredients are all owned. */
export function availableRecipes(owned: Owned): RecipeId[] {
  return RECIPE_IDS.filter((id) =>
    RECIPES[id].layers.every((ing) => owned.ingredients.includes(ing)),
  );
}

export function recipeMatchesFilter(recipe: RecipeDef, filter: RecipeFilter): boolean {
  switch (filter.kind) {
    case 'any':
      return true;
    case 'hasIngredient':
      return recipe.layers.some((ing) => filter.ingredients.includes(ing));
    case 'hasTag':
      return recipe.tags.includes(filter.tag);
  }
}

/** Modifiers that are unlocked (upgrade owned) and fit this recipe. */
export function availableModifiers(recipeId: RecipeId, owned: Owned): ModifierId[] {
  const recipe = RECIPES[recipeId];
  return MODIFIER_IDS.filter((id) => {
    const mod = MODIFIERS[id];
    return owned.upgrades.includes(mod.unlockedBy) && recipeMatchesFilter(recipe, mod.appliesTo);
  });
}

/**
 * Builds a random order: one available recipe, plus some unlocked modifiers,
 * plus maybe a double order. Throws if nothing can be ordered, because that
 * means the data or player state is broken and we want to know immediately.
 */
export function generateOrder(
  owned: Owned,
  rng: Rng = Math.random,
  config: OrderConfig = ORDER_CONFIG,
): Order {
  const recipes = availableRecipes(owned);
  if (recipes.length === 0) {
    throw new Error('generateOrder: no recipe can be made with the owned ingredients');
  }
  const recipeId = pickOne(recipes, rng);

  // Shuffle first so that when maxModifiers cuts the list short, it isn't
  // always the same modifiers (the ones listed first) that win.
  const modifiers: ModifierId[] = [];
  for (const mod of shuffled(availableModifiers(recipeId, owned), rng)) {
    if (modifiers.length >= config.maxModifiers) break;
    if (rng() < config.modifierChance) modifiers.push(mod);
  }

  // Widen to UpgradeDef: only some entries declare allowsDoubleOrders, so the
  // narrow inferred type of a single entry may not have the property at all.
  const canDouble = owned.upgrades.some(
    (id) => (UPGRADES[id] as UpgradeDef).allowsDoubleOrders === true,
  );
  const quantity = canDouble && rng() < config.doubleOrderChance ? 2 : 1;

  return { recipeId, modifiers, quantity };
}

/** What one correct plate for this order looks like, for scoreDish(). */
export function expectedPlate(order: Order): Plate {
  return { layers: RECIPES[order.recipeId].layers, modifiers: order.modifiers };
}
