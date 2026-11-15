import { expect, it } from 'vitest';
import { createNewGame, type GameState } from './gameState';
import { emptyMuseum, museumColumns, museumDoor, museumLayout, canPlaceMuseumCase, placeMuseumCase,
  buyMuseumCase, expandMuseum, displayMuseumCrop, storeMuseumCase, validMuseum } from './museum';
import { findPathNextTo } from './pathfinding';
import { loadGame, saveGame } from './save';

it('starts with one free case and rejects overlap, aisles, walls and nonexistent moves', () => {
  const state = createNewGame();
  expect(state.museum).toEqual(emptyMuseum());
  const placed = placeMuseumCase(state, { x: 2, y: 2 });
  expect(placed.museum.storedCases).toBe(0);
  expect(placed.museum.cases).toEqual([{ id: 1, x: 2, y: 2, exhibit: null }]);
  expect(placeMuseumCase(placed, { x: 3, y: 2 })).toBe(placed);
  for (const at of [{ x: 2, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: -1, y: 2 }, { x: 12, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 7 }, { x: 1.5, y: 2 }]) {
    expect(canPlaceMuseumCase(placed.museum, at)).toBe(false);
  }
  expect(placeMuseumCase(placed, { x: 4, y: 2 }, 99)).toBe(placed);
  const moved = placeMuseumCase(placed, { x: 4, y: 2 }, 1);
  expect(moved.museum.cases[0]).toEqual({ id: 1, x: 4, y: 2, exhibit: null });
  expect(moved.museum.nextCaseId).toBe(2);
  expect(state.museum.cases).toEqual([]);
});

it('rejects a case that encloses a floor tile and keeps every case reachable from the entrance', () => {
  let state = { ...createNewGame(), museum: { ...emptyMuseum(), storedCases: 4 } };
  for (const at of [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 3 }]) state = placeMuseumCase(state, at);
  expect(canPlaceMuseumCase(state.museum, { x: 0, y: 2 })).toBe(false);
  expect(placeMuseumCase(state, { x: 0, y: 2 })).toBe(state);
  for (const item of state.museum.cases) expect(findPathNextTo(museumLayout(state.museum), museumDoor(state.museum), item)).not.toBeNull();
});

it('charges Leaves for cases and two expansions while retaining physical case positions', () => {
  let state = { ...createNewGame(), leaves: 625 };
  state = buyMuseumCase(state);
  expect(state.leaves).toBe(600);
  expect(state.museum.storedCases).toBe(2);
  state = placeMuseumCase(state, { x: 2, y: 3 });
  const physicalX = state.museum.cases[0].x * 24 - museumColumns(state.museum) * 12;
  state = expandMuseum(state);
  expect(state.leaves).toBe(400);
  expect(museumColumns(state.museum)).toBe(16);
  state = expandMuseum(state);
  expect(state.leaves).toBe(0);
  expect(museumColumns(state.museum)).toBe(20);
  expect(state.museum.cases[0].x * 24 - museumColumns(state.museum) * 12).toBe(physicalX);
  expect(expandMuseum({ ...state, leaves: 999 })).toEqual({ ...state, leaves: 999 });
  expect(buyMuseumCase(state)).toBe(state);
  const poor = { ...createNewGame(), leaves: 199 };
  expect(expandMuseum(poor)).toBe(poor);
});

it('keeps case choices independent, requires clearing before reassignment and retains records when storing', () => {
  let state: GameState = { ...createNewGame(), cropCollection: ['golden.mushroom'], museum: { ...emptyMuseum(), storedCases: 2 } };
  state = placeMuseumCase(placeMuseumCase(state, { x: 2, y: 2 }), { x: 8, y: 2 });
  expect(displayMuseumCrop(state, 1, 'christmas.tomato')).toBe(state);
  state = displayMuseumCrop(state, 1, 'golden.mushroom');
  expect(displayMuseumCrop(state, 2, 'golden.mushroom')).toBe(state);
  expect(displayMuseumCrop(state, 2, null)).toBe(state);
  expect(state.museum.cases.map(item => item.exhibit)).toEqual(['golden.mushroom', null]);
  state = displayMuseumCrop(state, 1, null);
  state = displayMuseumCrop(state, 2, 'golden.mushroom');
  expect(state.museum.cases.map(item => item.exhibit)).toEqual([null, 'golden.mushroom']);
  expect(displayMuseumCrop(state, 1, null)).toBe(state);
  expect(displayMuseumCrop(state, 2, null).museum.cases.map(item => item.exhibit)).toEqual([null, null]);
  const stored = storeMuseumCase(state, 2);
  expect(stored.museum.storedCases).toBe(1);
  expect(stored.cropCollection).toEqual(['golden.mushroom']);
  expect(stored.garden).toEqual(state.garden);
  expect(stored.leaves).toBe(state.leaves);
});

it('saves museum exhibits, gives old saves a free case and rejects damaged room data', () => {
  const fresh = { ...createNewGame(), cropCollection: ['golden.mushroom'] as const };
  const state = displayMuseumCrop(placeMuseumCase(fresh, { x: 2, y: 2 }), 1, 'golden.mushroom');
  expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  const { museum: _museum, ...old } = fresh;
  expect(loadGame(JSON.stringify({ version: 16, state: old }))).toEqual({ ok: true, state: fresh });
  const cases = state.museum.cases;
  for (const museum of [{ ...state.museum, level: 3 }, { ...state.museum, storedCases: -1 }, { ...state.museum, nextCaseId: 1 },
    { ...state.museum, cases: [...cases, ...cases] }, { ...state.museum, cases: [{ ...cases[0], x: 5 }] },
    { ...state.museum, cases: [{ ...cases[0], exhibit: 'ordinary.tomato' }] }]) {
    expect(validMuseum(museum)).toBe(false);
    expect(loadGame(JSON.stringify({ version: 17, state: { ...state, museum } })).ok).toBe(false);
  }
  expect(loadGame(saveGame({ ...state, cropCollection: [] }))).toEqual({ ok: true, state: {
    ...state, cropCollection: [], museum: { ...state.museum, cases: [{ ...cases[0], exhibit: null }] },
  } });
});
