import type { ModifierId } from '../data/modifiers';
import { TOASTER_CONFIG, type ToasterConfig } from '../data/toasterConfig';

/**
 * Where the dish being made is, and whether it's been toasted
 * (GAME_DESIGN.md §3.4 "Toasting"). The layers themselves stay in the prep
 * scene's dish list the whole time; this only tracks the trip through the
 * toaster:
 *
 *   plate --drag in--> toasting --time--> ready (on top) --drag back--> plate
 *
 * Plain data and pure functions, like the rest of logic/, so each step of
 * the trip is easy to test without dragging anything.
 */
export interface DishToast {
  place: 'plate' | 'toasting' | 'ready';
  /** While toasting: seconds until it pops up. */
  secondsLeft: number;
  /** Stays true once toasted, even as more layers are added. */
  toasted: boolean;
}

export function untoasted(): DishToast {
  return { place: 'plate', secondsLeft: 0, toasted: false };
}

/** The toaster takes a dish from the plate that has something on it and isn't toasted yet. */
export function canToast(toast: DishToast, layerCount: number): boolean {
  return toast.place === 'plate' && layerCount > 0 && !toast.toasted;
}

export function startToasting(toast: DishToast, config: ToasterConfig = TOASTER_CONFIG): DishToast {
  return { ...toast, place: 'toasting', secondsLeft: config.toastSeconds };
}

/** Time passes; a dish whose time is up pops up, toasted. */
export function stepToasting(toast: DishToast, seconds: number): DishToast {
  if (toast.place !== 'toasting') return toast;
  const secondsLeft = toast.secondsLeft - seconds;
  if (secondsLeft <= 0) return { place: 'ready', secondsLeft: 0, toasted: true };
  return { ...toast, secondsLeft };
}

/** How far through toasting, 0..1 (for the toaster's little progress bar). */
export function toastingProgress(toast: DishToast, config: ToasterConfig = TOASTER_CONFIG): number {
  if (toast.place !== 'toasting' || config.toastSeconds <= 0) return 0;
  return 1 - toast.secondsLeft / config.toastSeconds;
}

/** Back onto the plate from the top of the toaster. Does nothing unless it's ready there. */
export function takeFromToaster(toast: DishToast): DishToast {
  return toast.place === 'ready' ? { ...toast, place: 'plate' } : toast;
}

/** The plate's modifiers, for scoring. */
export function toastModifiers(toast: DishToast): ModifierId[] {
  return toast.toasted ? ['toasted'] : [];
}
