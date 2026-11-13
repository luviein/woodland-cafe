import { describe, expect, it } from 'vitest';
import { CROPS, CROP_IDS } from '../data/crops';
import { createNewGame } from './gameState';
import { buySeed, canBuySeed, cropRemaining, cropStage, emptyGarden, gardenCheckpoint, plantCrop, tendCrop } from './garden';
import { loadGame, saveGame } from './save';

const start = () => ({ ...createNewGame(), leaves: 20 });
const planted = () => plantCrop(buySeed(start(), 'mushroom'), 0, 'mushroom');
const watered = () => tendCrop(planted(), 0, 1000);

describe('real-time garden', () => {
  it('buys only affordable, unlocked seeds and consumes one on planting', () => {
    expect(canBuySeed(start(), 'tomato')).toBe(false);
    expect(canBuySeed({ ...start(), leaves: 0 }, 'mushroom')).toBe(false);
    expect(buySeed(start(), 'tomato')).toEqual(start());
    const state = planted();
    expect(state.leaves).toBe(19);
    expect(state.garden.seeds.mushroom).toBe(0);
    expect(state.garden.plots[0]).toEqual({ crop: 'mushroom', variant: 'ordinary', wateredAt: null });
    expect(plantCrop(state, 1, 'mushroom')).toBe(state);
    const stocked = buySeed(state, 'mushroom');
    expect(plantCrop(stocked, 0, 'mushroom')).toBe(stocked);
    expect(plantCrop(stocked, -1, 'mushroom')).toBe(stocked);
    expect(plantCrop(stocked, 6, 'mushroom')).toBe(stocked);
  });

  it.each(CROP_IDS)('%s waits for watering, grows by wall time and harvests once', crop => {
    const fresh = { ...start(), ingredients: [...start().ingredients, crop] };
    const dry = plantCrop(buySeed(fresh, crop), 0, crop);
    expect(cropStage(dry.garden.plots[0]!, 999999999)).toBe(0);
    const wet = tendCrop(dry, 0, 1000), duration = CROPS[crop].minutes * 60000;
    expect(cropStage(wet.garden.plots[0]!, 1000)).toBe(1);
    expect(cropStage(wet.garden.plots[0]!, 1000 + duration / 2)).toBe(2);
    expect(tendCrop(wet, 0, duration)).toBe(wet);
    expect(wet.garden.plots[0]!.wateredAt).toBe(1000);
    const ready = tendCrop(wet, 0, 1000 + duration);
    expect(ready.stock[crop]).toBe(wet.stock[crop] + 4);
    expect(ready.garden.plots[0]).toBeNull();
    expect(tendCrop(ready, 0, 1000 + duration)).toBe(ready);
  });

  it('survives offline saves; ready crops never expire and backwards clocks do not ripen them', () => {
    const state = watered(), loaded = loadGame(saveGame(state));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const plant = loaded.state.garden.plots[0]!;
    expect(cropRemaining(plant, 0)).toBe(300000);
    expect(cropRemaining(plant, 9999999999)).toBe(0);
    expect(cropStage(plant, 9999999999)).toBe(3);
    expect(tendCrop(state, 0, NaN)).toBe(state);
  });

  it('defaults version 12 saves to an empty garden and preserves current garden data', () => {
    const state = start(), raw = JSON.parse(saveGame(state));
    delete raw.state.garden; raw.version = 12;
    const result = loadGame(JSON.stringify(raw));
    expect(result.ok && result.state.garden).toEqual(emptyGarden());
    expect(loadGame(saveGame(watered()))).toEqual({ ok: true, state: watered() });
  });

  it.each([
    { ...emptyGarden(), plots: [] },
    { ...emptyGarden(), seeds: { mushroom: -1, tomato: 0, chilli: 0 } },
    { ...emptyGarden(), plots: [{ crop: 'bread', wateredAt: 1 }, null, null, null, null, null] },
    { ...emptyGarden(), plots: [{ crop: 'mushroom', wateredAt: -1 }, null, null, null, null, null] },
    { ...emptyGarden(), plots: [{ crop: 'mushroom', wateredAt: 'yesterday' }, null, null, null, null, null] },
  ])('rejects damaged garden saves %#', garden => {
    const raw = JSON.parse(saveGame(start())); raw.state.garden = garden;
    expect(loadGame(JSON.stringify(raw)).ok).toBe(false);
  });

  it('checkpoints harvest deltas without committing cafe earnings or used stock', () => {
    const checkpoint = watered();
    const midDay = { ...checkpoint, leaves: checkpoint.leaves + 10, stock: { ...checkpoint.stock, mushroom: 20 } };
    const harvested = tendCrop(midDay, 0, 301000);
    const saved = gardenCheckpoint(checkpoint, midDay, harvested);
    expect(saved.leaves).toBe(checkpoint.leaves);
    expect(saved.stock.mushroom).toBe(checkpoint.stock.mushroom + 4);
    expect(saved.garden.plots[0]).toBeNull();
    expect(harvested.stock.mushroom).toBe(24);
    expect(tendCrop(saved, 0, 999999)).toBe(saved);
  });
});
