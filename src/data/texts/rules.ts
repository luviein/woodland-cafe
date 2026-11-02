import { INGREDIENT_IDS } from '../ingredients';
import { MODIFIER_IDS, MODIFIERS } from '../modifiers';
import { RECIPE_IDS } from '../recipes';
import { TOOLS_ON_SALE } from '../shops';

// What the game's words must look like (GAME_DESIGN.md §9.1): the shape of
// texts/grandma.json and texts/customers.json, and the rules a change must
// keep. Shared by the game's tests and the text editor, which refuses to save
// anything these find wrong. No JSON is imported here, so the editor can load
// the rules without reloading itself whenever a text file changes.

export const TUTORIAL_STEPS = [
  'intro',
  'takeOrder',
  'prep',
  'clean',
  'freePlay',
  'summary',
  'map',
  'explore',
  'farewell',
] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/**
 * One-off tips: Grandma explains a part of the game the first time the
 * player opens it, then never again (GAME_DESIGN.md §5.9).
 */
export const TIP_IDS = ['decorate', 'marketplace', 'forest'] as const;
export type TipId = (typeof TIP_IDS)[number];

/**
 * How a step (or tip) ends. 'next': the player reads the lines and presses
 * Next. 'action': it waits for the player to do something; one line (the
 * waiting line, see waitingLine) shows without Next until they do.
 */
export type WaitsFor = 'next' | 'action';

export const WAITS_FOR: Record<TutorialStep | TipId, WaitsFor> = {
  intro: 'next',
  takeOrder: 'action',
  prep: 'action',
  clean: 'action',
  freePlay: 'next',
  summary: 'action',
  map: 'next',
  explore: 'action',
  farewell: 'next',
  decorate: 'next',
  marketplace: 'next',
  forest: 'next',
};

/**
 * What each step's (or tip's) arrow may point at, by name. The scene showing
 * the lines knows where each name is on screen.
 */
export const ARROW_TARGETS: Record<TutorialStep | TipId, readonly string[]> = {
  intro: [],
  takeOrder: ['customer'],
  prep: ['bubble', 'recipes', 'dish'], // 'dish': the next bin to tap, then Serve
  clean: ['mess'],
  freePlay: [],
  summary: ['exit'],
  map: ['cafe', 'forest', 'marketplace'],
  explore: [], // points at whichever place is still to be seen
  farewell: ['notes'],
  decorate: ['tray', 'table'],
  marketplace: ['pantry', 'specialty', 'tools', 'carpenter', 'noticeBoard'],
  forest: ['forage'],
};

/** A line of Grandma's: the words, maybe what her arrow points at, and whether she waits on it. */
export interface TextLine {
  text: string;
  arrow?: string;
  /** The waiting line of an action step: no Next until the player does it. */
  waits?: boolean;
}

/**
 * Action steps whose screen stays put after the action, so lines after the
 * waiting line can be shown then (with Next). Elsewhere the screen changes
 * straight away (prep opens, prep closes, the summary closes...), so the
 * waiting line has to be the last.
 */
export const FOLLOW_UPS_SHOWN: ReadonlySet<TutorialStep | TipId> = new Set(['clean']);

/**
 * Which line an action step waits on: the one marked `waits`, else the last.
 * -1 for a step with nothing to wait for (every line has Next).
 */
export function waitingLine(key: TutorialStep | TipId, lines: readonly TextLine[]): number {
  if (WAITS_FOR[key] !== 'action') return -1;
  const marked = lines.findIndex((l) => l.waits);
  return marked >= 0 ? marked : lines.length - 1;
}

export interface GrandmaTexts {
  tutorial: Record<TutorialStep, TextLine[]>;
  tips: Record<TipId, TextLine[]>;
  notes: { title: string; lines: string[] }[];
}

export interface Lines {
  direct: string[];
  hint: string[];
}

export interface CustomerTexts {
  recipes: Record<string, Lines>;
  modifiers: Record<string, Lines>;
  extraIngredients: Record<string, Lines>;
  doubleOrder: Lines;
  reactions: Record<'perfect' | 'close' | 'wrong', string[]>;
  gaveUp: string[];
}

const blank = (s: unknown) => typeof s !== 'string' || s.trim() === '';

/** Everything wrong with Grandma's texts, as sentences; empty when they're fine. */
export function grandmaProblems(t: GrandmaTexts): string[] {
  const problems: string[] = [];
  const checkLines = (where: string, key: TutorialStep | TipId, lines: TextLine[] | undefined) => {
    if (!lines?.length) return problems.push(`${where}: needs at least one line`);
    lines.forEach((line, i) => {
      if (blank(line.text)) problems.push(`${where}, line ${i + 1}: is empty`);
      if (line.arrow && !ARROW_TARGETS[key].includes(line.arrow)) {
        problems.push(`${where}, line ${i + 1}: the arrow can't point at "${line.arrow}" here`);
      }
      if (line.waits && WAITS_FOR[key] !== 'action') {
        problems.push(`${where}, line ${i + 1}: nothing to wait for in this step, so every line needs Next`);
      }
    });
    if (lines.filter((l) => l.waits).length > 1) problems.push(`${where}: only one line can wait for the player`);
    const waits = waitingLine(key, lines);
    if (waits >= 0 && waits < lines.length - 1 && !FOLLOW_UPS_SHOWN.has(key)) {
      problems.push(`${where}: the screen changes as soon as the player does it, so lines after the waiting line (${waits + 1}) would never be seen; move them above it`);
    }
  };
  for (const step of TUTORIAL_STEPS) checkLines(`Tutorial "${step}"`, step, t.tutorial?.[step]);
  for (const tip of TIP_IDS) checkLines(`Tip "${tip}"`, tip, t.tips?.[tip]);
  if (!t.notes?.length) problems.push("Grandma's notes: need at least one topic");
  t.notes?.forEach((note, i) => {
    const where = `Notes topic ${i + 1}${blank(note.title) ? '' : ` ("${note.title}")`}`;
    if (blank(note.title)) problems.push(`${where}: needs a title`);
    if (!note.lines?.length) problems.push(`${where}: needs at least one line`);
    note.lines?.forEach((line, j) => blank(line) && problems.push(`${where}, line ${j + 1}: is empty`));
  });
  return problems;
}

/** Everything wrong with the customers' texts, as sentences; empty when they're fine. */
export function customerProblems(t: CustomerTexts): string[] {
  const problems: string[] = [];
  const noBlanks = (where: string, lines: string[] | undefined) =>
    lines?.forEach((line, i) => blank(line) && problems.push(`${where}, line ${i + 1}: is empty`));

  for (const id of RECIPE_IDS) {
    const lines = t.recipes?.[id];
    if (!lines?.direct?.length) problems.push(`Order "${id}": needs at least one direct line`);
    if (!lines?.hint?.length) problems.push(`Order "${id}": needs at least one hint line`);
    noBlanks(`Order "${id}" (direct)`, lines?.direct);
    noBlanks(`Order "${id}" (hint)`, lines?.hint);
  }
  for (const id of INGREDIENT_IDS.filter((id) => id !== 'bread')) {
    const lines = t.extraIngredients?.[id];
    if (!lines?.direct?.length) problems.push('Extra ingredient ' + id + ': needs at least one direct line');
    noBlanks('Extra ingredient ' + id, lines?.direct);
  }
  for (const id of MODIFIER_IDS) {
    const lines = t.modifiers?.[id];
    if (!lines?.direct?.length) problems.push(`Extra "${id}": needs at least one direct line`);
    // Only extras that can already be ordered need hints (the rest are placeholders).
    if (TOOLS_ON_SALE.includes(MODIFIERS[id].unlockedBy) && !lines?.hint?.length) {
      problems.push(`Extra "${id}": needs at least one hint line`);
    }
    noBlanks(`Extra "${id}" (direct)`, lines?.direct);
    noBlanks(`Extra "${id}" (hint)`, lines?.hint);
  }
  // The same line for two orders would read like a different dish.
  const seen = new Map<string, string>();
  for (const id of RECIPE_IDS) {
    for (const line of [...(t.recipes?.[id]?.direct ?? []), ...(t.recipes?.[id]?.hint ?? [])]) {
      const other = seen.get(line.trim());
      if (other && other !== id) problems.push(`"${line}" is used for both "${other}" and "${id}"`);
      else if (other === id) problems.push(`"${line}" is used twice for "${id}"`);
      seen.set(line.trim(), id);
    }
  }
  for (const score of ['perfect', 'close', 'wrong'] as const) {
    if (!t.reactions?.[score]?.length) problems.push(`Reactions "${score}": need at least one line`);
    noBlanks(`Reactions "${score}"`, t.reactions?.[score]);
  }
  if (!t.gaveUp?.length) problems.push('Gave up: needs at least one line');
  noBlanks('Gave up', t.gaveUp);
  noBlanks('Double order (direct)', t.doubleOrder?.direct);
  return problems;
}
