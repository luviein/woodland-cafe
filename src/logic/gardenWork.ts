import type { CropId, SeedType, CropVariant, CropEvent } from '../data/crops';
import type { GameState } from './gameState';
import { cropRemaining, plantCrop, tendCrop, seedCount } from './garden';
import type { Point } from './layout';
import type { Mover } from './outdoor';

export const GARDEN_WORK_SECONDS = { plant: 0.65, water: 0.9, harvest: 0.7 } as const;
export type GardenAction = keyof typeof GARDEN_WORK_SECONDS;
export interface GardenWork { index: number; crop: CropId; seed: SeedType; variant: CropVariant; action: GardenAction; secondsLeft: number }
export const HARVEST_DISPLAY_SECONDS = 0.5;
export interface HarvestDisplay { crop: CropId; variant?: CropVariant; secondsLeft: number }

/** Presentation only: stock was already granted when the harvest finished. */
export function stepHarvestDisplay(display: HarvestDisplay, seconds: number): HarvestDisplay | null {
  const secondsLeft = display.secondsLeft - Math.max(0, seconds);
  return secondsLeft <= 0 ? null : { ...display, secondsLeft };
}

/** Mover positions are the critter container's top left; feet are 12 across, 24 down. */
export function gardenStandPoint(bed: Point): Point { return { x: bed.x - 12, y: bed.y }; }

export function startGardenWork(state: GameState, index: number, selected: CropId, now: number, seed: SeedType = 'normal'): GardenWork | null {
  if (!Number.isInteger(index) || index < 0 || index >= state.garden.plots.length) return null;
  const plant = state.garden.plots[index];
  const action = !plant ? 'plant' : plant.wateredAt === null ? 'water' : cropRemaining(plant, now) === 0 ? 'harvest' : null;
  if (!action || action === 'plant' && (!state.ingredients.includes(selected) || seedCount(state.garden, selected, seed) < 1)) return null;
  return { index, crop: plant?.crop ?? selected, seed, variant: plant?.variant ?? 'ordinary', action, secondsLeft: GARDEN_WORK_SECONDS[action] };
}

export function stepGardenWork(work: GardenWork, mover: Mover, seconds: number): { work: GardenWork | null; finished: boolean } {
  if (mover.target) return { work, finished: false };
  const secondsLeft = work.secondsLeft - Math.max(0, seconds);
  return secondsLeft <= 0 ? { work: null, finished: true } : { work: { ...work, secondsLeft }, finished: false };
}

export function gardenWorkProgress(work: GardenWork): number {
  return Math.max(0, Math.min(1, 1 - work.secondsLeft / GARDEN_WORK_SECONDS[work.action]));
}

/** Recheck the queued action: a watered crop must never be treated as a harvest by accident. */
export function finishGardenWork(state: GameState, work: GardenWork, now: number, event: CropEvent | null = null, roll = 1): GameState {
  const plant = state.garden.plots[work.index];
  if (work.action === 'plant') return plant ? state : plantCrop(state, work.index, work.crop, work.seed, event, roll);
  if (!plant || plant.crop !== work.crop || plant.variant !== work.variant) return state;
  if (work.action === 'water' && plant.wateredAt !== null) return state;
  if (work.action === 'harvest' && (plant.wateredAt === null || cropRemaining(plant, now) > 0)) return state;
  return tendCrop(state, work.index, now, roll);
}
