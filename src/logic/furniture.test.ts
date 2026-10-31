import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FurnitureKind } from '../data/furniture';
import {
  buildLayout,
  CAFE_ROOM,
  furnishedRows,
  pieceAt,
  placePiece,
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
