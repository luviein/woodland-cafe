import type { IngredientId } from './ingredients';
import type { RecipeTag } from './recipes';
import type { UpgradeId } from './upgrades';

// Modifiers are extra requests on top of a recipe ("...toasted, please").
// Each is unlocked by owning an upgrade, and only applies to some recipes.
//
// Which recipes a modifier applies to is a RULE, not a hard-coded list of
// recipe ids. That way a new recipe automatically gets the right modifiers
// (a new tuna recipe can be grilled without editing this file).
export type RecipeFilter =
  | { kind: 'any' }
  /** Recipe contains at least one of these ingredients. */
  | { kind: 'hasIngredient'; ingredients: readonly IngredientId[] }
  | { kind: 'hasTag'; tag: RecipeTag };

export interface ModifierDef {
  /** Short label shown on the order ticket. */
  name: string;
  unlockedBy: UpgradeId;
  appliesTo: RecipeFilter;
}

export const MODIFIERS = {
  // Every recipe has bread, so "bread recipes" = recipes containing bread.
  toasted: {
    name: 'Toasted',
    unlockedBy: 'toaster',
    appliesTo: { kind: 'hasIngredient', ingredients: ['bread'] },
  },
  buttered: { name: 'Buttered', unlockedBy: 'butterChurn', appliesTo: { kind: 'any' } },
  cutInHalf: { name: 'Cut in half', unlockedBy: 'cuttingBoard', appliesTo: { kind: 'any' } },
  grilled: {
    name: 'Grilled',
    unlockedBy: 'grillPan',
    appliesTo: { kind: 'hasIngredient', ingredients: ['mushroom', 'tomato', 'tuna'] },
  },
  pressed: {
    name: 'Pressed',
    unlockedBy: 'sandwichPress',
    appliesTo: { kind: 'hasTag', tag: 'sandwich' },
  },
  seasoned: { name: 'Seasoned', unlockedBy: 'seasoningShaker', appliesTo: { kind: 'any' } },
  toGo: { name: 'To go', unlockedBy: 'wrappingPaper', appliesTo: { kind: 'any' } },
} satisfies Record<string, ModifierDef>;

export type ModifierId = keyof typeof MODIFIERS;

export const MODIFIER_IDS = Object.keys(MODIFIERS) as ModifierId[];
