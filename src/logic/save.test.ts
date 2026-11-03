import { describe, expect, it } from 'vitest';
import { hire } from './employees';
import { placePiece, storePieces } from './furniture';
import { createNewGame, earnLeaves, startNextDay, type GameState } from './gameState';
import { loadGame, saveGame, SAVE_VERSION } from './save';
import { CAFE_ROOM } from '../data/cafeRoom';
import { paintRoom } from './roomPainter';
import { addIngredient, addUpgrade } from './shop';

/** A game some way in: everything that can change has changed. */
function playedGame(): GameState {
  let state = startNextDay(startNextDay(earnLeaves(createNewGame(), 120)));
  state = addUpgrade(addIngredient(state, 'tuna'), 'toaster');
  state = { ...state, stock: { ...state.stock, tuna: 7, jam: 2 }, foragedToday: ['mushroom-1'], leavesPickedToday: 4 };
  state = hire(state, 'cleaner');
  const furniture = storePieces(state.furniture, 'chair', 2);
  return { ...state, furniture };
}

/** Saved text with its state edited, for testing old or damaged saves. */
function savedWith(edit: (state: Record<string, unknown>) => void, version = SAVE_VERSION): string {
  const state = JSON.parse(JSON.stringify(playedGame())) as Record<string, unknown>;
  edit(state);
  return JSON.stringify({ version, state });
}

const loaded = (text: string): GameState => {
  const result = loadGame(text);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('saving and loading', () => {
  it('retains a painted room and checks furniture against that room', () => {
    const fresh = createNewGame();
    // The former door becomes floor, so a table can stand there only in
    // this player's room. Loading must not use the default room's spots.
    const room = paintRoom(paintRoom(fresh.room, { x: 17, y: 11 }, 'D'), { x: 18, y: 11 }, '.');
    const furniture = { ...fresh.furniture, placed: [{ design: 'table' as const, x: 18, y: 11 }] };
    const state = { ...fresh, room, furniture };
    expect(loaded(saveGame(state))).toEqual(state);
    expect(createNewGame().room).toEqual(CAFE_ROOM);
  });

  it('gives older saves the default room and refuses malformed rooms', () => {
    expect(loaded(savedWith(s => delete s.room, 6)).room).toEqual(CAFE_ROOM);
    expect(loadGame(savedWith(s => { s.room = ['broken']; })).ok).toBe(false);
    expect(loadGame(savedWith(s => { s.room = paintRoom(CAFE_ROOM, { x: 18, y: 11 }, '.'); })).ok).toBe(false);
  });
  it('gives back exactly the same state', () => {
    expect(loaded(saveGame(playedGame()))).toEqual(playedGame());
    expect(loaded(saveGame(createNewGame()))).toEqual(createNewGame());
  });

  it('records the version', () => {
    expect(JSON.parse(saveGame(createNewGame())).version).toBe(SAVE_VERSION);
  });
});

describe('older saves', () => {
  it('get new-game defaults for fields added since', () => {
    const state = loaded(savedWith((s) => delete s.employees));
    expect(state.employees).toEqual([]);
    expect(state.leaves).toBe(120);
  });

  it('count as past the tutorial (they were made before it existed)', () => {
    expect(loaded(savedWith((s) => delete s.tutorial)).tutorial).toBe('done');
    expect(loaded(savedWith((s) => (s.tutorial = 'juggling'))).tutorial).toBe('done');
    expect(loaded(savedWith((s) => (s.tutorial = 'map'))).tutorial).toBe('map');
  });

  it('get default stock for ingredients added since', () => {
    const state = loaded(savedWith((s) => delete (s.stock as Record<string, number>).bread));
    expect(state.stock.bread).toBe(createNewGame().stock.bread);
    expect(state.stock.tuna).toBe(7);
  });

  it('drop ids the game no longer has', () => {
    const state = loaded(
      savedWith((s) => {
        s.ingredients = [...(s.ingredients as string[]), 'oldCheese'];
        s.employees = ['cleaner', 'juggler'];
        (s.stock as Record<string, number>).oldCheese = 5;
      }),
    );
    expect(state.ingredients).toEqual(playedGame().ingredients);
    expect(state.employees).toEqual(['cleaner']);
    expect('oldCheese' in state.stock).toBe(false);
  });

  it('move furniture into storage if it no longer fits the room', () => {
    // A table on a wall: e.g. the room changed in an update.
    const state = loaded(
      savedWith((s) => {
        const f = s.furniture as { placed: unknown[] };
        f.placed = [...f.placed, { design: 'table', x: 0, y: 0 }];
      }),
    );
    expect(state.furniture.placed).toEqual([]);
    expect(state.furniture.stored).toMatchObject({ table: 5, chair: 10 }); // 4+1 tables, 8 placed + 2 stored chairs
  });

  it('version 1: furniture by kind (table, chair) is the plain designs', () => {
    const state = loaded(
      savedWith((s) => {
        const f = s.furniture as { placed: { design?: string; kind?: string }[]; stored: Record<string, number> };
        f.placed = f.placed.map(({ design, ...rest }) => ({ ...rest, kind: design }));
        f.stored = { table: f.stored.table, chair: f.stored.chair };
      }, 1),
    );
    expect(state.furniture).toEqual(playedGame().furniture);
  });

  it('move a wall decoration that is off the back wall into storage', () => {
    const state = loaded(
      savedWith((s) => {
        const f = s.furniture as { placed: unknown[] };
        f.placed = [...f.placed, { design: 'wreath', x: 2, y: 0 }]; // a window
      }),
    );
    expect(state.furniture.placed).toEqual([]);
    expect(state.furniture.stored.wreath).toBe(1);
  });

  it('keep a valid rearranged cafe as it is', () => {
    const before = playedGame();
    // A stored chair just above the table at (5, 5), touching only that table.
    const moved = { ...before, furniture: placePiece(before.furniture, 'chair', { x: 5, y: 4 }) };
    expect(loaded(saveGame(moved)).furniture).toEqual(moved.furniture);
  });
});

describe('saves that are refused', () => {
  it.each([
    ['not JSON', 'definitely not json'],
    ['not a save', '[1, 2, 3]'],
    ['no state', JSON.stringify({ version: 1 })],
  ])('%s', (_name, text) => {
    expect(loadGame(text)).toEqual({ ok: false, reason: "The save file isn't readable." });
  });

  it('from a newer version', () => {
    expect(loadGame(savedWith(() => {}, SAVE_VERSION + 1))).toEqual({
      ok: false,
      reason: 'The save is from a newer version of the game.',
    });
  });

  it.each([
    ['leaves', (s: Record<string, unknown>) => (s.leaves = -5)],
    ['day', (s: Record<string, unknown>) => (s.day = 'three')],
    ['stock.jam', (s: Record<string, unknown>) => ((s.stock as Record<string, unknown>).jam = 1.5)],
    ['ingredients', (s: Record<string, unknown>) => (s.ingredients = 'bread')],
    ['furniture.placed', (s: Record<string, unknown>) => ((s.furniture as { placed: unknown[] }).placed = [{ kind: 'sofa', x: 1, y: 1 }])],
  ])('with a damaged %s', (name, edit) => {
    expect(loadGame(savedWith(edit))).toEqual({ ok: false, reason: `The save is damaged (${name}).` });
  });
});
