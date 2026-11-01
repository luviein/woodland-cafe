import { CAFE_LAYOUT } from '../data/cafeLayout';
import { DESIGN_IDS, FURNITURE, KIND_CHAR, kindOf, type DesignId } from '../data/furniture';
import { isWalkable, neighbours, parseLayout, pointKey, samePoint, type Layout, type Point } from './layout';

// The cafe = a fixed ROOM (walls, door, counter, queue) + the player's
// FURNITURE (tables, chairs, decorations), kept apart so furniture can live in
// the game state and be moved, while the room stays in data/cafeLayout.ts
// (GAME_DESIGN.md §5.7, §5.10). To build the floor, the floor pieces are
// written back into the room's rows and parsed like any hand-written layout,
// so all of parseLayout()'s checks still apply. Wall decorations hang on the
// back wall: they're never in the floor's rows, so they can't block anything.

export interface PlacedPiece extends Point {
  /** Which design it is (the plain table, the Christmas tree...); its kind follows from that. */
  design: DesignId;
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
const onFloor = (p: PlacedPiece) => kindOf(p.design) !== 'wallDecor';

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

/** The cafe's room with no furniture in it. */
export const CAFE_ROOM: readonly string[] = splitLayout(CAFE_LAYOUT).room;

/** A new game's furniture: what cafeLayout.ts shows, all placed, nothing stored. */
export function startingFurniture(): Furniture {
  return { placed: splitLayout(CAFE_LAYOUT).placed, stored: noneStored() };
}

/** The room's rows with the floor pieces written in (T, S, X), ready for parseLayout(). */
export function furnishedRows(room: readonly string[], placed: readonly PlacedPiece[]): string[] {
  const grid = room.map((row) => [...row]);
  for (const piece of placed.filter(onFloor)) grid[piece.y][piece.x] = KIND_CHAR[kindOf(piece.design) as keyof typeof KIND_CHAR];
  return grid.map((row) => row.join(''));
}

/** The cafe floor for the day: the room plus the furniture. Throws if the result isn't a valid layout. */
export function buildLayout(furniture: Furniture, room: readonly string[] = CAFE_ROOM): Layout {
  return parseLayout(furnishedRows(room, furniture.placed));
}

export function pieceAt(furniture: Furniture, at: Point): PlacedPiece | undefined {
  return furniture.placed.find((p) => samePoint(p, at));
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
function staysConnected(layout: Layout): boolean {
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
  if (pieceAt(furniture, at)) return 'Something is already there';
  const spotProblem = spotProblemFor(design, at, room);
  if (spotProblem) return spotProblem;
  return arrangementProblem([...furniture.placed, { design, ...at }], room);
}

/** Whether a design can stand on this tile at all (before the rules for the cafe as a whole). */
function spotProblemFor(design: DesignId, at: Point, room: readonly string[]): string | null {
  if (kindOf(design) === 'wallDecor') return isWallSpot(room, at) ? null : 'Hang it on the back wall, between the windows';
  // '.' only: not walls or the counter, and not the door, the counter spot,
  // the order spot or queue spots (P, O, 1-9), which must stay clear.
  if (room[at.y]?.[at.x] !== '.') return 'Keep the door, counter and queue clear';
  return null;
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
function withMoved(placed: readonly PlacedPiece[], from: Point, to: Point): PlacedPiece[] {
  return placed.map((p) => (samePoint(p, from) ? { ...p, x: to.x, y: to.y } : p));
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
): string | null {
  if (!pieceAt(furniture, from)) return 'Nothing there to move';
  if (samePoint(from, to)) return null;
  if (pieceAt(furniture, to)) return 'Something is already there';
  const spotProblem = spotProblemFor(pieceAt(furniture, from)!.design, to, room);
  if (spotProblem) return spotProblem;
  return arrangementProblem(withMoved(furniture.placed, from, to), room);
}

/** Moves the piece at `from` to `to`. Throws if moveProblem() says no: check first. */
export function movePiece(
  furniture: Furniture,
  from: Point,
  to: Point,
  room: readonly string[] = CAFE_ROOM,
): Furniture {
  const problem = moveProblem(furniture, from, to, room);
  if (problem) throw new Error(`movePiece: ${problem}`);
  return { ...furniture, placed: withMoved(furniture.placed, from, to) };
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
export function removePiece(furniture: Furniture, at: Point): Furniture {
  const piece = pieceAt(furniture, at);
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
