import {
  DOUBLE_ORDER_LINES,
  INGREDIENT_LINES,
  MODIFIER_LINES,
  REACTION_LINES,
  RECIPE_LINES,
  type DialogueLines,
} from '../data/dialogue';
import { ORDER_CONFIG, type OrderConfig } from '../data/orderConfig';
import { RECIPES } from '../data/recipes';
import { uniqueIngredients } from './dish';
import { pickOne, type Rng } from './random';
import type { Order, Score } from './types';

export type SpeechStyle = 'direct' | 'hint';

/**
 * Picks one line in the wanted style. Hint lists aren't filled in until
 * milestone 6, so if there are no hints we quietly fall back to direct
 * rather than showing an empty bubble.
 */
function pickLine(lines: DialogueLines, style: SpeechStyle, rng: Rng): string {
  const pool = style === 'hint' && lines.hint.length > 0 ? lines.hint : lines.direct;
  return pickOne(pool, rng);
}

/**
 * The part of the speech that describes the recipe.
 * Direct: a recipe line ("One jam bread, please!").
 * Hint: a recipe hint if there is one; otherwise one hint per ingredient
 * ("Something soft... Something sweet and sticky."), as long as every
 * ingredient has a hint; otherwise direct.
 */
function recipeLines(order: Order, style: SpeechStyle, rng: Rng): string[] {
  const lines = RECIPE_LINES[order.recipeId];
  if (style === 'direct' || lines.hint.length > 0) {
    return [pickLine(lines, style, rng)];
  }

  const ingredientIds = uniqueIngredients(RECIPES[order.recipeId].layers);
  const allHaveHints = ingredientIds.every((id) => INGREDIENT_LINES[id].hint.length > 0);
  if (!allHaveHints) {
    return [pickLine(lines, 'direct', rng)];
  }
  return ingredientIds.map((id) => pickOne(INGREDIENT_LINES[id].hint, rng));
}

/**
 * Turns an order into what the customer says, one sentence per entry:
 * [double-order line] + recipe line(s) + one line per modifier.
 *
 * Each part independently rolls direct vs hint using config.hintRatio, so a
 * ratio of 0.3 means roughly 30% of lines are hints. That gives a smooth
 * difficulty dial instead of "all hints" or "no hints".
 *
 * Returns an array (not one joined string) so tests can check each part,
 * and the UI can decide how to lay the sentences out.
 */
export function buildSpeech(
  order: Order,
  rng: Rng = Math.random,
  config: OrderConfig = ORDER_CONFIG,
): string[] {
  const rollStyle = (): SpeechStyle => (rng() < config.hintRatio ? 'hint' : 'direct');

  const speech: string[] = [];
  if (order.quantity > 1) {
    speech.push(pickLine(DOUBLE_ORDER_LINES, rollStyle(), rng));
  }
  speech.push(...recipeLines(order, rollStyle(), rng));
  for (const mod of order.modifiers) {
    speech.push(pickLine(MODIFIER_LINES[mod], rollStyle(), rng));
  }
  return speech;
}

/** What the customer says after being served, based on how the dish scored. */
export function buildReaction(score: Score, rng: Rng = Math.random): string {
  return pickOne(REACTION_LINES[score], rng);
}
