import type { Payment } from './payment';
import type { Score } from './types';

/** What happened today, for the day summary. Plain data, like everything else. */
export interface DayStats {
  /** Customers served, by how their dish scored (a wrong dish still counts as served). */
  served: Record<Score, number>;
  /** Customers who ran out of patience before being served. */
  gaveUp: number;
  /** Leaves earned from dish prices, and from tips, kept apart for the summary. */
  priceLeaves: number;
  tipLeaves: number;
}

export function createDayStats(): DayStats {
  return { served: { perfect: 0, close: 0, wrong: 0 }, gaveUp: 0, priceLeaves: 0, tipLeaves: 0 };
}

/** One customer served. Returns new stats; the old ones are left untouched. */
export function recordServe(stats: DayStats, score: Score, payment: Payment): DayStats {
  return {
    ...stats,
    served: { ...stats.served, [score]: stats.served[score] + 1 },
    priceLeaves: stats.priceLeaves + payment.price,
    tipLeaves: stats.tipLeaves + payment.tip,
  };
}

/** `count` customers gave up waiting. */
export function recordGaveUp(stats: DayStats, count = 1): DayStats {
  return { ...stats, gaveUp: stats.gaveUp + count };
}

export function totalServed(stats: DayStats): number {
  return stats.served.perfect + stats.served.close + stats.served.wrong;
}

export function totalEarned(stats: DayStats): number {
  return stats.priceLeaves + stats.tipLeaves;
}
