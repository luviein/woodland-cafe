import { RECIPE_PRICES } from '../data/prices';
import type { RecipeId } from '../data/recipes';
import { TIP_CONFIG, type TipConfig } from '../data/tipConfig';
import type { Order, ScoreResult } from './types';

/** What a served customer hands over, in whole Leaves. */
export interface Payment {
  price: number;
  tip: number;
  total: number;
}

const NOTHING: Payment = { price: 0, tip: 0, total: 0 };

/**
 * What a customer pays when served:
 *   - wrong dish: nothing at all
 *   - otherwise the price (x2 for a double order) plus a tip, which is
 *     fullTipShare of the price, times the patience tier's share, times
 *     closeMultiplier if "close". (Modifier mistakes are already in the
 *     score: one makes a perfect dish "close".)
 *
 * Leaves are whole, so the tip is rounded at the very end (rounding each
 * step would make the multipliers add up wrong). Pure: the caller decides
 * where the Leaves go.
 *
 * @param patienceLeft 0..1, the customer's patience when served
 * @param prices dish prices; tests pass their own so they don't break when prices are retuned
 */
export function computePayment(
  order: Order,
  result: ScoreResult,
  patienceLeft: number,
  config: TipConfig = TIP_CONFIG,
  prices: Record<RecipeId, number> = RECIPE_PRICES,
): Payment {
  if (result.score === 'wrong') return NOTHING;

  const price = prices[order.recipeId] * order.quantity;
  const tier = config.tiers.find((t) => patienceLeft > t.above);
  let tip = price * config.fullTipShare * (tier?.share ?? 0);
  if (result.score === 'close') tip *= config.closeMultiplier;

  const rounded = Math.round(tip);
  return { price, tip: rounded, total: price + rounded };
}
