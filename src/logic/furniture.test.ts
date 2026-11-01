import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FurnitureKind } from '../data/furniture';
import {
  buildLayout,
  CAFE_ROOM,
  furnishedRows,
  movePiece,
  moveProblem,
  pieceAt,
  placePiece,
  strandedChairs,
  placeProblem,
  removePiece,
  splitLayout,
  startingFurniture,
  storePieces,
  type Furniture,
} from './furniture';
import { parseLayout } from './layout';

describe('splitLayout', () => {
  it('takes the tables and chairs out of the rows, leaving floor', () => {
    const { room, placed } = splitLayout(['WSTSW', 'W.D.W']);
    expect(room).toEqual(['W...W', 'W.D.W']);
    expect(placed).toEqual([
      { kind: 'chair', x: 1, y: 0 },
      { kind: 'table', x: 2, y: 0 },
      { kind: 'chair', x: 3, y: 0 },
    ]);
  });

  it('and furnishedRows puts them back exactly', () => {
    const { room, placed } = splitLayout(CAFE_LAYOUT);
    expect(furnishedRows(room, placed)).toEqual([...CAFE_LAYOUT]);
  });
});

describe('the cafe', () => {
  it('the room has no furniture in it', () => {
    expect(CAFE_ROOM.join('')).not.toMatch(/[TS]/);
  });

  it("starts with cafeLayout.ts's furniture placed and none stored", () => {
    const furniture = startingFurniture();
    expect(furniture.placed.filter((p) => p.kind === 'table')).toHaveLength(4);
    expect(furniture.placed.filter((p) => p.kind === 'chair')).toHaveLength(8);
    expect(furniture.stored).toEqual({ table: 0, chair: 0 });
  });

  it('builds the same floor as the hand-written layout', () => {
    expect(buildLayout(startingFurniture())).toEqual(parseLayout(CAFE_LAYOUT));
  });

  it('an empty cafe is still a valid layout (just no seats)', () => {
    expect(buildLayout({ placed: [], stored: { table: 0, chair: 0 } }).tables).toEqual([]);
  });
});

// A small open room: counter spot P, order spot O, one queue spot, door at the bottom.
const ROOM = [
  'WWWWWWW', //
  'WPCCC.W',
  'W...O1W',
  'W.....W',
  'W.....W',
  'WWWDWWW',
];
// The same room, but the top and bottom halves only meet through (3, 3).
const NARROW = [
  'WWWWWWW', //
  'WPCCC.W',
  'W...O1W',
  'WWW.WWW',
  'W.....W',
  'WWWDWWW',
];
const empty = (table = 2, chair = 4): Furniture => ({ placed: [], stored: { table, chair } });
/** Places pieces in order, failing the test if any is refused. */
const build = (pieces: [FurnitureKind, number, number][], room = ROOM, start = empty()): Furniture =>
  pieces.reduce((f, [kind, x, y]) => placePiece(f, kind, { x, y }, room), start);

describe('placing furniture', () => {
  it('moves a piece from storage into the cafe', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    expect(f.placed).toEqual([
      { kind: 'table', x: 2, y: 3 },
      { kind: 'chair', x: 1, y: 3 },
    ]);
    expect(f.stored).toEqual({ table: 1, chair: 3 });
    expect(pieceAt(f, { x: 1, y: 3 })?.kind).toBe('chair');
  });

  it('needs one in storage', () => {
    expect(placeProblem(empty(0), 'table', { x: 2, y: 3 }, ROOM)).toBe('No tables in storage');
  });

  it('only on open floor: not walls, the counter, or the door / P / O / queue spots', () => {
    for (const [x, y] of [[0, 3], [2, 1], [3, 5], [1, 1], [4, 2], [5, 2]]) {
      expect(placeProblem(empty(), 'table', { x, y }, ROOM), `${x},${y}`).toBe('Keep the door, counter and queue clear');
    }
    const f = build([['table', 2, 3]]);
    expect(placeProblem(f, 'table', { x: 2, y: 3 }, ROOM)).toBe('Something is already there');
  });

  it('a chair needs exactly one table next to it', () => {
    expect(placeProblem(empty(), 'chair', { x: 2, y: 3 }, ROOM)).toBe('A chair needs a table next to it');
    const twoTables = build([['table', 1, 3], ['table', 3, 3]]);
    expect(placeProblem(twoTables, 'chair', { x: 2, y: 3 }, ROOM)).toBe('A chair can only be at one table');
  });

  it("a table can't make a chair touch two tables", () => {
    const f = build([['table', 1, 3], ['chair', 2, 3]]);
    expect(placeProblem(f, 'table', { x: 3, y: 3 }, ROOM)).toBe('A chair can only be at one table');
  });

  it("can't cut the floor in two", () => {
    expect(placeProblem(empty(), 'table', { x: 3, y: 3 }, NARROW)).toBe('That would block the way');
    expect(placeProblem(empty(), 'table', { x: 1, y: 4 }, NARROW)).toBeNull();
  });

  it('every table and chair keeps floor next to it', () => {
    // A table in the corner with chairs on both open sides: nobody could reach it to clean.
    const f = build([['table', 1, 4], ['chair', 2, 4]]);
    expect(placeProblem(f, 'chair', { x: 1, y: 3 }, ROOM)).toBe('That would block the way');
  });

  it('placePiece refuses what placeProblem refuses', () => {
    expect(() => placePiece(empty(), 'chair', { x: 2, y: 3 }, ROOM)).toThrow(/needs a table/);
  });
});

describe('removing furniture', () => {
  it('puts a chair back into storage', () => {
    const f = removePiece(build([['table', 2, 3], ['chair', 1, 3]]), { x: 1, y: 3 });
    expect(f.placed).toEqual([{ kind: 'table', x: 2, y: 3 }]);
    expect(f.stored).toEqual({ table: 1, chair: 4 });
  });

  it('a table takes its chairs with it, but not chairs at other tables', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['chair', 3, 3], ['table', 5, 3], ['chair', 5, 4]]);
    const after = removePiece(f, { x: 2, y: 3 });
    expect(after.placed).toEqual([
      { kind: 'table', x: 5, y: 3 },
      { kind: 'chair', x: 5, y: 4 },
    ]);
    expect(after.stored).toEqual({ table: 1, chair: 3 });
  });

  it('an empty tile changes nothing', () => {
    const f = build([['table', 2, 3]]);
    expect(removePiece(f, { x: 4, y: 4 })).toBe(f);
  });

  it('bought pieces go into storage', () => {
    expect(storePieces(empty(0, 0), 'chair', 2).stored).toEqual({ table: 0, chair: 2 });
  });
});

describe('dragging furniture', () => {
  const at = (x: number, y: number) => ({ x, y });

  it('moves a chair to another side of its table, storage untouched', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    const after = movePiece(f, at(1, 3), at(2, 4), ROOM);
    expect(after.placed).toEqual([
      { kind: 'table', x: 2, y: 3 },
      { kind: 'chair', x: 2, y: 4 },
    ]);
    expect(after.stored).toEqual(f.stored);
  });

  it('a table moves on its own; chairs still beside it stay', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    const after = movePiece(f, at(2, 3), at(1, 4), ROOM);
    expect(after.placed).toEqual([
      { kind: 'table', x: 1, y: 4 },
      { kind: 'chair', x: 1, y: 3 },
    ]);
    expect(after.stored).toEqual(f.stored);
  });

  it('chairs a table leaves with no table go into storage', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['chair', 3, 3]]);
    expect(strandedChairs(f, at(2, 3), at(4, 4))).toBe(2);
    const after = movePiece(f, at(2, 3), at(4, 4), ROOM);
    expect(after.placed).toEqual([{ kind: 'table', x: 4, y: 4 }]);
    expect(after.stored).toEqual({ table: 1, chair: f.stored.chair + 2 });
  });

  it("a table can't land on its own chair", () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    expect(moveProblem(f, at(2, 3), at(1, 3), ROOM)).toBe('Something is already there');
  });

  it('dropping it where it was changes nothing', () => {
    const f = build([['table', 2, 3]]);
    expect(moveProblem(f, at(2, 3), at(2, 3), ROOM)).toBeNull();
    expect(movePiece(f, at(2, 3), at(2, 3), ROOM).placed).toEqual(f.placed);
  });

  it('follows the same rules as placing', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['table', 4, 3]]);
    expect(moveProblem(f, at(1, 3), at(0, 3), ROOM)).toBe('Keep the door, counter and queue clear');
    expect(moveProblem(f, at(1, 3), at(4, 3), ROOM)).toBe('Something is already there');
    expect(moveProblem(f, at(1, 3), at(1, 4), ROOM)).toBe('A chair needs a table next to it');
    // The second table next to the first table's chair.
    expect(moveProblem(f, at(4, 3), at(1, 4), ROOM)).toBe('A chair can only be at one table');
    expect(moveProblem(f, at(5, 5), at(1, 4), ROOM)).toBe('Nothing there to move');
    expect(() => movePiece(f, at(1, 3), at(0, 3), ROOM)).toThrow(/Keep the door/);
  });

  it('a moved chair still needs exactly one table', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['table', 4, 3]]);
    expect(moveProblem(f, at(1, 3), at(3, 3), ROOM)).toBe('A chair can only be at one table');
  });
});
