import { TUTORIAL_RECIPE, TUTORIAL_STEPS, type TutorialStep } from '../data/tutorial';
import type { FloorGuide } from './floor';
import type { Order } from './types';

// The tutorial's rules (GAME_DESIGN.md §5.9): which step comes after which,
// and what finishes each. Plain functions over plain data, like the rest of
// the game rules; the words are in data/tutorial.ts.

/** Where the player is in the tutorial; 'done' once finished or skipped. */
export type TutorialState = TutorialStep | 'done';

/** Things that happen in the game that a step may be waiting for. */
export type TutorialEvent =
  | 'next' // Next pressed on the step's last line
  | 'orderTaken'
  | 'served'
  | 'wiped'
  | 'exitCafe'
  | 'skip';

/** What finishes each step. (freePlay's Next leads to waiting for the day's summary.) */
const FINISHED_BY: Record<TutorialStep, TutorialEvent> = {
  intro: 'next',
  takeOrder: 'orderTaken',
  prep: 'served',
  clean: 'wiped',
  freePlay: 'next',
  summary: 'exitCafe',
  map: 'next',
};

/** The tutorial after `event`: on to the next step if it finishes this one, else unchanged. */
export function advanceTutorial(state: TutorialState, event: TutorialEvent): TutorialState {
  if (state === 'done') return 'done';
  if (event === 'skip') return 'done';
  if (FINISHED_BY[state] !== event) return state;
  const next = TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(state) + 1];
  return next ?? 'done';
}

/**
 * The guided start of Day 1 (intro to clean): the clock is paused and only
 * the one tutorial customer comes, with endless patience.
 */
export function isGuidedStart(state: TutorialState): boolean {
  return state === 'intro' || state === 'takeOrder' || state === 'prep' || state === 'clean';
}

/** How the floor runs during a tutorial step: held during the intro, one customer until the first wipe. */
export function floorGuide(state: TutorialState): FloorGuide {
  if (state === 'intro') return 'hold';
  return isGuidedStart(state) ? 'one' : null;
}

/** The guided customer's order: always the same simple dish, no modifiers. */
export function tutorialOrder(): Order {
  return { recipeId: TUTORIAL_RECIPE, modifiers: [], quantity: 1 };
}

export function isTutorialState(value: unknown): value is TutorialState {
  return value === 'done' || TUTORIAL_STEPS.includes(value as TutorialStep);
}
