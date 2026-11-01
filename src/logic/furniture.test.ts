import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { DesignId } from '../data/furniture';
import {
  buildLayout,
  chairFacing,
  isWallSpot,
  CAFE_ROOM,
  furnishedRows,
  noneStored,
  movePiece,
  moveProblem,
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
      { design: 'chair', x: 1, y: 0 },
      { design: 'table', x: 2, y: 0 },
      { design: 'chair', x: 3, y: 0 },
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
    expect(furniture.placed.filter((p) => p.design === 'table')).toHaveLength(4);
    expect(furniture.placed.filter((p) => p.design === 'chair')).toHaveLength(8);
    expect(furniture.stored).toEqual(counts(0, 0));
  });

  it('builds the same floor as the hand-written layout', () => {
    expect(buildLayout(startingFurniture())).toEqual(parseLayout(CAFE_LAYOUT));
  });

  it('an empty cafe is still a valid layout (just no seats)', () => {
    expect(buildLayout({ placed: [], stored: noneStored() }).tables).toEqual([]);
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
/** Storage with this many plain tables and chairs, none of anything else. */
const counts = (table: number, chair: number) => ({ ...noneStored(), table, chair });
const empty = (table = 2, chair = 4): Furniture => ({ placed: [], stored: counts(table, chair) });
/** Places pieces in order, failing the test if any is refused. */
const build = (pieces: [DesignId, number, number][], room = ROOM, start = empty()): Furniture =>
  pieces.reduce((f, [design, x, y]) => placePiece(f, design, { x, y }, room), start);

describe('placing furniture', () => {
  it('moves a piece from storage into the cafe', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    expect(f.placed).toEqual([
      { design: 'table', x: 2, y: 3 },
      { design: 'chair', x: 1, y: 3 },
    ]);
    expect(f.stored).toEqual(counts(1, 3));
    expect(pieceAt(f, { x: 1, y: 3 })?.design).toBe('chair');
  });

  it('needs one in storage', () => {
    expect(placeProblem(empty(0), 'table', { x: 2, y: 3 }, ROOM)).toBe('No Table in storage');
  });

  it('only on open floor: not walls, the counter, or the door / P / O / queue spots', () => {
    for (const [x, y] of [[0, 3], [2, 1], [3, 5], [1, 1], [4, 2], [5, 2]]) {
      expect(placeProblem(empty(), 'table', { x, y }, ROOM), `${x},${y}`).toBe('Keep the door, counter and queue clear');
    }
    const f = build([['table', 2, 3]]);
    expect(placeProblem(f, 'table', { x: 2, y: 3 }, ROOM)).toBe('Something is already there');
  });

  it('a chair can stand alone (unused), but not at two tables', () => {
    expect(placeProblem(empty(), 'chair', { x: 2, y: 3 }, ROOM)).toBeNull();
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
    expect(() => placePiece(empty(), 'chair', { x: 0, y: 3 }, ROOM)).toThrow(/Keep the door/);
  });
});

describe('removing furniture', () => {
  it('puts a chair back into storage', () => {
    const f = removePiece(build([['table', 2, 3], ['chair', 1, 3]]), { x: 1, y: 3 });
    expect(f.placed).toEqual([{ design: 'table', x: 2, y: 3 }]);
    expect(f.stored).toEqual(counts(1, 4));
  });

  it('a table goes on its own: its chairs stay where they are', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['chair', 3, 3]]);
    const after = removePiece(f, { x: 2, y: 3 });
    expect(after.placed).toEqual([
      { design: 'chair', x: 1, y: 3 },
      { design: 'chair', x: 3, y: 3 },
    ]);
    expect(after.stored).toEqual(counts(2, f.stored.chair));
  });

  it('an empty tile changes nothing', () => {
    const f = build([['table', 2, 3]]);
    expect(removePiece(f, { x: 4, y: 4 })).toBe(f);
  });

  it('bought pieces go into storage', () => {
    expect(storePieces(empty(0, 0), 'chair', 2).stored).toEqual(counts(0, 2));
  });
});

describe('dragging furniture', () => {
  const at = (x: number, y: number) => ({ x, y });

  it('moves a chair to another side of its table, storage untouched', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    const after = movePiece(f, at(1, 3), at(2, 4), ROOM);
    expect(after.placed).toEqual([
      { design: 'table', x: 2, y: 3 },
      { design: 'chair', x: 2, y: 4 },
    ]);
    expect(after.stored).toEqual(f.stored);
  });

  it('a table moves on its own; chairs still beside it stay', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3]]);
    const after = movePiece(f, at(2, 3), at(1, 4), ROOM);
    expect(after.placed).toEqual([
      { design: 'table', x: 1, y: 4 },
      { design: 'chair', x: 1, y: 3 },
    ]);
    expect(after.stored).toEqual(f.stored);
  });

  it('chairs stay where they are when their table moves away', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['chair', 3, 3]]);
    const after = movePiece(f, at(2, 3), at(4, 4), ROOM);
    expect(after.placed).toEqual([
      { design: 'table', x: 4, y: 4 },
      { design: 'chair', x: 1, y: 3 },
      { design: 'chair', x: 3, y: 3 },
    ]);
    expect(after.stored).toEqual(f.stored);
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
    expect(moveProblem(f, at(1, 3), at(1, 4), ROOM)).toBeNull(); // away from tables: fine, just unused
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

describe('designs and decorations (GAME_DESIGN.md §5.10)', () => {
  const stocked = (): Furniture => ({ placed: [], stored: { ...counts(2, 4), chairWithBow: 2, tableAndCandle: 1, christmasTree: 1, wreath: 2 } });

  it('a Christmas table and chair seat customers like plain ones', () => {
    const f = build([['tableAndCandle', 2, 3], ['chairWithBow', 1, 3]], ROOM, stocked());
    expect(buildLayout(f, ROOM).tables).toEqual([{ id: 'table-0', position: { x: 2, y: 3 }, seats: [{ x: 1, y: 3 }] }]);
  });

  it('a floor decoration blocks its tile but seats nobody', () => {
    const f = build([['christmasTree', 2, 3]], ROOM, stocked());
    const layout = buildLayout(f, ROOM);
    expect(layout.tiles[3][2]).toBe('decor');
    expect(layout.tables).toEqual([]);
    // A chair next to a tree isn't at a table: allowed, nobody sits there.
    expect(placeProblem(f, 'chair', { x: 1, y: 3 }, ROOM)).toBeNull();
  });

  it('a floor decoration follows the floor rules', () => {
    expect(placeProblem(stocked(), 'christmasTree', { x: 1, y: 1 }, ROOM)).toBe('Keep the door, counter and queue clear');
    expect(placeProblem(stocked(), 'christmasTree', { x: 3, y: 3 }, NARROW)).toBe('That would block the way');
  });

  it('wall decorations hang on the back wall only, between the windows and corners', () => {
    const wide = ['W'.repeat(12), ...ROOM.slice(1).map((r) => r + '.....' )];
    expect(isWallSpot(wide, { x: 1, y: 0 })).toBe(true);
    expect(isWallSpot(wide, { x: 0, y: 0 })).toBe(false); // corner
    expect(isWallSpot(wide, { x: 11, y: 0 })).toBe(false); // corner
    expect(isWallSpot(wide, { x: 2, y: 0 })).toBe(false); // a window (every 5th from 2)
    expect(isWallSpot(wide, { x: 7, y: 0 })).toBe(false);
    expect(isWallSpot(wide, { x: 1, y: 5 })).toBe(false); // the front wall
    expect(placeProblem(stocked(), 'wreath', { x: 2, y: 3 }, ROOM)).toBe('Hang it on the back wall, between the windows');
  });

  it("a wall decoration doesn't take floor space or count as furniture on the floor", () => {
    const f = build([['wreath', 1, 0], ['wreath', 3, 0]], ROOM, stocked());
    expect(f.placed).toHaveLength(2);
    expect(furnishedRows(ROOM, f.placed)).toEqual(ROOM);
    expect(moveProblem(f, { x: 1, y: 0 }, { x: 2, y: 3 }, ROOM)).toBe('Hang it on the back wall, between the windows');
    expect(moveProblem(f, { x: 1, y: 0 }, { x: 4, y: 0 }, ROOM)).toBeNull();
  });

  it('a chair faces its table: left or right beside it, front above or below it or with none', () => {
    const f = build([['table', 2, 3], ['chair', 1, 3], ['chair', 3, 3]], ROOM);
    const below = build([['table', 2, 3], ['chair', 2, 4]], ROOM);
    expect(chairFacing(f.placed, { x: 1, y: 3 })).toBe('right');
    expect(chairFacing(f.placed, { x: 3, y: 3 })).toBe('left');
    expect(chairFacing(below.placed, { x: 2, y: 4 })).toBe('front');
    expect(chairFacing(f.placed, { x: 5, y: 4 })).toBe('front');
  });
});
