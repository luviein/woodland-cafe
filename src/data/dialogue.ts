import type { Score } from '../logic/types';
import type { ModifierId } from './modifiers';
import type { RecipeId } from './recipes';

// What customers might say. Two styles:
//   direct: names the thing outright      -> "One jam bread, please!"
//   hint:   describes it, player decodes  -> "Something sweet on soft bread, please."
// A speech bubble is assembled from these lines when an order is generated
// (logic/dialogue.ts). How often hints are used grows day by day (hintConfig.ts).
//
// The Record<RecipeId, ...> types mean the compiler refuses to build if any
// recipe or modifier is missing its dialogue entry.
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
export const RECIPE_LINES: Record<RecipeId, DialogueLines> = {
  plainBread: {
    direct: ['Just plain bread, please.', 'One plain bread, thank you!', 'Plain bread for me. Nothing fancy.'],
    hint: [
      'Just bread. I like to keep things simple.',
      'A slice of bread, with nothing on it at all.',
      'Something soft and fresh from the oven. Nothing else!',
    ],
  },
  jamBread: {
    direct: ['One jam bread, please!', 'Jam bread, please!', "I'd love a jam bread."],
    hint: [
      'Something sweet on soft bread, please.',
      'A slice with something sticky and berry-sweet on top.',
      'Bread with a smear of something sweet, please.',
    ],
  },
  extraJammyBread: {
    direct: ['Extra jammy bread, please!', 'One extra jammy bread. Lots of jam!', 'Extra jammy bread, if you please.'],
    hint: [
      'Bread, and jam... and then more jam!',
      'A slice with twice the sweet, sticky stuff!',
      'Something sweet on bread. No, sweeter. Double it!',
    ],
  },
  mushroomBread: {
    direct: ['One mushroom bread, please.', 'Mushroom bread, please!', "I'll have the mushroom bread."],
    hint: [
      'Something from the forest floor, on bread.',
      'A slice with something earthy on top, please.',
      'Something from under the trees, on a slice.',
    ],
  },
  doubleMushroomBread: {
    direct: ['Double mushroom bread, please!', 'One double mushroom bread.', 'Double mushroom bread for me!'],
    hint: [
      'Forest-floor finds on a slice. Twice as many!',
      'Something earthy on bread... and then more of it!',
      'Double the forest floor on my slice, please.',
    ],
  },
  mushroomSandwich: {
    direct: ['A mushroom sandwich, please.', 'One mushroom sandwich!', 'Mushroom sandwich, thank you.'],
    hint: [
      'Forest finds, tucked between two slices.',
      'Something earthy, tucked inside bread.',
      'Two slices hugging something from under the trees.',
    ],
  },
  jamSandwich: {
    direct: ['A jam sandwich, please!', 'One jam sandwich, thank you!', 'Jam sandwich, please. My favourite!'],
    hint: [
      'Something sweet and sticky, between two slices.',
      'Something berry-sweet, tucked inside bread, please.',
      'Two slices with something sticky in the middle.',
    ],
  },
  tomatoBread: {
    direct: ['One tomato bread, please.', 'Tomato bread, please!', "I'll have the tomato bread."],
    hint: [
      'Something round and red from the garden, on a slice.',
      'A slice with something juicy and red on top.',
    ],
  },
  tunaSandwich: {
    direct: ['A tuna sandwich, please!', 'One tuna sandwich, thank you.', 'Tuna sandwich for me!'],
    hint: [
      'Something from the river, between two slices.',
      'Two slices with something fishy tucked inside.',
    ],
  },
  tunaTomatoSandwich: {
    direct: ['A tuna tomato sandwich, please.', 'One tuna and tomato sandwich!', 'Tuna tomato sandwich, please.'],
    hint: [
      'Something from the river AND something red from the garden, between two slices.',
      'Two slices with fish and something juicy and red tucked inside.',
    ],
  },
  spicyTunaBread: {
    direct: ['One spicy tuna bread, please!', 'Spicy tuna bread, please.', "I'll have the spicy tuna bread."],
    hint: [
      'Something from the river on a slice. And make it fiery!',
      'Fishy and spicy, on bread. I want my ears to go pink!',
    ],
  },
  spicyMushroomBread: {
    direct: ['Spicy mushroom bread, please!', 'One spicy mushroom bread.', 'Spicy mushroom bread for me!'],
    hint: [
      'Something earthy on a slice, with a fiery kick!',
      'Forest-floor finds on bread. Make it spicy!',
    ],
  },
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

/**
 * Said when a customer runs out of patience while their order is still being
 * made: the prep station closes on this line.
 */
export const GAVE_UP_LINES: readonly string[] = [
  "I can't wait any longer! I'm off.",
  'Too slow! Never mind, then.',
  "Forget it, I'll find breakfast elsewhere!",
];

/** Said before the order when it's a double order (Serving Tray). Placeholder (milestone 6). */
export const DOUBLE_ORDER_LINES: DialogueLines = {
  direct: ['Two of these, please!', 'Make that two, please!'],
  hint: [],
};

export const MODIFIER_LINES: Record<ModifierId, DialogueLines> = {
  toasted: {
    direct: ['Make it toasty, please! My paws are freezing.', 'Toasted, please!', 'Could you toast it?'],
    hint: [
      'I like my bread with a bit of crunch.',
      'Could it be warm and golden, please?',
      'My paws are cold. Something warm and crunchy!',
    ],
  },
  // Placeholders (milestone 6)
  buttered: { direct: ['Buttered, please.'], hint: [] },
  cutInHalf: { direct: ['Could you cut it in half?'], hint: [] },
  grilled: { direct: ['Grilled, please.'], hint: [] },
  pressed: { direct: ['Pressed, please.'], hint: [] },
  seasoned: { direct: ['Seasoned, please.'], hint: [] },
  toGo: { direct: ["It's to go, please."], hint: [] },
};
