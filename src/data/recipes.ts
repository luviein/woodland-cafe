import type { IngredientId } from './ingredients';

// A recipe only appears in orders once the player owns every ingredient it
// uses; that rule lives in logic/orders.ts, so there's no "locked" flag here.
//
// Modifiers (toasted, grilled...) are NOT baked into recipes. There is no
// "Toasted Jam Bread": an order is a recipe plus modifiers (see modifiers.ts).

/** Labels that modifiers can target, e.g. the Sandwich Press -> 'sandwich'. */
export type RecipeTag = 'sandwich';

export interface RecipeDef {
  name: string;
  /**
   * Layers from the BOTTOM of the plate to the TOP. Order matters for
   * scoring: a Jam Sandwich is bread > jam > bread, not bread > bread > jam.
   * Repeats are just listed twice (Extra Jammy Bread has two jam layers).
   */
  layers: readonly IngredientId[];
  tags: readonly RecipeTag[];
}

export const RECIPES = {
  // Starter recipes
  plainBread: { name: 'Plain Bread', layers: ['bread'], tags: [] },
  jamBread: { name: 'Jam Bread', layers: ['bread', 'jam'], tags: [] },
  extraJammyBread: { name: 'Extra Jammy Bread', layers: ['bread', 'jam', 'jam'], tags: [] },
  mushroomBread: { name: 'Mushroom Bread', layers: ['bread', 'mushroom'], tags: [] },
  doubleMushroomBread: {
    name: 'Double Mushroom Bread',
    layers: ['bread', 'mushroom', 'mushroom'],
    tags: [],
  },
  mushroomSandwich: {
    name: 'Mushroom Sandwich',
    layers: ['bread', 'mushroom', 'bread'],
    tags: ['sandwich'],
  },
  jamSandwich: { name: 'Jam Sandwich', layers: ['bread', 'jam', 'bread'], tags: ['sandwich'] },

  // Unlocked by purchasable ingredients
  tomatoBread: { name: 'Tomato Bread', layers: ['bread', 'tomato'], tags: [] },
  tunaSandwich: { name: 'Tuna Sandwich', layers: ['bread', 'tuna', 'bread'], tags: ['sandwich'] },
  tunaTomatoSandwich: {
    name: 'Tuna Tomato Sandwich',
    layers: ['bread', 'tuna', 'tomato', 'bread'],
    tags: ['sandwich'],
  },
  spicyTunaBread: { name: 'Spicy Tuna Bread', layers: ['bread', 'tuna', 'chilli'], tags: [] },
  spicyMushroomBread: {
    name: 'Spicy Mushroom Bread',
    layers: ['bread', 'mushroom', 'chilli'],
    tags: [],
  },
} satisfies Record<string, RecipeDef>;

export type RecipeId = keyof typeof RECIPES;

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];
