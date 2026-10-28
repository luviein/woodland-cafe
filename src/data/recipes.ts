import type { IngredientCounts } from './ingredients';

// A recipe only appears in orders once the player owns every ingredient it
// uses; that rule lives in logic/orders.ts, so there's no "locked" flag here.
//
// Modifiers (toasted, grilled...) are NOT baked into recipes. There is no
// "Toasted Jam Bread": an order is a recipe plus modifiers (see modifiers.ts).

/** Labels that modifiers can target, e.g. the Sandwich Press -> 'sandwich'. */
export type RecipeTag = 'sandwich';

export interface RecipeDef {
  name: string;
  ingredients: IngredientCounts;
  tags: readonly RecipeTag[];
}

export const RECIPES = {
  // Starter recipes
  plainBread: { name: 'Plain Bread', ingredients: { bread: 1 }, tags: [] },
  jamBread: { name: 'Jam Bread', ingredients: { bread: 1, jam: 1 }, tags: [] },
  extraJammyBread: { name: 'Extra Jammy Bread', ingredients: { bread: 1, jam: 2 }, tags: [] },
  mushroomBread: { name: 'Mushroom Bread', ingredients: { bread: 1, mushroom: 1 }, tags: [] },
  doubleMushroomBread: {
    name: 'Double Mushroom Bread',
    ingredients: { bread: 1, mushroom: 2 },
    tags: [],
  },
  mushroomSandwich: {
    name: 'Mushroom Sandwich',
    ingredients: { bread: 2, mushroom: 1 },
    tags: ['sandwich'],
  },
  jamSandwich: { name: 'Jam Sandwich', ingredients: { bread: 2, jam: 1 }, tags: ['sandwich'] },

  // Unlocked by purchasable ingredients
  tomatoBread: { name: 'Tomato Bread', ingredients: { bread: 1, tomato: 1 }, tags: [] },
  tunaSandwich: { name: 'Tuna Sandwich', ingredients: { bread: 2, tuna: 1 }, tags: ['sandwich'] },
  tunaTomatoSandwich: {
    name: 'Tuna Tomato Sandwich',
    ingredients: { bread: 2, tuna: 1, tomato: 1 },
    tags: ['sandwich'],
  },
  spicyTunaBread: {
    name: 'Spicy Tuna Bread',
    ingredients: { bread: 1, tuna: 1, chilli: 1 },
    tags: [],
  },
  spicyMushroomBread: {
    name: 'Spicy Mushroom Bread',
    ingredients: { bread: 1, mushroom: 1, chilli: 1 },
    tags: [],
  },
} satisfies Record<string, RecipeDef>;

export type RecipeId = keyof typeof RECIPES;

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];
