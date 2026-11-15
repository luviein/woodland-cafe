import { CROP_IDS, CROP_WEIGHT_CONFIG, type CropId, type CropVariant } from '../data/crops';
import type { GameState } from './gameState';
import type { CollectionId } from './cropCollection';

export const STANDARD_WEIGHT = CROP_WEIGHT_CONFIG.standard;
export interface WeightBatch { grams: number; count: number }
export type CropWeights = Partial<Record<`${CropVariant}.${CropId}`, readonly WeightBatch[]>>;
export type CropRecords = Partial<Record<CollectionId, number>>;

export function randomCropWeight(roll: number): number {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) return STANDARD_WEIGHT;
  const { minimum, typicalMaximum, maximum, rareChance, step } = CROP_WEIGHT_CONFIG;
  const typicalChance = 1 - rareChance;
  const grams = roll < typicalChance ? minimum + roll / typicalChance * (typicalMaximum - minimum)
    : typicalMaximum + (roll - typicalChance) / rareChance * (maximum - typicalMaximum);
  return Math.round(grams / step) * step;
}
export const formatCropWeight = (grams: number): string => `${(grams / 1000).toFixed(grams % 10 ? 3 : 2)} kg`;
export const weightKey = (crop: CropId, variant: CropVariant): keyof CropWeights => `${variant}.${crop}`;

/** Standard specimens are implicit, so old stock and large debug gifts stay compact. */
export function weightBatches(weights: CropWeights, key: keyof CropWeights, owned: number): WeightBatch[] {
  const batches = [...(weights[key] ?? [])].map(batch => ({ ...batch }));
  const standard = owned - batches.reduce((sum, batch) => sum + batch.count, 0);
  if (standard > 0) batches.push({ grams: STANDARD_WEIGHT, count: standard });
  return batches.sort((a, b) => a.grams - b.grams);
}
export function setWeightBatches(weights: CropWeights, key: keyof CropWeights, batches: readonly WeightBatch[]): CropWeights {
  const merged = new Map<number, number>();
  for (const batch of batches) if (batch.grams !== STANDARD_WEIGHT) merged.set(batch.grams, (merged.get(batch.grams) ?? 0) + batch.count);
  const next = { ...weights };
  const stored = [...merged].filter(([, count]) => count > 0).sort(([a], [b]) => a - b).map(([grams, count]) => ({ grams, count }));
  if (stored.length) next[key] = stored; else delete next[key];
  return next;
}
export function addCropWeights(weights: CropWeights, crop: CropId, variant: CropVariant, batches: readonly WeightBatch[]): CropWeights {
  const key = weightKey(crop, variant);
  return setWeightBatches(weights, key, [...(weights[key] ?? []), ...batches]);
}
export function takeCropWeights(weights: CropWeights, key: keyof CropWeights, owned: number, quantity: number): CropWeights {
  const batches = weightBatches(weights, key, owned);
  let left = quantity;
  for (const batch of batches) {
    const count = Math.min(batch.count, left);
    batch.count -= count; left -= count;
  }
  return setWeightBatches(weights, key, batches);
}
export function cropWeightRange(state: GameState, crop: CropId, variant: CropVariant): string {
  const owned = variant === 'ordinary' ? state.stock[crop] : state.garden.harvests[variant][crop];
  const batches = weightBatches(state.cropWeights, weightKey(crop, variant), owned);
  if (!batches.length) return '';
  const first = batches[0].grams, last = batches[batches.length - 1].grams;
  return first === last ? formatCropWeight(first) : `${formatCropWeight(first).replace(' kg', '')}–${formatCropWeight(last)}`;
}
export function cropRecord(state: GameState, id: CollectionId): number {
  return state.cropCollection.includes(id) ? state.cropRecords[id] ?? STANDARD_WEIGHT : 0;
}
export function heaviestCrop(state: GameState, crop: CropId, variant: CropVariant): number {
  const owned = variant === 'ordinary' ? state.stock[crop] : state.garden.harvests[variant][crop];
  return weightBatches(state.cropWeights, weightKey(crop, variant), owned).at(-1)?.grams ?? 0;
}

/** Cafe-day rollback restores cooking stock, but retains only the garden's weight delta. */
export function checkpointCropWeights(checkpoint: GameState, before: GameState, after: GameState): CropWeights {
  let weights = { ...after.cropWeights };
  for (const crop of CROP_IDS) {
    const key = weightKey(crop, 'ordinary');
    weights = setWeightBatches(weights, key, [
      ...(checkpoint.cropWeights[key] ?? []), ...(after.cropWeights[key] ?? []),
      ...(before.cropWeights[key] ?? []).map(batch => ({ ...batch, count: -batch.count })),
    ]);
  }
  return weights;
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const validCropWeight = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 10 && (value as number) <= CROP_WEIGHT_CONFIG.maximum;
export function validCropWeights(value: unknown, state: Pick<GameState, 'stock' | 'garden'>): value is CropWeights {
  if (!object(value)) return false;
  return Object.entries(value).every(([key, batches]) => {
    const [variant, crop] = key.split('.') as [CropVariant, CropId];
    if (!['ordinary', 'golden', 'christmas'].includes(variant) || !CROP_IDS.includes(crop) || key !== weightKey(crop, variant) || !Array.isArray(batches)) return false;
    const seen = new Set<number>();
    let total = 0;
    for (const batch of batches) {
      if (!object(batch) || !validCropWeight(batch.grams) || batch.grams === STANDARD_WEIGHT || seen.has(batch.grams)
        || !Number.isSafeInteger(batch.count) || (batch.count as number) <= 0) return false;
      seen.add(batch.grams); total += batch.count as number;
      if (!Number.isSafeInteger(total)) return false;
    }
    return total <= (variant === 'ordinary' ? state.stock[crop] : state.garden.harvests[variant][crop]);
  });
}
