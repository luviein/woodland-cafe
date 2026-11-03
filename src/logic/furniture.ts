import { CAFE_LAYOUT } from '../data/cafeLayout';
import { CAFE_ROOM } from '../data/cafeRoom';
export { CAFE_ROOM } from '../data/cafeRoom';
import { DESIGN_IDS, FURNITURE, KIND_CHAR, kindOf, placesOf, type DesignId, type Place } from '../data/furniture';
import { isWalkable, neighbours, parseLayout, pointKey, samePoint, type Layout, type Point } from './layout';

// The cafe = the player's ROOM (walls, door, counter, queue) + their
// FURNITURE (tables, chairs, decorations), stored separately in game state.
// CAFE_ROOM is the new-game default; scenes pass the player's saved room.
// (GAME_DESIGN.md §5.7, §5.10). To build the floor, the floor pieces are
// written back into the room's rows and parsed like any hand-written layout,
// so all of parseLayout()'s checks still apply. Pieces on the back wall or
// the counter are never in the floor's rows, so they can't block anything.

export interface PlacedPiece extends Point {
  /** Which design it is (the plain table, the Christmas tree...); its kind follows from that. */
  design: DesignId;
  rugRotation?: number;
  rugFlipX?: boolean;
  rugFlipY?: boolean;
}

export function validRugOrientation(piece: { rugRotation?: unknown; rugFlipX?: unknown; rugFlipY?: unknown }): boolean {
  return (piece.rugRotation === undefined || (typeof piece.rugRotation === 'number' && Number.isInteger(piece.rugRotation) && piece.rugRotation >= 0 && piece.rugRotation < 4))
    && (piece.rugFlipX === undefined || typeof piece.rugFlipX === 'boolean')
    && (piece.rugFlipY === undefined || typeof piece.rugFlipY === 'boolean');
}

/** Frames contain exact pixel transforms, avoiding resampling during drawing. */
export function rugFrame(piece: PlacedPiece): number {
  return (piece.rugRotation ?? 0) + (piece.rugFlipX ? 4 : 0) + (piece.rugFlipY ? 8 : 0);
}

export function rotateRug(furniture: Furniture, at: Point, design: DesignId): Furniture {
  const piece = pieceAt(furniture, at, design);
  if (!piece || kindOf(piece.design) !== 'rug') return furniture;
  const changed = { ...piece, rugRotation: ((piece.rugRotation ?? 0) + 1) % 4 };
  return { ...furniture, placed: furniture.placed.map(p => p === piece ? changed : p) };
}

/** Rugs have a visual floor layer; seating furniture stays on whole tiles. */
export function snapPlacement(design: DesignId, point: Point): Point {
  const divisions = kindOf(design) === 'rug' ? 4 : 1;
  return { x: Math.round(point.x * divisions) / divisions, y: Math.round(point.y * divisions) / divisions };
}

export function validPiecePosition(design: DesignId, x: unknown, y: unknown): boolean {
  const divisions = kindOf(design) === 'rug' ? 4 : 1;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)
    && x >= 0 && y >= 0 && Number.isInteger(x * divisions) && Number.isInteger(y * divisions);
}

/** All the player's furniture. Plain data, so it lives in the game state. */
export interface Furniture {
  placed: readonly PlacedPiece[];
  /** Bought (or put away) but not in the cafe, per design. */
  stored: Record<DesignId, number>;
}

/** Nothing of any design: a starting point for counts. */
export function noneStored(): Record<DesignId, number> {
  return Object.fromEntries(DESIGN_IDS.map((id) => [id, 0])) as Record<DesignId, number>;
}

/** The plain designs a hand-written layout's letters stand for. */
const DESIGN_BY_CHAR = new Map<string, DesignId>([
  [KIND_CHAR.table, 'table'],
  [KIND_CHAR.chair, 'chair'],
]);

const isKind = (kind: string) => (p: PlacedPiece) => kindOf(p.design) === kind;
/** What kind of spot a tile is for furniture: the floor, the back wall, the counter, or none. */
export type Spot = 'floor' | 'wall' | 'counter';

export function spotAt(room: readonly string[], at: Point): Spot | null {
  const char = room[at.y]?.[at.x];
  if (char === '.') return 'floor';
  if (char === 'C') return 'counter';
  return isWallSpot(room, at) ? 'wall' : null;
}

/** Whether a design can go on a kind of spot (the counter takes counter-front and counter-top pieces). */
function fits(design: DesignId, spot: Spot): boolean {
  const places = placesOf(design);
  return spot === 'counter' ? places.includes('counterFront') || places.includes('counterTop') : places.includes(spot);
}

/** Where a design can go, in words, for "can't go there" messages. */
const PLACE_WORDS: Record<Place, string> = { floor: 'the floor', wall: 'the back wall (between the windows)', counterFront: 'the counter', counterTop: 'the counter' };

/** Back-wall tiles get a window every few tiles (drawn by ui/cafeTiles.ts); decorations can't hang there. */
export const WINDOW_EVERY = 5;

/** Whether back-wall tile x has a window. */
export function isWindow(x: number, width: number): boolean {
  return x % WINDOW_EVERY === 2 && x < width - 2;
}

/**
 * Where a wall decoration can hang: a wall tile along the top (the back
 * wall), not a corner and not a window.
 */
export function isWallSpot(room: readonly string[], at: Point): boolean {
  const width = room[0].length;
  return at.y === 0 && at.x > 0 && at.x < width - 1 && room[0][at.x] === 'W' && !isWindow(at.x, width);
}

/**
 * Splits a hand-written layout into the empty room ('.' where furniture was)
 * and the furniture standing in it, in reading order.
 */
export function splitLayout(rows: readonly string[]): { room: string[]; placed: PlacedPiece[] } {
  const placed: PlacedPiece[] = [];
  const room = rows.map((row, y) =>
    [...row]
      .map((char, x) => {
        const design = DESIGN_BY_CHAR.get(char);
        if (!design) return char;
        placed.push({ design, x, y });
        return '.';
      })
      .join(''),
  );
  return { room, placed };
}

/** A new game's furniture: what cafeLayout.ts shows, all placed, nothing stored. */
export function startingFurniture(): Furniture {
  return { placed: splitLayout(CAFE_LAYOUT).placed, stored: noneStored() };
}

/** The room's rows with the floor pieces written in (T, S, X), ready for parseLayout(). */
export function furnishedRows(room: readonly string[], placed: readonly PlacedPiece[]): string[] {
  const grid = room.map((row) => [...row]);
  for (const piece of placed.filter((p) => room[p.y]?.[p.x] === '.' && kindOf(p.design) !== 'rug')) grid[piece.y][piece.x] = KIND_CHAR[kindOf(piece.design) as keyof typeof KIND_CHAR];
  return grid.map((row) => row.join(''));
}

/** The cafe floor for the day: the room plus the furniture. Throws if the result isn't a valid layout. */
export function buildLayout(furniture: Furniture, room: readonly string[] = CAFE_ROOM): Layout {
  return parseLayout(furnishedRows(room, furniture.placed));
}

export function pieceAt(furniture: Furniture, at: Point, design?: DesignId): PlacedPiece | undefined {
  const solid = furniture.placed.find(p => kindOf(p.design) !== 'rug' && samePoint(p, at) && (!design || p.design === design));
  return solid ?? furniture.placed.find(p => kindOf(p.design) === 'rug' && (!design || p.design === design) && at.x >= p.x && at.x < p.x + 2 && at.y >= p.y && at.y < p.y + 2);
}

/** Rugs share tiles with furniture, but cannot overlap another rug. */
export function placementOverlap(placed: readonly PlacedPiece[]): boolean {
  return placed.some((a, i) => placed.slice(i + 1).some(b => {
    const rug = kindOf(a.design) === 'rug';
    if (rug !== (kindOf(b.design) === 'rug')) return false;
    return rug ? a.x < b.x + 2 && a.x + 2 > b.x && a.y < b.y + 2 && a.y + 2 > b.y : samePoint(a, b);
  }));
}

const touching = (a: Point, b: Point): boolean => neighbours(a).some((n) => samePoint(n, b));

/** How many tables `p` touches, among `placed`. */
function tablesTouching(placed: readonly PlacedPiece[], p: Point): number {
  return placed.filter((q) => isKind('table')(q) && touching(p, q)).length;
}

/**
 * Everyone can still get everywhere: all walkable tiles form one connected
 * area (reached from the door), and every table and seat has a walkable
 * tile next to it, for customers to sit down and the player to clean.
 */
export function staysConnected(layout: Layout): boolean {
  const walkable: Point[] = [];
  layout.tiles.forEach((row, y) => row.forEach((_, x) => isWalkable(layout, { x, y }) && walkable.push({ x, y })));
  // Flood fill from the door: a breadth-first walk over walkable tiles.
  const reached = new Set([pointKey(layout.door)]);
  const todo = [layout.door];
  while (todo.length > 0) {
    for (const n of neighbours(todo.pop()!)) {
      if (isWalkable(layout, n) && !reached.has(pointKey(n))) {
        reached.add(pointKey(n));
        todo.push(n);
      }
    }
  }
  if (reached.size !== walkable.length) return false;
  const furniture = layout.tables.flatMap((t) => [t.position, ...t.seats]);
  return furniture.every((p) => neighbours(p).some((n) => isWalkable(layout, n)));
}

/**
 * Why `design` can't be placed at `at`, as a sentence to show the player, or
 * null if it can (GAME_DESIGN.md §5.7 "Placement rules", §5.10).
 */
export function placeProblem(
  furniture: Furniture,
  design: DesignId,
  at: Point,
  room: readonly string[] = CAFE_ROOM,
): string | null {
  if (furniture.stored[design] <= 0) return `No ${FURNITURE[design].name} in storage`;
  if (placementOverlap([...furniture.placed, { design, ...at }])) return 'Something is already there';
  const spotProblem = spotProblemFor(design, at, room);
  if (spotProblem) return spotProblem;
  return arrangementProblem([...furniture.placed, { design, ...at }], room);
}

/** Whether a design can go on this tile at all (before the rules for the cafe as a whole), or why not. */
export function spotProblemFor(design: DesignId, at: Point, room: readonly string[]): string | null {
  if (kindOf(design) === 'rug') {
    if (!validPiecePosition(design, at.x, at.y)) return 'Place rugs on the fine placement grid';
    for (let y = Math.floor(at.y); y < Math.ceil(at.y + 2); y++) for (let x = Math.floor(at.x); x < Math.ceil(at.x + 2); x++) {
      const char = room[y]?.[x];
      if (!char || !'.PO123456789'.includes(char)) return 'Keep the whole rug on floor tiles, clear of walls, counter and door';
    }
    return null;
  }
  const spot = spotAt(room, at);
  if (spot && fits(design, spot)) return null;
  const places = placesOf(design);
  // Floor-only pieces: '.' only, so not the door, the counter spot, the
  // order spot or queue spots (P, O, 1-9), which must stay clear.
  if (places.length === 1 && places[0] === 'floor') return 'Keep the door, counter and queue clear';
  if (places.length === 1 && places[0] === 'wall') return 'Hang it on the back wall, between the windows';
  const words = [...new Set(places.map((p) => PLACE_WORDS[p]))];
  return `It goes on ${words.join(' or ')}`;
}

/**
 * The rules for the cafe as a whole, once pieces are on free '.' tiles:
 * no chair touches two tables, and nothing blocks the way. (A chair with
 * no table is allowed: nobody sits there.)
 */
function arrangementProblem(placed: readonly PlacedPiece[], room: readonly string[]): string | null {
  if (placed.some((p) => isKind('chair')(p) && tablesTouching(placed, p) > 1)) return 'A chair can only be at one table';
  // The checks above are exactly what parseLayout() needs, so this can't throw.
  if (!staysConnected(parseLayout(furnishedRows(room, placed)))) return 'That would block the way';
  return null;
}

/** `placed` with the piece at `from` moved to `to`, in the same order (so only its position changes). */
function withMoved(placed: readonly PlacedPiece[], piece: PlacedPiece, to: Point): PlacedPiece[] {
  return placed.map(p => p === piece ? { ...p, x: to.x, y: to.y } : p);
}

/**
 * Why the piece at `from` can't be moved to `to`, or null if it can. Only
 * that piece moves, even a table (its chairs stay where they are), by the
 * same rules as placing.
 */
export function moveProblem(
  furniture: Furniture,
  from: Point,
  to: Point,
  room: readonly string[] = CAFE_ROOM,
  design?: DesignId,
): string | null {
  if (!pieceAt(furniture, from, design)) return 'Nothing there to move';
  if (samePoint(from, to)) return null;
  const piece = pieceAt(furniture, from, design)!;
  if (placementOverlap(withMoved(furniture.placed, piece, to))) return 'Something is already there';
  const spotProblem = spotProblemFor(piece.design, to, room);
  if (spotProblem) return spotProblem;
  return arrangementProblem(withMoved(furniture.placed, piece, to), room);
}

/** Moves the piece at `from` to `to`. Throws if moveProblem() says no: check first. */
export function movePiece(
  furniture: Furniture,
  from: Point,
  to: Point,
  room: readonly string[] = CAFE_ROOM,
  design?: DesignId,
): Furniture {
  const problem = moveProblem(furniture, from, to, room, design);
  if (problem) throw new Error(`movePiece: ${problem}`);
  return { ...furniture, placed: withMoved(furniture.placed, pieceAt(furniture, from, design)!, to) };
}

/** Moves one `design` from storage to `at`. Throws if placeProblem() says no: check first. */
export function placePiece(
  furniture: Furniture,
  design: DesignId,
  at: Point,
  room: readonly string[] = CAFE_ROOM,
): Furniture {
  const problem = placeProblem(furniture, design, at, room);
  if (problem) throw new Error(`placePiece: ${problem}`);
  return {
    placed: [...furniture.placed, { design, x: at.x, y: at.y }],
    stored: { ...furniture.stored, [design]: furniture.stored[design] - 1 },
  };
}

/**
 * Puts the piece at `at` back into storage (free). Only that piece, even a
 * table: its chairs stay where they are (a chair with no table is allowed,
 * just unused), the same as moving it. Nothing there: unchanged.
 */
export function removePiece(furniture: Furniture, at: Point, design?: DesignId): Furniture {
  const piece = pieceAt(furniture, at, design);
  if (!piece) return furniture;
  return {
    placed: furniture.placed.filter((p) => p !== piece),
    stored: { ...furniture.stored, [piece.design]: furniture.stored[piece.design] + 1 },
  };
}

/** Adds bought pieces to storage. */
export function storePieces(furniture: Furniture, design: DesignId, count: number): Furniture {
  return { ...furniture, stored: { ...furniture.stored, [design]: furniture.stored[design] + count } };
}

/**
 * Which way a chair's sitter faces: toward the table it touches. A table
 * above or below it, or none, shows the front view (the only one that shows
 * the seat face-on).
 */
export function chairFacing(placed: readonly PlacedPiece[], chair: Point): 'front' | 'left' | 'right' {
  const table = placed.find((q) => isKind('table')(q) && touching(chair, q));
  if (!table || table.x === chair.x) return 'front';
  return table.x < chair.x ? 'left' : 'right';
}
