import GRANDMA from './texts/grandma.json';
import type { RecipeId } from './recipes';
import { TIP_IDS, TUTORIAL_STEPS, WAITS_FOR, waitingLine, type WaitsFor, type TextLine, type TipId, type TutorialStep } from './texts/rules';

// The tutorial's settings (GAME_DESIGN.md §5.9). Grandma Badger's WORDS are in
// texts/grandma.json, edited with the text editor (npm run dev, then
// /editor.html, GAME_DESIGN.md §9.1); this file says how each step behaves.
// The steps, tips and arrow targets are in texts/rules.ts; the order of the
// steps and what finishes each one live in logic/tutorial.ts.

export { TIP_IDS, TUTORIAL_STEPS, ARROW_TARGETS, type TipId, type TutorialStep, type TextLine } from './texts/rules';

export interface TutorialStepDef {
  lines: readonly string[];
  /**
   * 'next': the player reads the lines and presses Next.
   * 'action': the last line stays up until the player does the thing.
   */
  waitsFor: WaitsFor;
  /** The line shown without Next until the player acts (null: every line has Next). Lines after it show once they have. */
  waitsAt: number | null;
  /** What the arrow points at on each line (null: nothing); one of ARROW_TARGETS. */
  pointsAt: readonly (string | null)[];
}


function stepDef(key: TutorialStep | TipId, lines: readonly TextLine[]): TutorialStepDef {
  const waits = waitingLine(key, lines);
  return {
    waitsFor: WAITS_FOR[key],
    waitsAt: waits >= 0 ? waits : null,
    lines: lines.map((l) => l.text),
    pointsAt: lines.map((l) => l.arrow ?? null),
  };
}

// The JSON's keys are checked here: a step or tip missing from it is a compile error.
const TUTORIAL_TEXT: Record<TutorialStep, readonly TextLine[]> = GRANDMA.tutorial;
const TIP_TEXT: Record<TipId, readonly TextLine[]> = GRANDMA.tips;

export const TUTORIAL = Object.fromEntries(
  TUTORIAL_STEPS.map((step) => [step, stepDef(step, TUTORIAL_TEXT[step])]),
) as Record<TutorialStep, TutorialStepDef>;

export const TIPS = Object.fromEntries(TIP_IDS.map((tip) => [tip, stepDef(tip, TIP_TEXT[tip])])) as Record<
  TipId,
  TutorialStepDef
>;

/** A topic in Grandma's notes: what she explained, to read again any time. */
export interface NoteTopic {
  title: string;
  lines: readonly string[];
}

/** Grandma's notes, behind the ? button (GAME_DESIGN.md §5.9). */
export const NOTES: readonly NoteTopic[] = GRANDMA.notes;

/** What the guided first customer always orders: simple, with starter ingredients only. */
export const TUTORIAL_RECIPE: RecipeId = 'jamBread';
