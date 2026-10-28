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
  /** Marketplace price in Leaves; null = not sold. Placeholder until milestone 6. */
  price: number | null;
}

export const INGREDIENTS = {
  bread: { name: 'Bread', color: 0xd9a25f, starter: true, price: null },
  mushroom: { name: 'Mushroom', color: 0xa68a7b, starter: true, price: null },
  jam: { name: 'Jam', color: 0xb5384f, starter: true, price: null },
  chilli: { name: 'Chilli', color: 0xe0502f, starter: false, price: 15 },
  tuna: { name: 'Tuna', color: 0x7f9bb3, starter: false, price: 20 },
  tomato: { name: 'Tomato', color: 0xd94a3a, starter: false, price: 10 },
} satisfies Record<string, IngredientDef>;

export type IngredientId = keyof typeof INGREDIENTS;

// Object.keys() is typed as string[] (TS can't prove an object has no extra
// keys at runtime), so we cast back to our known ids.
export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

export const STARTER_INGREDIENTS = INGREDIENT_IDS.filter((id) => INGREDIENTS[id].starter);
