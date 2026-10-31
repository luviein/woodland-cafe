import { describe, expect, it } from 'vitest';
import { hire } from './employees';
import { placePiece, storePieces } from './furniture';
import { createNewGame, earnLeaves, startNextDay, type GameState } from './gameState';
import { loadGame, saveGame, SAVE_VERSION } from './save';
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
        f.placed = [...f.placed, { kind: 'table', x: 0, y: 0 }];
      }),
    );
    expect(state.furniture.placed).toEqual([]);
    expect(state.furniture.stored).toEqual({ table: 5, chair: 10 }); // 4+1 tables, 8 placed + 2 stored chairs
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
