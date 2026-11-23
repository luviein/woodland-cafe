import { DAY_CONFIG, type DayConfig } from '../data/dayConfig';
import { createDayStats, type DayStats } from './dayStats';
import type { FloorState } from './floor';

/**
 * Progress through one cafe day. Kept apart from GameState: it only matters
 * while a day is running, and saving (milestone 9) happens between days.
 */
export interface DayState {
  /** Real seconds since opening (floor time, so the `speed` command speeds it up too). */
  elapsed: number;
  /** What happened today, for the summary at the end. */
  stats: DayStats;
  /** Snapshot at the most recent departure that emptied the cafe, even before closing. */
  cleanAtLastDeparture: boolean;
  /** Settled once at closing, including days which earned no bonus. */
  cleanBonusSettled: boolean;
}

export function createDay(): DayState {
  return { elapsed: 0, stats: createDayStats(), cleanAtLastDeparture: false, cleanBonusSettled: false };
}

/** Check after customer movement, using messes already cleaned by the player or staff. */
export function recordLastDeparture(day: DayState, before: FloorState, after: FloorState): DayState {
  if (day.cleanBonusSettled || before.customers.length === 0 || after.customers.length !== 0) return day;
  return { ...day, cleanAtLastDeparture: after.messySeats.length === 0 };
}

export function stepDay(day: DayState, seconds: number): DayState {
  return { ...day, elapsed: day.elapsed + seconds };
}

/** True until closing time; after that, no new customers come in. */
export function doorsOpen(day: DayState, config: DayConfig = DAY_CONFIG): boolean {
  return day.elapsed < config.dayLengthSeconds;
}

/**
 * The game clock as "9:40". Moves in clockStepMinutes steps (rounded down,
 * so it never shows a time that hasn't happened yet) and stops at closing.
 */
export function clockText(day: DayState, config: DayConfig = DAY_CONFIG): string {
  const openMinutes = (config.closeHour - config.openHour) * 60;
  const progress = Math.min(day.elapsed / config.dayLengthSeconds, 1);
  const step = config.clockStepMinutes;
  const minutes = config.openHour * 60 + Math.floor((progress * openMinutes) / step) * step;
  const mm = String(minutes % 60).padStart(2, '0');
  return `${Math.floor(minutes / 60)}:${mm}`;
}

/** The day is over once the doors have closed AND the last customer has left. */
export function isDayOver(day: DayState, floor: FloorState, config: DayConfig = DAY_CONFIG): boolean {
  return !doorsOpen(day, config) && floor.customers.length === 0;
}
