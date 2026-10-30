// Every ingredient in the game. Adding one here is all it takes for recipes,
// dialogue and the prep bins to be able to use it.
//
// Why `satisfies` instead of a type annotation: it checks each entry matches
// IngredientDef, but keeps the exact keys ('bread', 'jam', ...), so we can
// derive the IngredientId type from them. A typo like 'braed' in a recipe then
// fails to compile instead of failing at runtime.

export interface IngredientDef {
  name: string;
  /** Placeholder colour until real art (milestone 10). */
  color: number;
  /** Owned from the very first day. */
  starter: boolean;
  /**
   * One-time Marketplace price in Leaves to start using it (its recipes then
   * appear in orders); null = starter, never sold. Placeholder until milestone 6.
   */
  unlockPrice: number | null;
  /**
   * Price of ONE unit of stock, in Leaves (GAME_DESIGN.md §3.6). Rush
   * deliveries cost a multiple of it (stockConfig.ts), and dish prices are
   * set to cover it.
   */
  unitPrice: number;
  /** Stock on a new game. */
  startingStock: number;
}

export const INGREDIENTS = {
  bread: { name: 'Bread', color: 0xd9a25f, starter: true, unlockPrice: null, unitPrice: 1, startingStock: 12 },
  mushroom: { name: 'Mushroom', color: 0xa68a7b, starter: true, unlockPrice: null, unitPrice: 1, startingStock: 6 },
  jam: { name: 'Jam', color: 0xb5384f, starter: true, unlockPrice: null, unitPrice: 1, startingStock: 6 },
  chilli: { name: 'Chilli', color: 0xe0502f, starter: false, unlockPrice: 15, unitPrice: 2, startingStock: 0 },
  tuna: { name: 'Tuna', color: 0x7f9bb3, starter: false, unlockPrice: 20, unitPrice: 3, startingStock: 0 },
  tomato: { name: 'Tomato', color: 0xd94a3a, starter: false, unlockPrice: 10, unitPrice: 2, startingStock: 0 },
} satisfies Record<string, IngredientDef>;

export type IngredientId = keyof typeof INGREDIENTS;

// Object.keys() is typed as string[] (TS can't prove an object has no extra
// keys at runtime), so we cast back to our known ids.
export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

export const STARTER_INGREDIENTS = INGREDIENT_IDS.filter((id) => INGREDIENTS[id].starter);
