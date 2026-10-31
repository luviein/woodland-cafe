import {
  DOUBLE_ORDER_LINES,
  GAVE_UP_LINES,
  MODIFIER_LINES,
  REACTION_LINES,
  RECIPE_LINES,
  type DialogueLines,
} from '../data/dialogue';
import { HINT_CONFIG, type HintConfig } from '../data/hintConfig';
import { pickOne, type Rng } from './random';
import type { Order, Score } from './types';

type SpeechStyle = 'direct' | 'hint';

/**
 * Picks one line in the wanted style. Placeholder entries (modifiers whose
 * upgrade isn't built yet) may have no hints: then it quietly falls back to
 * direct rather than showing an empty bubble.
 */
function pickLine(lines: DialogueLines, style: SpeechStyle, rng: Rng): string {
  const pool = style === 'hint' && lines.hint.length > 0 ? lines.hint : lines.direct;
  return pickOne(pool, rng);
}

/**
 * How often orders are hinted on `day` (1 = the first day): the start
 * value, plus a step per day after that, up to the cap (data/hintConfig.ts).
 */
export function hintRatioForDay(day: number, config: HintConfig = HINT_CONFIG): number {
  return Math.min(config.hintRatioMax, config.hintRatioStart + (day - 1) * config.hintRatioPerDay);
}

/**
 * Turns an order into what the customer says, one sentence per entry:
 * [double-order line] + recipe line + one line per modifier.
 *
 * Each part independently rolls direct vs hint using `hintRatio`, so a
 * ratio of 0.3 means roughly 30% of lines are hints. That gives a smooth
 * difficulty dial instead of "all hints" or "no hints".
 *
 * Returns an array (not one joined string) so tests can check each part,
 * and the UI can decide how to lay the sentences out.
 */
export function buildSpeech(order: Order, hintRatio: number, rng: Rng = Math.random): string[] {
  const rollStyle = (): SpeechStyle => (rng() < hintRatio ? 'hint' : 'direct');

  const speech: string[] = [];
  if (order.quantity > 1) {
    speech.push(pickLine(DOUBLE_ORDER_LINES, rollStyle(), rng));
  }
  // The whole dish in one line: every recipe has its own hints, because a
  // hint built ingredient by ingredient can't tell Mushroom Bread from a
  // Mushroom Sandwich (GAME_DESIGN.md §3.5).
  speech.push(pickLine(RECIPE_LINES[order.recipeId], rollStyle(), rng));
  for (const mod of order.modifiers) {
    speech.push(pickLine(MODIFIER_LINES[mod], rollStyle(), rng));
  }
  return speech;
}

/** What a customer says when they give up waiting for their order. */
export function buildGaveUp(rng: Rng = Math.random): string {
  return pickOne(GAVE_UP_LINES, rng);
}

/** What the customer says after being served, based on how the dish scored. */
export function buildReaction(score: Score, rng: Rng = Math.random): string {
  return pickOne(REACTION_LINES[score], rng);
}
