import { SCORING_CONFIG, type ScoringConfig } from '../data/scoring';
import { acceptedOrderings } from './acceptedOrderings';
import { layerDistance } from './layerDistance';
import type { Plate, ScoreResult } from './types';

/**
 * Compares what the player made against what was ordered, layer by layer.
 * Bread must be in the right places; fillings between can be in any order.
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

  // An empty plate is always wrong. Without this rule, serving nothing for
  // Plain Bread (1 layer) would be "one missing layer" and score close.
  if (actual.layers.length === 0) {
    return { score: 'wrong', missingModifiers };
  }

  // Compare against every acceptable ordering and keep the best match, so
  // the player is judged against the version of the recipe they were
  // closest to making.
  const mistakes = Math.min(
    ...acceptedOrderings(expected.layers, config.fixedIngredients).map((layers) =>
      layerDistance(layers, actual.layers),
    ),
  );

  if (mistakes === 0) return { score: 'perfect', missingModifiers };
  if (mistakes <= config.closeTolerance) return { score: 'close', missingModifiers };
  return { score: 'wrong', missingModifiers };
}
