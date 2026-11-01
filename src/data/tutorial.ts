import type { RecipeId } from './recipes';

// The tutorial's words and settings (GAME_DESIGN.md §5.9). Grandma Badger
// says each step's lines in order; edit them here, no code changes needed.
// The order of the steps and what finishes each one live in
// logic/tutorial.ts.

export const TUTORIAL_STEPS = ['intro', 'takeOrder', 'prep', 'clean', 'freePlay', 'summary', 'map'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export interface TutorialStepDef {
  lines: readonly string[];
  /**
   * 'next': the player reads the lines and presses Next.
   * 'action': the last line stays up until the player does the thing.
   */
  waitsFor: 'next' | 'action';
}

export const TUTORIAL: Record<TutorialStep, TutorialStepDef> = {
  intro: {
    waitsFor: 'next',
    lines: [
      "Oh, you made it! Welcome to Woodland Island, dear. I'm Grandma Badger.",
      "I've run this little cafe for forty years. Now it's time for these old paws to rest.",
      "Here are the keys, and 30 of each ingredient from my pantry: bread, mushrooms and jam.",
      "I'll stay for your first morning and show you the ropes.",
    ],
  },
  takeOrder: {
    waitsFor: 'action',
    lines: ['Here comes your very first customer! Tap them at the counter to take their order.'],
  },
  prep: {
    waitsFor: 'action',
    lines: [
      'This is the prep station. Their order is in the speech bubble.',
      'Not sure what goes in a dish? The Recipe Book has every recipe.',
      'Tap the bins to stack the layers, bottom first, then press Serve.',
    ],
  },
  clean: {
    waitsFor: 'action',
    lines: ['Lovely! Customers leave a mess when they finish eating. Tap that table to wipe it clean.'],
  },
  freePlay: {
    waitsFor: 'next',
    lines: [
      "That's all there is to it! Customers will keep coming until closing time.",
      'Keep them happy and quick, and they tip in Leaves. Off you go, dear!',
    ],
  },
  summary: {
    waitsFor: 'action',
    lines: ['Well done! At the end of each day you see what you earned and what you used. Tap Exit cafe when you\'re ready.'],
  },
  map: {
    waitsFor: 'next',
    lines: [
      "This is Woodland Island. Tap a signpost to go somewhere.",
      'Those 30 of each won\'t last forever: buy more stock at the Marketplace.',
      'In the Forest you can pick up Leaves and gather mushrooms and berries.',
      "The cafe's yours now, dear. I'll pop in for a cup now and then!",
    ],
  },
};

/** What the guided first customer always orders: simple, with starter ingredients only. */
export const TUTORIAL_RECIPE: RecipeId = 'jamBread';
