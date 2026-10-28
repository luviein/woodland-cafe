import { SCORING_CONFIG } from '../data/scoring';
import { layerDistance } from './layerDistance';
import type { Plate, ScoreResult } from './types';

/**
 * Compares what the player made against what was ordered, layer by layer.
 *
 * Pure function: no Phaser, no global state, same inputs -> same output.
 * That's what makes it easy to unit test, and reusable later by employees
 * (milestone 8) that serve automatically.
 */
export function scoreDish(
  expected: Plate,
  actual: Plate,
  closeTolerance: number = SCORING_CONFIG.closeTolerance,
): ScoreResult {
  const missingModifiers = expected.modifiers.filter((m) => !actual.modifiers.includes(m));

  // An empty plate is always wrong. Without this rule, serving nothing for
  // Plain Bread (1 layer) would be "one missing layer" and score close.
  if (actual.layers.length === 0) {
    return { score: 'wrong', missingModifiers };
  }

  const mistakes = layerDistance(expected.layers, actual.layers);
  if (mistakes === 0) return { score: 'perfect', missingModifiers };
  if (mistakes <= closeTolerance) return { score: 'close', missingModifiers };
  return { score: 'wrong', missingModifiers };
}
