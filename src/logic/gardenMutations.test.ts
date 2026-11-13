import { describe, expect, it } from 'vitest';
import { CROP_IDS, SPECIAL_VARIANTS, type CropVariant } from '../data/crops';
import { SPRITE_ART } from '../art/spriteArt';
import { createNewGame } from './gameState';
import { activeCropEvent, buySeed, canBuySeed, cropArtName, cropMutation, gardenCheckpoint, harvestYield, plantCrop, tendCrop, validGarden } from './garden';
import { finishGardenWork, startGardenWork } from './gardenWork';
import { loadGame, saveGame } from './save';

const fresh = () => ({ ...createNewGame(), leaves: 100, ingredients: [...createNewGame().ingredients, 'tomato' as const, 'chilli' as const] });
const specialPlant = (variant: CropVariant) => plantCrop(buySeed(fresh(), 'mushroom'), 0, 'mushroom', 'normal',
  variant === 'christmas' ? 'christmas' : null, variant === 'ordinary' ? 0.5 : 0);

describe('mutation and yield probabilities', () => {
  it.each([
    [0, 'christmas'], [0.029999, 'christmas'], [0.03, 'golden'], [0.079999, 'golden'], [0.08, 'ordinary'], [0.999999, 'ordinary'],
  ] as const)('uses exclusive event outcomes at roll %s', (roll, outcome) => {
    expect(cropMutation('christmas', roll)).toBe(outcome);
  });
  it('gives exactly 3% seasonal and 5% Golden outcomes without overlapping rolls', () => {
    const outcomes = Array.from({ length: 10000 }, (_, i) => cropMutation('christmas', (i + 0.5) / 10000));
    expect(outcomes.filter(v => v === 'christmas')).toHaveLength(300);
    expect(outcomes.filter(v => v === 'golden')).toHaveLength(500);
    expect(outcomes.filter(v => v === 'ordinary')).toHaveLength(9200);
    expect(cropMutation(null, 0)).toBe('golden');
    expect(cropMutation(null, 0.049999)).toBe('golden');
    expect(cropMutation(null, 0.05)).toBe('ordinary');
    for (const roll of [-1, 1, NaN, Infinity]) expect(cropMutation('christmas', roll)).toBe('ordinary');
  });
  it('uses local December dates and the same all-season preview as the catalogue', () => {
    expect(activeCropEvent(new Date(2026, 10, 30, 23, 59))).toBeNull();
    expect(activeCropEvent(new Date(2026, 11, 1))).toBe('christmas');
    expect(activeCropEvent(new Date(2026, 11, 31, 23, 59))).toBe('christmas');
    expect(activeCropEvent(new Date(2027, 0, 1))).toBeNull();
    expect(activeCropEvent(new Date(2026, 5, 1), true)).toBe('christmas');
  });
  it.each(CROP_IDS)('doubles %s only below the 5% cutoff', crop => {
    expect(harvestYield(crop, 0)).toBe(8);
    expect(harvestYield(crop, 0.049999)).toBe(8);
    for (const roll of [0.05, 0.999999, 1, -1, NaN, Infinity]) expect(harvestYield(crop, roll)).toBe(4);
  });
});

describe('seasonal seeds and harvest destinations', () => {
  it.each([['mushroom', 5], ['tomato', 10], ['chilli', 15]] as const)('buys and plants guaranteed Christmas %s for %s Leaves', (crop, price) => {
    const state = fresh();
    expect(canBuySeed(state, crop, 'christmas')).toBe(false);
    expect(buySeed(state, crop, 'christmas')).toBe(state);
    expect(canBuySeed({ ...state, leaves: price - 1 }, crop, 'christmas', 'christmas')).toBe(false);
    const bought = buySeed(state, crop, 'christmas', 'christmas');
    expect(bought.leaves).toBe(100 - price);
    expect(bought.garden.seasonalSeeds[crop]).toBe(1);
    expect(bought.garden.seeds[crop]).toBe(0);
    // The event has ended, but an owned packet still guarantees its crop.
    const planted = plantCrop(bought, 0, crop, 'christmas', null, 0.99);
    expect(planted.garden.plots[0]?.variant).toBe('christmas');
    expect(planted.garden.seasonalSeeds[crop]).toBe(0);
    expect(plantCrop(planted, 1, crop, 'christmas')).toBe(planted);
  });
  it('retains ingredient locks and rejects overflowing seed counts', () => {
    const state = { ...createNewGame(), leaves: 100 };
    expect(canBuySeed(state, 'tomato', 'christmas', 'christmas')).toBe(false);
    const full = { ...state, garden: { ...state.garden, seasonalSeeds: { ...state.garden.seasonalSeeds, mushroom: Number.MAX_SAFE_INTEGER } } };
    expect(buySeed(full, 'mushroom', 'christmas', 'christmas')).toBe(full);
  });
  it.each(['ordinary', ...SPECIAL_VARIANTS] as const)('persists %s and grants eight units once to its own destination', variant => {
    const planted = specialPlant(variant);
    const watered = tendCrop(planted, 0, 1000, 0);
    const loaded = loadGame(saveGame(watered));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.garden.plots[0]?.variant).toBe(variant);
    expect(tendCrop(watered, 0, 300999, 0)).toBe(watered);
    const harvested = tendCrop(loaded.state, 0, 301000, 0);
    expect(harvested.garden.plots[0]).toBeNull();
    if (variant === 'ordinary') {
      expect(harvested.stock.mushroom).toBe(watered.stock.mushroom + 8);
      expect(harvested.garden.harvests).toEqual(watered.garden.harvests);
    } else {
      expect(harvested.stock).toEqual(watered.stock);
      expect(harvested.garden.harvests[variant].mushroom).toBe(8);
    }
    expect(loadGame(saveGame(harvested))).toEqual({ ok: true, state: harvested });
    expect(tendCrop(harvested, 0, 301000, 0)).toBe(harvested);
  });
  it('retains the queued packet type and revalidates stock at planting completion', () => {
    const bought = buySeed(buySeed(fresh(), 'mushroom'), 'mushroom', 'christmas', 'christmas');
    const work = startGardenWork(bought, 0, 'mushroom', 1000, 'christmas')!;
    const planted = finishGardenWork(bought, work, 1000, null, 0.5);
    expect(planted.garden.plots[0]?.variant).toBe('christmas');
    expect(planted.garden.seeds.mushroom).toBe(1);
    expect(finishGardenWork(planted, work, 1000, 'christmas', 0)).toBe(planted);
    const noPackets = { ...bought, garden: { ...bought.garden, seasonalSeeds: { ...bought.garden.seasonalSeeds, mushroom: 0 } } };
    expect(finishGardenWork(noPackets, work, 1000)).toBe(noPackets);
  });
  it('saves special harvests against a cafe checkpoint without committing the cafe day', () => {
    const checkpoint = tendCrop(specialPlant('christmas'), 0, 1000);
    const midDay = { ...checkpoint, leaves: 999, stock: { ...checkpoint.stock, mushroom: 0 } };
    const harvested = tendCrop(midDay, 0, 301000, 0);
    const saved = gardenCheckpoint(checkpoint, midDay, harvested);
    expect(saved.leaves).toBe(checkpoint.leaves);
    expect(saved.stock).toEqual(checkpoint.stock);
    expect(saved.garden.harvests.christmas.mushroom).toBe(8);
    expect(saved.garden.plots[0]).toBeNull();
  });
  it('has registered plot and harvest textures for every crop outcome', () => {
    for (const crop of CROP_IDS) for (const variant of ['ordinary', ...SPECIAL_VARIANTS] as const) {
      expect(SPRITE_ART).toHaveProperty(cropArtName(crop, variant));
      expect(SPRITE_ART).toHaveProperty(cropArtName(crop, variant, true));
    }
  });
});

describe('save migration and validation', () => {
  it('loads version 13 watering times and seed stock without rolling mutations', () => {
    const state = tendCrop(specialPlant('ordinary'), 0, 1234);
    const raw = JSON.parse(saveGame(state));
    raw.version = 13;
    delete raw.state.garden.seasonalSeeds;
    delete raw.state.garden.harvests;
    delete raw.state.garden.plots[0].variant;
    raw.state.garden.seeds.tomato = 7;
    const loaded = loadGame(JSON.stringify(raw));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.garden.plots[0]).toEqual({ crop: 'mushroom', variant: 'ordinary', wateredAt: 1234 });
    expect(loaded.state.garden.seeds.tomato).toBe(7);
    expect(loaded.state.garden.harvests.christmas.mushroom).toBe(0);
    expect(loaded.state.garden.seasonalSeeds.tomato).toBe(0);
  });
  it.each([
    (g: Record<string, any>) => { g.plots[0].variant = 'unknown'; },
    (g: Record<string, any>) => { delete g.plots[0].variant; },
    (g: Record<string, any>) => { g.seasonalSeeds.mushroom = -1; },
    (g: Record<string, any>) => { g.harvests.christmas.mushroom = 1.5; },
    (g: Record<string, any>) => { g.harvests.golden.tomato = Number.MAX_SAFE_INTEGER + 1; },
    (g: Record<string, any>) => { g.harvests = null; },
    (g: Record<string, any>) => { g.plots[0] = null; g.plots[1] = { crop: 'mushroom', variant: 'ordinary', wateredAt: 'today' }; },
  ])('rejects malformed current garden data %#', damage => {
    const raw = JSON.parse(saveGame(specialPlant('ordinary')));
    damage(raw.state.garden);
    expect(validGarden(raw.state.garden)).toBe(false);
    expect(loadGame(JSON.stringify(raw)).ok).toBe(false);
  });
});
