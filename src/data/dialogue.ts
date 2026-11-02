import type { IngredientId } from './ingredients';
import CUSTOMERS from './texts/customers.json';
import type { Score } from '../logic/types';
import type { ModifierId } from './modifiers';
import type { RecipeId } from './recipes';

// What customers might say (their WORDS are in texts/customers.json, edited
// with the text editor: npm run dev, then /editor.html, GAME_DESIGN.md §9.1).
// Two styles:
//   direct: names the thing outright      -> "One jam bread, please!"
//   hint:   describes it, player decodes  -> "Something sweet on soft bread, please."
// A speech bubble is assembled from these lines when an order is generated
// (logic/dialogue.ts). How often hints are used grows day by day (hintConfig.ts).
//
// The Record<RecipeId, ...> types below mean the compiler refuses to build if
// any recipe or modifier is missing from the JSON.
//
// Every recipe has hint lines (a data test checks), and so does every
// modifier that can be ordered so far; the rest are placeholders until their
// upgrade is built.

export interface DialogueLines {
  direct: readonly string[];
  hint: readonly string[];
}

// Hints use the same clue words every time, so players can learn them
// (GAME_DESIGN.md §3.5):
//   jam:      sweet, sticky, berry          mushroom: earthy, forest floor, under the trees
//   tuna:     from the river, fishy         tomato:   round and red, juicy, from the garden
//   chilli:   spicy, fiery, a kick
//   open bread: "on a slice" / "on bread"   sandwich: "between two slices", "tucked inside"
//   a doubled layer: "twice", "more of it", "double"
// Each hint must fit exactly one recipe.
export const EXTRA_INGREDIENT_LINES: Record<Exclude<IngredientId, 'bread'>, DialogueLines> = CUSTOMERS.extraIngredients;

export const RECIPE_LINES: Record<RecipeId, DialogueLines> = CUSTOMERS.recipes;

/**
 * What the customer says after being served. This is the player's only
 * feedback (there's no result pop-up), so each mood should be easy to read:
 * happy (perfect), indifferent (close), angry (wrong).
 */
export const REACTION_LINES: Record<Score, readonly string[]> = CUSTOMERS.reactions;

/**
 * Said when a customer runs out of patience while their order is still being
 * made: the prep station closes on this line.
 */
export const GAVE_UP_LINES: readonly string[] = CUSTOMERS.gaveUp;

/** Said before the order when it's a double order (Serving Tray). */
export const DOUBLE_ORDER_LINES: DialogueLines = CUSTOMERS.doubleOrder;

export const MODIFIER_LINES: Record<ModifierId, DialogueLines> = CUSTOMERS.modifiers;
