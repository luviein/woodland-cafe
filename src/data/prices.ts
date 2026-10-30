import type { RecipeId } from './recipes';

// What each dish costs, in Leaves, before any tip. PLACEHOLDER values, set
// by one rule (GAME_DESIGN.md §3.6):
//
//   price = 2 x (unit prices of its layers) + 2
//
// e.g. Jam Bread = bread 1 + jam 1 = 2, so 2 x 2 + 2 = 6. That way a right
// dish always earns something, even when every layer was rush-bought at 2x.
// data.test.ts checks that guarantee, so a hand-tuned price can't break it.
//
// Kept apart from recipes.ts because prices are economy tuning, not what a
// dish is. Record<RecipeId, number> makes the compiler refuse to build if a
// recipe has no price.
export const RECIPE_PRICES: Record<RecipeId, number> = {
  plainBread: 4,
  jamBread: 6,
  extraJammyBread: 8,
  mushroomBread: 6,
  doubleMushroomBread: 8,
  mushroomSandwich: 8,
  jamSandwich: 8,
  tomatoBread: 8,
  tunaSandwich: 12,
  tunaTomatoSandwich: 16,
  spicyTunaBread: 14,
  spicyMushroomBread: 10,
};
