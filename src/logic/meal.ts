import type { IngredientId } from '../data/ingredients';
import { expectedPlate } from './orders';
import { computePayment, type Payment } from './payment';
import { scoreDish } from './scoreDish';
import { planIngredients, plateIngredients, useIngredients, type Pantry } from './stock';
import type { Order, Plate, Score, ScoreResult } from './types';
import { toastModifiers, type DishToast } from './toasting';

export interface MealItem {
  customerId: number;
  order: Order;
}

export interface MealPlate extends Plate {
  /** Availability on the plate, derived from prep state rather than a confirmation button. */
  ready: boolean;
}

export function mealPlate(layers: readonly IngredientId[], toast: DishToast): MealPlate {
  return { layers, modifiers: toastModifiers(toast), ready: layers.length > 0 && toast.place === 'plate' };
}

export interface MealServing {
  customerId: number;
  result: ScoreResult;
  payment: Payment;
}

export function mealIngredients(items: readonly MealItem[], plates: readonly Plate[]): IngredientId[] {
  return plates.flatMap((plate, i) => plateIngredients(plate.layers, items[i].order.quantity));
}

/** Reserve every other draft too, so switching requests cannot overspend stock or rush funds. */
export function mealPantry<T extends Pantry>(pantry: T, items: readonly MealItem[], plates: readonly Plate[], active: number): T | null {
  const others = plates.flatMap((plate, i) => i === active ? [] : plateIngredients(plate.layers, items[i].order.quantity));
  return planIngredients(pantry, others) ? useIngredients(pantry, others).state : null;
}

export function mealReady(items: readonly MealItem[], plates: readonly MealPlate[]): boolean {
  return items.length > 0 && items.length === plates.length && plates.every(p => p.ready && p.layers.length > 0);
}

export function worstScore(scores: readonly Score[]): Score {
  return scores.includes('wrong') ? 'wrong' : scores.includes('close') ? 'close' : 'perfect';
}

/** Score/pay once per animal, only when every requested plate is on the tray. */
export function scoreMeal(items: readonly MealItem[], plates: readonly MealPlate[], patience: number, forcedScore?: Score): MealServing[] | null {
  if (!mealReady(items, plates)) return null;
  const scores = items.map((item, i) => {
    const result = scoreDish(expectedPlate(item.order), plates[i]);
    return forcedScore ? { ...result, score: forcedScore } : result;
  });
  return [...new Set(items.map(item => item.customerId))].map(customerId => {
    const indices = items.flatMap((item, i) => item.customerId === customerId ? [i] : []);
    const score = worstScore(indices.map(i => scores[i].score));
    const payments = indices.map(i => computePayment(items[i].order, { ...scores[i], score: score === 'wrong' ? 'wrong' : scores[i].score }, patience));
    return {
      customerId,
      result: { score, missingModifiers: indices.flatMap(i => scores[i].missingModifiers), extraModifiers: indices.flatMap(i => scores[i].extraModifiers) },
      payment: payments.reduce((sum, p) => ({ price: sum.price + p.price, tip: sum.tip + p.tip, total: sum.total + p.total }), { price: 0, tip: 0, total: 0 }),
    };
  });
}
