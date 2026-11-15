import { expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { COLLECTION_IDS } from './cropCollection';
import { canClaimMilestone, claimMilestone, equipPlayerTitle, milestoneProgress } from './journal';
import { loadGame, saveGame } from './save';

it('counts existing discoveries and awards each milestone once without spending crops', () => {
  const fresh = createNewGame();
  expect(claimMilestone(fresh, 'firstDiscovery')).toBe(fresh);
  expect(equipPlayerTitle(fresh, 'masterCollector')).toBe(fresh);
  const discovered = { ...fresh, cropCollection: [...COLLECTION_IDS] };
  let state = claimMilestone(discovered, 'firstDiscovery');
  expect(state.leaves).toBe(25);
  expect(claimMilestone(state, 'firstDiscovery')).toBe(state);
  state = claimMilestone(state, 'goldenFind');
  expect(state.leaves).toBe(75);
  state = claimMilestone(state, 'foundingCollection');
  expect(state.museum.storedCases).toBe(fresh.museum.storedCases + 1);
  expect(state.journal.equippedTitle).toBeNull();
  expect(claimMilestone(state, 'foundingCollection')).toBe(state);
  expect(state.garden).toBe(fresh.garden);
  expect(discovered.journal.claimed).toEqual([]);
  state = equipPlayerTitle(state, 'masterCollector');
  expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  expect(equipPlayerTitle(state, null).journal.equippedTitle).toBeNull();
});

it('requires the right discoveries and rejects reward overflow atomically', () => {
  const seasonal = { ...createNewGame(), cropCollection: ['christmas.mushroom'] as const };
  expect(canClaimMilestone(seasonal, 'firstDiscovery')).toBe(true);
  expect(canClaimMilestone(seasonal, 'goldenFind')).toBe(false);
  expect(milestoneProgress(seasonal, 'foundingCollection')).toEqual({ current: 1, target: 6 });
  const rich = { ...seasonal, leaves: Number.MAX_SAFE_INTEGER - 24 };
  expect(claimMilestone(rich, 'firstDiscovery')).toBe(rich);
  const full = { ...seasonal, cropCollection: [...COLLECTION_IDS], museum: { ...seasonal.museum, storedCases: Number.MAX_SAFE_INTEGER } };
  expect(claimMilestone(full, 'foundingCollection')).toBe(full);
});

it('migrates old saves without awarding rewards and refuses malformed title receipts', () => {
  const state = { ...createNewGame(), leaves: 91, cropCollection: [...COLLECTION_IDS] };
  const { journal: _journal, ...legacy } = state;
  expect(loadGame(JSON.stringify({ version: 19, state: legacy }))).toEqual({ ok: true, state });
  for (const journal of [null, { claimed: [], equippedTitle: 'masterCollector' },
    { claimed: ['firstDiscovery', 'firstDiscovery'], equippedTitle: null },
    { claimed: ['unknown'], equippedTitle: null }]) {
    expect(loadGame(saveGame({ ...state, journal } as unknown as typeof state)).ok).toBe(false);
  }
});
