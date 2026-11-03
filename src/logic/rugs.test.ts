import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { buildLayout, movePiece, noneStored, pieceAt, placePiece, placeProblem, removePiece, type Furniture } from './furniture';
import { buyFurniture } from './shop';
import { loadGame, saveGame } from './save';

const stocked = (): Furniture => ({ placed: [], stored: { ...noneStored(), table: 2, treeRug: 2, tartanRug: 1 } });
const at = { x: 4, y: 5 };

describe('rugs', () => {
  it('goes under furniture in either placement order without changing the walking layout', () => {
    const base = placePiece(stocked(), 'table', at);
    const under = placePiece(base, 'treeRug', at);
    expect(buildLayout(under)).toEqual(buildLayout(base));
    const rugFirst = placePiece(stocked(), 'treeRug', at);
    expect(buildLayout(rugFirst)).toEqual(buildLayout(stocked()));
    expect(placePiece(rugFirst, 'table', at).placed).toHaveLength(2);
    expect(pieceAt(under, at)?.design).toBe('table');
    expect(pieceAt(under, { x: 5, y: 6 })?.design).toBe('treeRug');
  });

  it('moves and puts away only the selected layer when both share an anchor', () => {
    const both = placePiece(placePiece(stocked(), 'treeRug', at), 'table', at);
    const moved = movePiece(both, at, { x: 8, y: 7 }, undefined, 'treeRug');
    expect(pieceAt(moved, at)?.design).toBe('table');
    expect(pieceAt(moved, { x: 9, y: 8 })?.design).toBe('treeRug');
    const tableMoved = movePiece(both, at, { x: 6, y: 5 });
    expect(pieceAt(tableMoved, at)?.design).toBe('treeRug');
    const stored = removePiece(both, at, 'treeRug');
    expect(stored.placed).toEqual([{ design: 'table', ...at }]);
    expect(stored.stored.treeRug).toBe(2);
    expect(both.placed).toHaveLength(2);
  });

  it('checks the entire footprint and refuses another rug on the same floor layer', () => {
    const rug = placePiece(stocked(), 'treeRug', at);
    expect(placeProblem(rug, 'tartanRug', { x: 5, y: 6 })).not.toBeNull();
    for (const spot of [{ x: 22, y: 5 }, { x: 3, y: 10 }, { x: 18, y: 1 }, { x: 18, y: 10 }]) {
      expect(placeProblem(stocked(), 'treeRug', spot)).not.toBeNull();
    }
  });

  it('purchases copies and saves a rug beneath a table, with defaults for older saves', () => {
    const fresh = createNewGame();
    const bought = buyFurniture({ ...fresh, leaves: 35 }, 'treeRug');
    expect(bought.leaves).toBe(0);
    expect(bought.furniture.stored.treeRug).toBe(1);
    const state = { ...bought, furniture: placePiece(bought.furniture, 'treeRug', at) };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
    const file = JSON.parse(saveGame(fresh));
    file.version = 9;
    for (const key of ['snowflakeRug', 'treeRug', 'floralRug', 'tartanRug']) delete file.state.furniture.stored[key];
    expect(loadGame(JSON.stringify(file))).toEqual({ ok: true, state: fresh });
  });
});
