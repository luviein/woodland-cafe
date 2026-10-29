import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { isWalkable, parseLayout, tableById } from './layout';

// A tiny cafe to test with: one table with two seats.
const SMALL = [
  'WWWWWW', //
  'WP.1CW',
  'WSTSOW',
  'W....W',
  'WWDWWW',
];

describe('parseLayout', () => {
  const layout = parseLayout(SMALL);

  it('reads the size', () => {
    expect(layout.width).toBe(6);
    expect(layout.height).toBe(5);
  });

  it('reads tile kinds, with P and O as floor', () => {
    expect(layout.tiles[0][0]).toBe('wall');
    expect(layout.tiles[1][1]).toBe('floor'); // P
    expect(layout.tiles[1][4]).toBe('counter');
    expect(layout.tiles[2][4]).toBe('floor'); // O
    expect(layout.tiles[4][2]).toBe('door');
  });

  it('finds the special positions', () => {
    expect(layout.playerStart).toEqual({ x: 1, y: 1 });
    expect(layout.orderSpot).toEqual({ x: 4, y: 2 });
    expect(layout.door).toEqual({ x: 2, y: 4 });
  });

  it('reads counter queue digits as floor, in line order', () => {
    expect(layout.tiles[1][3]).toBe('floor');
    expect(layout.queueSpots).toEqual([{ x: 3, y: 1 }]);
    // Order comes from the digits, not from where they appear in the grid.
    const twoSpots = parseLayout(SMALL.map((r, i) => (i === 3 ? 'W2...W' : r)));
    expect(twoSpots.queueSpots).toEqual([{ x: 3, y: 1 }, { x: 1, y: 3 }]);
  });

  it('tableById finds a table, and throws on an unknown id', () => {
    expect(tableById(layout, 'table-0').position).toEqual({ x: 2, y: 2 });
    expect(() => tableById(layout, 'table-9')).toThrow(/table-9/);
  });

  it('groups seats with the table they touch', () => {
    expect(layout.tables).toEqual([
      { id: 'table-0', position: { x: 2, y: 2 }, seats: [{ x: 1, y: 2 }, { x: 3, y: 2 }] },
    ]);
  });

  it('floor and door are walkable; furniture, walls and off-grid are not', () => {
    expect(isWalkable(layout, { x: 2, y: 1 })).toBe(true);
    expect(isWalkable(layout, { x: 2, y: 4 })).toBe(true); // door
    expect(isWalkable(layout, { x: 2, y: 2 })).toBe(false); // table
    expect(isWalkable(layout, { x: 1, y: 2 })).toBe(false); // seat
    expect(isWalkable(layout, { x: 0, y: 0 })).toBe(false); // wall
    expect(isWalkable(layout, { x: -1, y: 99 })).toBe(false);
  });
});

describe('parseLayout errors', () => {
  const withRow = (y: number, row: string) => SMALL.map((r, i) => (i === y ? row : r));

  it('rejects rows of different widths', () => {
    expect(() => parseLayout(withRow(3, 'W...W'))).toThrow(/row 3/);
  });

  it('rejects unknown characters', () => {
    expect(() => parseLayout(withRow(3, 'W..?.W'))).toThrow(/'\?'/);
  });

  it('rejects a missing or duplicate door', () => {
    expect(() => parseLayout(withRow(4, 'WWWWWW'))).toThrow(/door/);
    expect(() => parseLayout(withRow(4, 'WDDWWW'))).toThrow(/door/);
  });

  it('rejects a seat that touches no table', () => {
    expect(() => parseLayout(withRow(3, 'WS...W'))).toThrow(/touches 0 tables/);
  });

  it('rejects a seat between two tables', () => {
    expect(() => parseLayout(withRow(2, 'WTSTOW'))).toThrow(/touches 2 tables/);
  });

  it('rejects a table with no seats', () => {
    expect(() => parseLayout(withRow(3, 'W...TW'))).toThrow(/no seats/);
  });

  it('rejects a missing counter queue', () => {
    expect(() => parseLayout(withRow(1, 'WP..CW'))).toThrow(/counter queue/);
  });

  it('rejects a gap or a duplicate in the counter queue', () => {
    expect(() => parseLayout(withRow(3, 'W3...W'))).toThrow(/spot 2 is missing/);
    expect(() => parseLayout(withRow(3, 'W1...W'))).toThrow(/appears twice/);
  });
});

describe('the real cafe layout', () => {
  it('is valid', () => {
    expect(() => parseLayout(CAFE_LAYOUT)).not.toThrow();
  });

  it('has 4 tables with 2 seats each', () => {
    const { tables } = parseLayout(CAFE_LAYOUT);
    expect(tables).toHaveLength(4);
    for (const t of tables) expect(t.seats).toHaveLength(2);
  });
});
