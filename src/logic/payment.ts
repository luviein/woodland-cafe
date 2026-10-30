import { RECIPE_PRICES } from '../data/prices';
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
 *     closeMultiplier if "close", times missingModifierMultiplier (once) if
 *     any requested modifier is missing.
 *
 * Leaves are whole, so the tip is rounded at the very end (rounding each
 * step would make the multipliers add up wrong). Pure: the caller decides
 * where the Leaves go.
 *
 * @param patienceLeft 0..1, the customer's patience when served
 */
export function computePayment(
  order: Order,
  result: ScoreResult,
  patienceLeft: number,
  config: TipConfig = TIP_CONFIG,
): Payment {
  if (result.score === 'wrong') return NOTHING;

  const price = RECIPE_PRICES[order.recipeId] * order.quantity;
  const tier = config.tiers.find((t) => patienceLeft > t.above);
  let tip = price * config.fullTipShare * (tier?.share ?? 0);
  if (result.score === 'close') tip *= config.closeMultiplier;
  if (result.missingModifiers.length > 0) tip *= config.missingModifierMultiplier;

  const rounded = Math.round(tip);
  return { price, tip: rounded, total: price + rounded };
}
