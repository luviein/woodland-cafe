import type { Score } from '../logic/types';
import type { IngredientId } from './ingredients';
import type { ModifierId } from './modifiers';
import type { RecipeId } from './recipes';

// What customers might say. Two styles:
//   direct: names the thing outright      -> "One jam bread, please!"
//   hint:   describes it, player decodes  -> "Something sweet on soft bread, please."
// A speech bubble is assembled from these lines when an order is generated
// (logic/dialogue.ts). ORDER_CONFIG.hintRatio decides how often hints are used.
//
// The Record<RecipeId, ...> types mean the compiler refuses to build if any
// recipe, ingredient or modifier is missing its dialogue entry.
//
// Milestone 1 only uses direct recipe lines. Hint lines get filled out in
// milestone 6, so some hint lists are still empty.

export interface DialogueLines {
  direct: readonly string[];
  hint: readonly string[];
}

export const RECIPE_LINES: Record<RecipeId, DialogueLines> = {
  plainBread: {
    direct: ['Just plain bread, please.', 'One plain bread, thank you!', 'Plain bread for me. Nothing fancy.'],
    hint: ['Just bread. I like to keep things simple.'],
  },
  jamBread: {
    direct: ['One jam bread, please!', 'Jam bread, please!', "I'd love a jam bread."],
    hint: ['Something sweet on soft bread, please.'],
  },
  extraJammyBread: {
    direct: ['Extra jammy bread, please!', 'One extra jammy bread. Lots of jam!', 'Extra jammy bread, if you please.'],
    hint: ['Bread, and jam... and then more jam!'],
  },
  mushroomBread: {
    direct: ['One mushroom bread, please.', 'Mushroom bread, please!', "I'll have the mushroom bread."],
    hint: ['Something from the forest floor, on bread.'],
  },
  doubleMushroomBread: {
    direct: ['Double mushroom bread, please!', 'One double mushroom bread.', 'Double mushroom bread for me!'],
    hint: [],
  },
  mushroomSandwich: {
    direct: ['A mushroom sandwich, please.', 'One mushroom sandwich!', 'Mushroom sandwich, thank you.'],
    hint: [],
  },
  jamSandwich: {
    direct: ['A jam sandwich, please!', 'One jam sandwich, thank you!', 'Jam sandwich, please. My favourite!'],
    hint: [],
  },
  // Placeholders: unlocked by purchasable ingredients (milestone 6)
  tomatoBread: { direct: ['One tomato bread, please.'], hint: [] },
  tunaSandwich: { direct: ['A tuna sandwich, please!'], hint: [] },
  tunaTomatoSandwich: { direct: ['A tuna tomato sandwich, please.'], hint: [] },
  spicyTunaBread: { direct: ['One spicy tuna bread, please!'], hint: [] },
  spicyMushroomBread: { direct: ['Spicy mushroom bread, please!'], hint: [] },
};

export const INGREDIENT_LINES: Record<IngredientId, DialogueLines> = {
  bread: { direct: ['On bread, please.'], hint: ['Something soft and fresh from the oven.'] },
  mushroom: { direct: ['With mushroom, please.'], hint: ['Something earthy from under the trees.'] },
  jam: { direct: ['With jam, please.'], hint: ['Something sweet and sticky.'] },
  // Placeholders (milestone 6)
  chilli: { direct: ['Make it spicy! I want my ears to go pink.'], hint: ['Give it a kick!'] },
  tuna: { direct: ['With tuna, please.'], hint: [] },
  tomato: { direct: ['With tomato, please.'], hint: [] },
};

/**
 * What the customer says after being served. This is the player's only
 * feedback (there's no result pop-up), so each mood should be easy to read.
 */
export const REACTION_LINES: Record<Score, readonly string[]> = {
  // Happy
  perfect: [
    "Oh, it's perfect! Thank you!",
    'Just how I like it!',
    'Mmm! My tail is wagging already.',
    'You must be the best cook in the woods!',
  ],
  // Indifferent
  close: [
    "Hmm... it'll do, I suppose.",
    'Not quite what I asked for, but okay.',
    'Close enough. I guess.',
    "Well... I'll eat it.",
  ],
  // Angry
  wrong: [
    "This isn't what I ordered!",
    'Hmph! My whiskers are twitching.',
    'What is this?! I asked for something else!',
    "I'm not paying for this!",
  ],
};

/** Said before the order when it's a double order (Serving Tray). Placeholder (milestone 6). */
export const DOUBLE_ORDER_LINES: DialogueLines = {
  direct: ['Two of these, please!', 'Make that two, please!'],
  hint: [],
};

export const MODIFIER_LINES: Record<ModifierId, DialogueLines> = {
  toasted: {
    direct: ['Make it toasty, please! My paws are freezing.', 'Toasted, please!'],
    hint: ['I like my bread with a bit of crunch.'],
  },
  // Placeholders (milestone 6)
  buttered: { direct: ['Buttered, please.'], hint: [] },
  cutInHalf: { direct: ['Could you cut it in half?'], hint: [] },
  grilled: { direct: ['Grilled, please.'], hint: [] },
  pressed: { direct: ['Pressed, please.'], hint: [] },
  seasoned: { direct: ['Seasoned, please.'], hint: [] },
  toGo: { direct: ["It's to go, please."], hint: [] },
};
