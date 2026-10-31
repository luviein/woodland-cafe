import { EMPLOYEES, type EmployeeRole } from '../data/employees';
import { INGREDIENT_IDS, INGREDIENTS, type IngredientId } from '../data/ingredients';
import type { Payment } from './payment';
import type { IngredientPlan } from './stock';
import type { Score } from './types';

/** What happened today, for the day summary. Plain data, like everything else. */
export interface DayStats {
  /** Customers served, by how their dish scored (a wrong dish still counts as served). */
  served: Record<Score, number>;
  /** Customers who ran out of patience before being served. */
  gaveUp: number;
  /** Customers who left because their dish couldn't be made (out of stock). */
  outOfStock: number;
  /** Leaves earned from dish prices, and from tips, kept apart for the summary. */
  priceLeaves: number;
  tipLeaves: number;
  /** Leaves spent on rush deliveries. */
  rushLeaves: number;
  /** Leaves paid in wages at the end of the day (employees.ts payWages). */
  wageLeaves: number;
  /** Employees who couldn't be paid, and quit. */
  quit: EmployeeRole[];
  /** Ingredients used, split into from stock / rush-bought. Only ones used today appear. */
  used: Partial<Record<IngredientId, { fromStock: number; rushed: number }>>;
}

export function createDayStats(): DayStats {
  return {
    served: { perfect: 0, close: 0, wrong: 0 },
    gaveUp: 0,
    outOfStock: 0,
    priceLeaves: 0,
    tipLeaves: 0,
    rushLeaves: 0,
    wageLeaves: 0,
    quit: [],
    used: {},
  };
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

/** The ingredients of one served dish (the plan useIngredients() returned). */
export function recordIngredients(stats: DayStats, plan: IngredientPlan): DayStats {
  const used = { ...stats.used };
  for (const u of plan.uses) {
    const before = used[u.id] ?? { fromStock: 0, rushed: 0 };
    used[u.id] = { fromStock: before.fromStock + u.fromStock, rushed: before.rushed + u.rushed };
  }
  return { ...stats, used, rushLeaves: stats.rushLeaves + plan.rushCost };
}

/** A customer left because their dish couldn't be made. */
export function recordOutOfStock(stats: DayStats): DayStats {
  return { ...stats, outOfStock: stats.outOfStock + 1 };
}

/** End-of-day wages: what was paid, and who quit unpaid. */
export function recordWages(stats: DayStats, paid: number, quit: readonly EmployeeRole[]): DayStats {
  return { ...stats, wageLeaves: stats.wageLeaves + paid, quit: [...stats.quit, ...quit] };
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

/** Earned minus spent on rush deliveries and wages. Can be negative on a bad day. */
export function netLeaves(stats: DayStats): number {
  return totalEarned(stats) - stats.rushLeaves - stats.wageLeaves;
}

/**
 * The day summary's lines, e.g. "Served: 5 (3 perfect, 1 close, 1 wrong)".
 * Built here rather than in the scene so the wording is tested and the
 * scene just lays the lines out.
 */
export function summaryLines(stats: DayStats, wallet: number): string[] {
  const { perfect, close, wrong } = stats.served;
  // Wage lines only once someone's been hired, so early days stay short.
  const wages = stats.wageLeaves > 0 || stats.quit.length > 0 ? [`Wages: 🍃 ${stats.wageLeaves}`] : [];
  const quit =
    stats.quit.length > 0 ? [`Couldn't pay, quit: ${stats.quit.map((r) => EMPLOYEES[r].name).join(', ')}`] : [];
  return [
    `Served: ${totalServed(stats)} (${perfect} perfect, ${close} close, ${wrong} wrong)`,
    `Gave up waiting: ${stats.gaveUp}`,
    `Left, out of stock: ${stats.outOfStock}`,
    `Earned: 🍃 ${totalEarned(stats)} (${stats.priceLeaves} dishes + ${stats.tipLeaves} tips)`,
    `Rush deliveries: 🍃 ${stats.rushLeaves}`,
    ...wages,
    ...quit,
    `Net: 🍃 ${netLeaves(stats)}`,
    `Wallet: 🍃 ${wallet}`,
  ];
}

/**
 * The summary's "Ingredients used" column, one line each, e.g.
 * "Bread x14 (4 rush)". In ingredient-list order, so it reads the same
 * every day.
 */
export function ingredientLines(stats: DayStats): string[] {
  const lines = INGREDIENT_IDS.flatMap((id) => {
    const u = stats.used[id];
    if (!u) return [];
    const rush = u.rushed > 0 ? ` (${u.rushed} rush)` : '';
    return [`${INGREDIENTS[id].name} x${u.fromStock + u.rushed}${rush}`];
  });
  return lines.length > 0 ? lines : ['None'];
}
