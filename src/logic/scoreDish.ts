import { SCORING_CONFIG, type ScoringConfig } from '../data/scoring';
import { acceptedOrderings } from './acceptedOrderings';
import { layerDistance } from './layerDistance';
import type { Plate, Score, ScoreResult } from './types';

/**
 * Compares what the player made against what was ordered, layer by layer.
 * Bread must be in the right places; fillings between can be in any order.
 * Each missing or extra modifier (toasted when not asked, or not toasted
 * when asked) counts as one more mistake, like a wrong layer.
 *
 * Pure function: no Phaser, no global state, same inputs -> same output.
 * That's what makes it easy to unit test, and reusable later by employees
 * (milestone 8) that serve automatically.
 */
export function scoreDish(
  expected: Plate,
  actual: Plate,
  config: ScoringConfig = SCORING_CONFIG,
): ScoreResult {
  const missingModifiers = expected.modifiers.filter((m) => !actual.modifiers.includes(m));
  const extraModifiers = actual.modifiers.filter((m) => !expected.modifiers.includes(m));
  const result = (score: Score): ScoreResult => ({ score, missingModifiers, extraModifiers });

  // An empty plate is always wrong. Without this rule, serving nothing for
  // Plain Bread (1 layer) would be "one missing layer" and score close.
  if (actual.layers.length === 0) return result('wrong');

  // Compare against every acceptable ordering and keep the best match, so
  // the player is judged against the version of the recipe they were
  // closest to making.
  const layerMistakes = Math.min(
    ...acceptedOrderings(expected.layers, config.fixedIngredients).map((layers) =>
      layerDistance(layers, actual.layers),
    ),
  );
  const mistakes = layerMistakes + missingModifiers.length + extraModifiers.length;

  if (mistakes === 0) return result('perfect');
  if (mistakes <= config.closeTolerance) return result('close');
  return result('wrong');
}
