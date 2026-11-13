import { CROPS, CROP_IDS, GARDEN_PLOTS, SPECIAL_VARIANTS, CROP_CHANCES, type CropId, type SeedType, type CropVariant, type CropEvent } from '../data/crops';
import { SHOPS } from '../data/shops';
import { inSeason } from './shop';
import type { GameState } from './gameState';

export interface CropPlant { crop: CropId; variant: CropVariant; wateredAt: number | null }
export interface Garden {
  seeds: Record<CropId, number>;
  seasonalSeeds: Record<CropId, number>;
  harvests: Record<typeof SPECIAL_VARIANTS[number], Record<CropId, number>>;
  plots: readonly (CropPlant | null)[];
}
export function emptyGarden(): Garden {
  const counts = () => ({ mushroom: 0, tomato: 0, chilli: 0 });
  return { seeds: counts(), seasonalSeeds: counts(), harvests: { golden: counts(), christmas: counts() }, plots: Array(GARDEN_PLOTS).fill(null) };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const counts = (v: unknown): boolean => object(v) && CROP_IDS.every(id => count(v[id]));
export function validGarden(value: unknown): value is Garden {
  if (!object(value)) return false;
  return counts(value.seeds) && counts(value.seasonalSeeds) && object(value.harvests)
    && SPECIAL_VARIANTS.every(id => counts((value.harvests as Record<string, unknown>)[id]))
    && Array.isArray(value.plots) && value.plots.length === GARDEN_PLOTS
    && value.plots.every(plot => plot === null || object(plot) && CROP_IDS.includes(plot.crop as CropId)
      && ['ordinary', ...SPECIAL_VARIANTS].includes(plot.variant as CropVariant)
      && (plot.wateredAt === null || count(plot.wateredAt) && plot.wateredAt <= 8640000000000000));
}
/** Old crops keep their watering time and become ordinary, without a new roll. */
export function migrateGarden(value: unknown): unknown {
  if (!object(value)) return value;
  const fresh = emptyGarden();
  return { ...value, seasonalSeeds: value.seasonalSeeds ?? fresh.seasonalSeeds, harvests: value.harvests ?? fresh.harvests,
    plots: Array.isArray(value.plots) ? value.plots.map(plot => object(plot)
      ? { ...plot, variant: plot.variant ?? 'ordinary' } : plot) : value.plots };
}
export function activeCropEvent(today: Date, allSeasons = false): CropEvent | null {
  return allSeasons || inSeason(SHOPS.christmas, today) ? 'christmas' : null;
}
/** A single supplied draw gives mutually exclusive outcomes; no hidden randomness. */
export function cropMutation(event: CropEvent | null, roll: number): CropVariant {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) return 'ordinary';
  const seasonal = event ? CROP_CHANCES.seasonal : 0;
  if (event && roll < seasonal) return event;
  return roll < seasonal + CROP_CHANCES.golden ? 'golden' : 'ordinary';
}
export function harvestYield(crop: CropId, roll = 1): number {
  return CROPS[crop].yield * (Number.isFinite(roll) && roll >= 0 && roll < CROP_CHANCES.doubleHarvest ? 2 : 1);
}
export function cropName(crop: CropId, variant: CropVariant = 'ordinary'): string {
  return `${variant === 'ordinary' ? '' : variant === 'golden' ? 'Golden ' : 'Christmas '}${CROPS[crop].name}`;
}
export function cropArtName(crop: CropId, variant: CropVariant = 'ordinary', planted = false): string {
  const base = planted ? `garden${crop[0].toUpperCase()}${crop.slice(1)}` : crop;
  return base + (variant === 'ordinary' ? '' : variant === 'golden' ? 'Golden' : 'Christmas');
}
export function seedCount(garden: Garden, crop: CropId, seed: SeedType = 'normal'): number {
  return (seed === 'normal' ? garden.seeds : garden.seasonalSeeds)[crop];
}
export function seedPrice(crop: CropId, seed: SeedType = 'normal'): number {
  return seed === 'normal' ? CROPS[crop].seedPrice : CROPS[crop].seasonalSeedPrice;
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
export function canBuySeed(state: GameState, crop: CropId, seed: SeedType = 'normal', event: CropEvent | null = null): boolean {
  return (seed === 'normal' || event === seed) && state.ingredients.includes(crop)
    && state.leaves >= seedPrice(crop, seed) && seedCount(state.garden, crop, seed) < Number.MAX_SAFE_INTEGER;
}
export function buySeed(state: GameState, crop: CropId, seed: SeedType = 'normal', event: CropEvent | null = null): GameState {
  if (!canBuySeed(state, crop, seed, event)) return state;
  const key = seed === 'normal' ? 'seeds' : 'seasonalSeeds';
  return { ...state, leaves: state.leaves - seedPrice(crop, seed), garden: { ...state.garden,
    [key]: { ...state.garden[key], [crop]: state.garden[key][crop] + 1 } } };
}
export function plantCrop(state: GameState, index: number, crop: CropId, seed: SeedType = 'normal', event: CropEvent | null = null, roll = 1): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= GARDEN_PLOTS || state.garden.plots[index]
    || !state.ingredients.includes(crop) || seedCount(state.garden, crop, seed) < 1) return state;
  const plots = [...state.garden.plots], key = seed === 'normal' ? 'seeds' : 'seasonalSeeds';
  plots[index] = { crop, variant: seed === 'normal' ? cropMutation(event, roll) : seed, wateredAt: null };
  return { ...state, garden: { ...state.garden, [key]: { ...state.garden[key], [crop]: state.garden[key][crop] - 1 }, plots } };
}
/** One click waters once, or harvests only when the real-time timer is complete. */
export function tendCrop(state: GameState, index: number, now: number, roll = 1): GameState {
  if (!Number.isSafeInteger(now) || now < 0 || now > 8640000000000000 || !Number.isInteger(index)) return state;
  const plant = state.garden.plots[index];
  if (!plant) return state;
  const plots = [...state.garden.plots];
  if (plant.wateredAt === null) {
    plots[index] = { ...plant, wateredAt: now };
    return { ...state, garden: { ...state.garden, plots } };
  }
  if (cropRemaining(plant, now) > 0) return state;
  const amount = harvestYield(plant.crop, roll);
  const current = plant.variant === 'ordinary' ? state.stock[plant.crop] : state.garden.harvests[plant.variant][plant.crop];
  if (!Number.isSafeInteger(current + amount)) return state;
  plots[index] = null;
  if (plant.variant === 'ordinary') return { ...state, stock: { ...state.stock, [plant.crop]: current + amount },
    garden: { ...state.garden, plots } };
  return { ...state, garden: { ...state.garden, plots, harvests: { ...state.garden.harvests,
    [plant.variant]: { ...state.garden.harvests[plant.variant], [plant.crop]: current + amount } } } };
}
/** Persist the garden's delta without accidentally committing an unfinished cafe day. */
export function gardenCheckpoint(checkpoint: GameState, before: GameState, after: GameState): GameState {
  const stock = { ...checkpoint.stock };
  for (const crop of CROP_IDS) stock[crop] += after.stock[crop] - before.stock[crop];
  return { ...checkpoint, garden: after.garden, stock, leaves: checkpoint.leaves + after.leaves - before.leaves };
}
