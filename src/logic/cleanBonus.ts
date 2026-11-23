import { CLEAN_BONUS_CONFIG } from '../data/cleanBonusConfig';
import { isDayOver, type DayState } from './day';
import type { FloorState } from './floor';
import { earnLeaves, type GameState } from './gameState';

/** Settle against the departure snapshot, so a delayed summary cannot extend the deadline. */
export function settleCleanBonus(game: GameState, day: DayState, floor: FloorState): { game: GameState; day: DayState } {
  if (day.cleanBonusSettled || !isDayOver(day, floor)) return { game, day };
  const amount = day.cleanAtLastDeparture ? CLEAN_BONUS_CONFIG.leaves : 0;
  if (!Number.isSafeInteger(game.leaves + amount)) return { game, day };
  return {
    game: amount > 0 ? earnLeaves(game, amount) : game,
    day: { ...day, cleanBonusSettled: true, stats: { ...day.stats, cleanBonusLeaves: amount } },
  };
}
