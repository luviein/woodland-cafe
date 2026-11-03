import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { buildLayout, movePiece, noneStored, pieceAt, placePiece, placeProblem, removePiece, rugFrame, snapPlacement, rotateRug, validPiecePosition, type Furniture } from './furniture';
import { RUG_ART } from '../art/sprites/rugs';
import { buyFurniture } from './shop';
import { loadGame, saveGame } from './save';

const stocked = (): Furniture => ({ placed: [], stored: { ...noneStored(), table: 2, treeRug: 2, tartanRug: 1 } });
const at = { x: 4, y: 5 };

describe('rugs', () => {
  it('rotates displayed pixels without moving the rug or furniture', () => {
    for (let variant = 0; variant < 16; variant++) {
      const rug = { design: 'treeRug' as const, x: 4.5, y: 4.5, rugRotation: variant % 4, rugFlipX: !!(variant & 4), rugFlipY: !!(variant & 8) };
      const table = { design: 'table' as const, x: 5, y: 5 };
      const furniture = { ...stocked(), placed: [rug, table] };
      const before = RUG_ART.treeRug.frames[rugFrame(rug)];
      const result = rotateRug(furniture, rug, rug.design);
      const pixels = RUG_ART.treeRug.frames[rugFrame(result.placed[0])];
      const expected = Array.from({ length: 48 }, (_, y) => Array.from({ length: 48 }, (_, x) => before[47 - x][y]).join(''));
      expect(pixels).toEqual(expected);
      expect(result.placed[0]).toMatchObject({ x: 4.5, y: 4.5 });
      expect(result.placed[1]).toBe(table);
      expect(buildLayout(result)).toEqual(buildLayout(furniture));
    }
  });

  it('saves rug orientation and defaults older placements without transforms', () => {
    const furniture = placePiece(stocked(), 'treeRug', { x: 4.5, y: 4.5 });
    let oriented = rotateRug(furniture, { x: 4.5, y: 4.5 }, 'treeRug');
    oriented = { ...oriented, placed: oriented.placed.map(piece => ({ ...piece, rugFlipX: true })) };
    const state = { ...createNewGame(), furniture: oriented };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
    const old = { ...state, furniture };
    expect(loadGame(JSON.stringify({ version: 11, state: old }))).toEqual({ ok: true, state: old });
    for (const bad of [{ rugRotation: 4 }, { rugFlipX: 'true' }]) {
      const broken = { ...state, furniture: { ...oriented, placed: [{ ...oriented.placed[0], ...bad }] } };
      expect(loadGame(JSON.stringify({ version: 12, state: broken })).ok).toBe(false);
    }
  });
  it('centres rugs beneath single-tile tables and preserves quarter-tile placement in saves', () => {
    expect(snapPlacement('treeRug', { x: 4.49, y: 4.54 })).toEqual({ x: 4.5, y: 4.5 });
    expect(snapPlacement('table', { x: 4.49, y: 4.54 })).toEqual({ x: 4, y: 5 });
    const furniture = placePiece(placePiece(stocked(), 'treeRug', { x: 4.5, y: 4.5 }), 'table', { x: 5, y: 5 });
    expect(furniture.placed[0].x + 1).toBe(furniture.placed[1].x + 0.5);
    expect(furniture.placed[0].y + 1).toBe(furniture.placed[1].y + 0.5);
    const moved = movePiece(furniture, { x: 4.5, y: 4.5 }, { x: 4.75, y: 4.5 }, undefined, 'treeRug');
    expect(moved.placed[1]).toEqual(furniture.placed[1]);
    const state = { ...createNewGame(), furniture: moved };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
    expect(validPiecePosition('table', 4.5, 4.5)).toBe(false);
    expect(validPiecePosition('treeRug', 4.1, 4.5)).toBe(false);
    expect(validPiecePosition('treeRug', Infinity, 4)).toBe(false);
    expect(placeProblem(stocked(), 'treeRug', { x: 21.25, y: 5 })).not.toBeNull();
  });
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
