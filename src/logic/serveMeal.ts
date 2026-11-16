import { customerOrders, customerParty, serveCustomer, type FloorState } from './floor';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { mealIngredients, scoreMeal, type MealPlate } from './meal';
import { planIngredients, useIngredients, type Pantry } from './stock';
import type { Score } from './types';

/** The entire delivery succeeds once, or spends/pays nothing. */
export function servePartyMeal<T extends Pantry>(floor: FloorState, customerId: number, game: T, plates: readonly MealPlate[], forcedScore?: Score) {
  const party = customerParty(floor, customerId);
  if (!party.length || party.some(c => c.phase !== 'ordered' || c.patience <= 0)) return null;
  const items = party.flatMap(c => customerOrders(c).map(order => ({ customerId: c.id, order })));
  const patience = Math.min(...party.map(c => c.patience / (c.patienceTotal ?? FLOOR_CONFIG.patienceSeconds)));
  const servings = scoreMeal(items, plates, patience, forcedScore);
  if (!servings) return null;
  const ingredients = mealIngredients(items, plates);
  if (!planIngredients(game, ingredients)) return null;
  // Spend before crediting any animal's payment: earnings cannot fund this meal's rush costs.
  const used = useIngredients(game, ingredients);
  const total = servings.reduce((sum, s) => sum + s.payment.total, 0);
  return {
    floor: servings.reduce((next, s) => serveCustomer(next, s.customerId, s.result.score), floor),
    game: { ...used.state, leaves: used.state.leaves + total },
    servings,
    plan: used.plan,
  };
}
