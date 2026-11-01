import type { LocationId } from './locations';
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
  /** On the map: whose signpost the arrow points at on each line (null: none). */
  pointsAt?: readonly (LocationId | null)[];
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
      "Listen for little extras too, like 'toasted'. Get those right and they tip more!",
      'Not sure what goes in a dish? The Recipe Book has every recipe.',
      'Jam Bread: bread first, then jam. Tap the bins in that order, then Serve.',
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
    pointsAt: [null, 'cafe', 'marketplace', 'marketplace', 'forest', null],
    lines: [
      'This is Woodland Island, dear. Tap a signpost to go somewhere.',
      'The Cafe: tap it to open for the next day, or choose Decorate to arrange your tables and chairs.',
      'The Marketplace: stock at the Pantry, new ingredients at Specialty, equipment at Tools, furniture at the Carpenter, staff at the Notice Board.',
      "Those 30 of each won't last forever, so stock up at the Pantry before you run out!",
      'The Forest: pick up Leaves and gather mushrooms and berries. They grow back every day.',
      "The cafe's yours now. I'll pop in for a cup now and then! (Tap ? any time to read my notes.)",
    ],
  },
};

/**
 * One-off tips: Grandma explains a part of the game the first time the
 * player opens it, then never again (GAME_DESIGN.md §5.9).
 */
export const TIP_IDS = ['decorate'] as const;
export type TipId = (typeof TIP_IDS)[number];

export const TIPS: Record<TipId, TutorialStepDef> = {
  decorate: {
    waitsFor: 'next',
    lines: [
      "Decorating! Arrange the cafe however you like, dear. Moving things around is free.",
      'Storage holds pieces you bought or put away. Tap one, then tap the floor, or drag it straight in.',
      'Tap a piece in the cafe for its menu: Move it somewhere else, or Put it away. Or just drag it.',
      "A chair can only be at one table, and the way to the door must stay clear. If a spot won't do, I'll say why.",
    ],
  },
};

/** A topic in Grandma's notes: what she explained, to read again any time. */
export interface NoteTopic {
  title: string;
  lines: readonly string[];
}

/** Grandma's notes, behind the ? button (GAME_DESIGN.md §5.9). Mostly her own tutorial lines. */
export const NOTES: readonly NoteTopic[] = [
  {
    title: 'Orders',
    lines: [
      'Tap a customer waiting at the counter to take their order.',
      "No clean seat free? They can't order until you wipe a table.",
      'Their patience only starts running down once you take the order.',
    ],
  },
  {
    title: 'Prep station',
    lines: [
      ...TUTORIAL.prep.lines.slice(0, 3),
      'Tap the bins to stack the layers, bottom first, then Serve. A wrong layer? Press Reset.',
    ],
  },
  {
    title: 'Cleaning',
    lines: [
      'Customers leave a mess when they finish eating. Tap the table to wipe it clean.',
      'Hire a Cleaner at the Notice Board and they will wipe tables for you.',
    ],
  },
  { title: 'The day', lines: [...TUTORIAL.freePlay.lines, 'At the end of each day you see what you earned and what you used.'] },
  { title: 'The island', lines: TUTORIAL.map.lines.slice(1, 5) },
  { title: 'Decorating', lines: TIPS.decorate.lines },
];

/** What the guided first customer always orders: simple, with starter ingredients only. */
export const TUTORIAL_RECIPE: RecipeId = 'jamBread';
