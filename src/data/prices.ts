import type { RecipeId } from './recipes';

// What each dish costs, in Leaves, before any tip. PLACEHOLDER values: more
// layers cost more (1 layer = 2, 2 = 3, 3 = 4, 4 = 5); tune once the shop
// (milestone 6) gives Leaves something to buy.
//
// Kept apart from recipes.ts because prices are economy tuning, not what a
// dish is. Record<RecipeId, number> makes the compiler refuse to build if a
// recipe has no price.
export const RECIPE_PRICES: Record<RecipeId, number> = {
  plainBread: 2,
  jamBread: 3,
  extraJammyBread: 4,
  mushroomBread: 3,
  doubleMushroomBread: 4,
  mushroomSandwich: 4,
  jamSandwich: 4,
  tomatoBread: 3,
  tunaSandwich: 4,
  tunaTomatoSandwich: 5,
  spicyTunaBread: 4,
  spicyMushroomBread: 4,
};
