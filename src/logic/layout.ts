// Turns the text grid in data/cafeLayout.ts into structured data the game can
// use. Pure: text in, data out, so it's easy to test and to reuse later when
// the shop lets players change the layout.

export type TileKind = 'wall' | 'floor' | 'door' | 'counter' | 'table' | 'seat';

/** A tile position on the grid (not pixels). x = column, y = row. */
export interface Point {
  x: number;
  y: number;
}

export interface Table {
  id: string;
  position: Point;
  seats: Point[];
}

export interface Layout {
  width: number;
  height: number;
  /** tiles[y][x]. Row first, matching how the text grid reads. */
  tiles: TileKind[][];
  tables: Table[];
  door: Point;
  orderSpot: Point;
  /** Where customers stand while waiting for a seat; [0] is the front of the line. */
  waitingLine: Point[];
  playerStart: Point;
}

// 'P' and 'O' are floor tiles that also mark a special position.
const CHAR_TO_TILE: Record<string, TileKind> = {
  W: 'wall',
  '.': 'floor',
  D: 'door',
  C: 'counter',
  T: 'table',
  S: 'seat',
  P: 'floor',
  O: 'floor',
  // Digits 1-9 are waiting-line spots, also floor (handled in parseLayout).
};

const NEIGHBOURS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** The 4 tiles touching p (up, right, down, left). May be off the grid. */
export function neighbours(p: Point): Point[] {
  return NEIGHBOURS.map((d) => ({ x: p.x + d.x, y: p.y + d.y }));
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Floor and door tiles can be walked on; everything else blocks. */
export function isWalkable(layout: Layout, p: Point): boolean {
  const tile = layout.tiles[p.y]?.[p.x];
  return tile === 'floor' || tile === 'door';
}

/**
 * Parses and validates a layout. Throws a readable error on a broken grid,
 * since a bad layout is a data bug we want to see immediately, not a
 * half-working cafe.
 */
export function parseLayout(rows: readonly string[]): Layout {
  if (rows.length === 0) throw new Error('Layout is empty');
  const width = rows[0].length;

  const tiles: TileKind[][] = [];
  const tablePositions: Point[] = [];
  const seatPositions: Point[] = [];
  const doors: Point[] = [];
  const orderSpots: Point[] = [];
  const playerStarts: Point[] = [];
  /** Line spots by their digit, e.g. lineSpots.get(1) = front of the line. */
  const lineSpots = new Map<number, Point>();

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Layout row ${y} is ${row.length} wide, expected ${width}`);
    }
    tiles.push(
      [...row].map((char, x) => {
        const tile = isLineDigit(char) ? 'floor' : CHAR_TO_TILE[char];
        if (!tile) throw new Error(`Unknown layout character '${char}' at (${x}, ${y})`);
        const p = { x, y };
        if (char === 'T') tablePositions.push(p);
        if (char === 'S') seatPositions.push(p);
        if (char === 'D') doors.push(p);
        if (char === 'O') orderSpots.push(p);
        if (char === 'P') playerStarts.push(p);
        if (isLineDigit(char)) {
          const n = Number(char);
          if (lineSpots.has(n)) throw new Error(`Waiting line spot ${n} appears twice`);
          lineSpots.set(n, p);
        }
        return tile;
      }),
    );
  });

  const exactlyOne = (points: Point[], name: string): Point => {
    if (points.length !== 1) throw new Error(`Layout needs exactly one ${name}, found ${points.length}`);
    return points[0];
  };

  // Each seat belongs to the one table it touches. Zero tables = a chair with
  // nothing to eat at; two = ambiguous which table it's for.
  const tables: Table[] = tablePositions.map((position, i) => ({
    id: `table-${i}`,
    position,
    seats: [],
  }));
  for (const seat of seatPositions) {
    const touching = tables.filter((t) => neighbours(seat).some((n) => samePoint(n, t.position)));
    if (touching.length !== 1) {
      throw new Error(
        `Seat at (${seat.x}, ${seat.y}) touches ${touching.length} tables, expected exactly 1`,
      );
    }
    touching[0].seats.push(seat);
  }
  for (const table of tables) {
    if (table.seats.length === 0) {
      throw new Error(`Table at (${table.position.x}, ${table.position.y}) has no seats`);
    }
  }

  return {
    width,
    height: rows.length,
    tiles,
    tables,
    door: exactlyOne(doors, 'door (D)'),
    orderSpot: exactlyOne(orderSpots, 'order spot (O)'),
    playerStart: exactlyOne(playerStarts, 'player start (P)'),
    waitingLine: orderedLine(lineSpots),
  };
}

function isLineDigit(char: string): boolean {
  return char >= '1' && char <= '9';
}

/** Line spots in order 1, 2, 3... Must start at 1 with no gaps. */
function orderedLine(spots: Map<number, Point>): Point[] {
  if (spots.size === 0) throw new Error('Layout needs a waiting line (spots 1, 2, 3...)');
  const line: Point[] = [];
  for (let n = 1; n <= spots.size; n++) {
    const spot = spots.get(n);
    if (!spot) throw new Error(`Waiting line has a gap: spot ${n} is missing`);
    line.push(spot);
  }
  return line;
}
