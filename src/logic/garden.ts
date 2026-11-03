import { CROPS, CROP_IDS, GARDEN_PLOTS, type CropId } from '../data/crops';
import type { GameState } from './gameState';

export interface CropPlant { crop: CropId; wateredAt: number | null }
export interface Garden {
  seeds: Record<CropId, number>;
  plots: readonly (CropPlant | null)[];
}
export function emptyGarden(): Garden {
  return { seeds: { mushroom: 0, tomato: 0, chilli: 0 }, plots: Array(GARDEN_PLOTS).fill(null) };
}
export function validGarden(value: unknown): value is Garden {
  if (!value || typeof value !== 'object') return false;
  const garden = value as Garden;
  return !!garden.seeds && CROP_IDS.every(id => Number.isSafeInteger(garden.seeds[id]) && garden.seeds[id] >= 0)
    && Array.isArray(garden.plots) && garden.plots.length === GARDEN_PLOTS
    && garden.plots.every(plot => plot === null || !!plot && CROP_IDS.includes(plot.crop)
      && (plot.wateredAt === null || Number.isSafeInteger(plot.wateredAt) && plot.wateredAt >= 0 && plot.wateredAt <= 8640000000000000));
}
export function cropRemaining(plant: CropPlant, now: number): number {
  const duration = CROPS[plant.crop].minutes * 60000;
  return plant.wateredAt === null ? duration : Math.max(0, Math.min(duration, plant.wateredAt + duration - now));
}
export function cropStage(plant: CropPlant, now: number): number {
  if (plant.wateredAt === null) return 0;
  const remaining = cropRemaining(plant, now);
  return remaining === 0 ? 3 : remaining <= CROPS[plant.crop].minutes * 30000 ? 2 : 1;
}
export function canBuySeed(state: GameState, crop: CropId): boolean {
  return state.ingredients.includes(crop) && state.leaves >= CROPS[crop].seedPrice;
}
export function buySeed(state: GameState, crop: CropId): GameState {
  if (!canBuySeed(state, crop)) return state;
  return { ...state, leaves: state.leaves - CROPS[crop].seedPrice,
    garden: { ...state.garden, seeds: { ...state.garden.seeds, [crop]: state.garden.seeds[crop] + 1 } } };
}
export function plantCrop(state: GameState, index: number, crop: CropId): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= GARDEN_PLOTS || state.garden.plots[index]
    || !state.ingredients.includes(crop) || state.garden.seeds[crop] < 1) return state;
  const plots = [...state.garden.plots];
  plots[index] = { crop, wateredAt: null };
  return { ...state, garden: { seeds: { ...state.garden.seeds, [crop]: state.garden.seeds[crop] - 1 }, plots } };
}
/** One click waters once, or harvests only when the real-time timer is complete. */
export function tendCrop(state: GameState, index: number, now: number): GameState {
  if (!Number.isSafeInteger(now) || now < 0) return state;
  const plant = state.garden.plots[index];
  if (!plant) return state;
  const plots = [...state.garden.plots];
  if (plant.wateredAt === null) {
    plots[index] = { ...plant, wateredAt: now };
    return { ...state, garden: { ...state.garden, plots } };
  }
  if (cropRemaining(plant, now) > 0) return state;
  plots[index] = null;
  return { ...state, stock: { ...state.stock, [plant.crop]: state.stock[plant.crop] + CROPS[plant.crop].yield },
    garden: { ...state.garden, plots } };
}
/** Persist the garden's delta without accidentally committing an unfinished cafe day. */
export function gardenCheckpoint(checkpoint: GameState, before: GameState, after: GameState): GameState {
  const stock = { ...checkpoint.stock };
  for (const crop of CROP_IDS) stock[crop] += after.stock[crop] - before.stock[crop];
  return { ...checkpoint, garden: after.garden, stock, leaves: checkpoint.leaves + after.leaves - before.leaves };
}
