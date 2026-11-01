import { CAFE_LAYOUT } from '../data/cafeLayout';
import { FURNITURE, FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import { isWalkable, neighbours, parseLayout, pointKey, samePoint, type Layout, type Point } from './layout';

// The cafe = a fixed ROOM (walls, door, counter, queue) + the player's
// FURNITURE (tables and chairs), kept apart so furniture can live in the game
// state and be moved, while the room stays in data/cafeLayout.ts
// (GAME_DESIGN.md §5.7). To build the floor, the furniture is written back
// into the room's rows and parsed like any hand-written layout, so all of
// parseLayout()'s checks still apply.

export interface PlacedPiece extends Point {
  kind: FurnitureKind;
}

/** All the player's furniture. Plain data, so it lives in the game state. */
export interface Furniture {
  placed: readonly PlacedPiece[];
  /** Bought (or put away) but not in the cafe. */
  stored: Record<FurnitureKind, number>;
}

const KIND_BY_CHAR = new Map(FURNITURE_KINDS.map((kind) => [FURNITURE[kind].char as string, kind]));

/**
 * Splits a hand-written layout into the empty room ('.' where furniture was)
 * and the furniture standing in it, in reading order.
 */
export function splitLayout(rows: readonly string[]): { room: string[]; placed: PlacedPiece[] } {
  const placed: PlacedPiece[] = [];
  const room = rows.map((row, y) =>
    [...row]
      .map((char, x) => {
        const kind = KIND_BY_CHAR.get(char);
        if (!kind) return char;
        placed.push({ kind, x, y });
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
  return { placed: splitLayout(CAFE_LAYOUT).placed, stored: { table: 0, chair: 0 } };
}

/** The room's rows with the furniture written in (T and S), ready for parseLayout(). */
export function furnishedRows(room: readonly string[], placed: readonly PlacedPiece[]): string[] {
  const grid = room.map((row) => [...row]);
  for (const piece of placed) grid[piece.y][piece.x] = FURNITURE[piece.kind].char;
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
  return placed.filter((q) => q.kind === 'table' && touching(p, q)).length;
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
 * Why `kind` can't be placed at `at`, as a sentence to show the player, or
 * null if it can (GAME_DESIGN.md §5.7 "Placement rules").
 */
export function placeProblem(
  furniture: Furniture,
  kind: FurnitureKind,
  at: Point,
  room: readonly string[] = CAFE_ROOM,
): string | null {
  if (furniture.stored[kind] <= 0) return `No ${FURNITURE[kind].name.toLowerCase()}s in storage`;
  if (pieceAt(furniture, at)) return 'Something is already there';
  // '.' only: not walls or the counter, and not the door, the counter spot,
  // the order spot or queue spots (P, O, 1-9), which must stay clear.
  if (room[at.y]?.[at.x] !== '.') return 'Keep the door, counter and queue clear';
  return arrangementProblem([...furniture.placed, { kind, ...at }], room);
}

/**
 * The rules for the cafe as a whole, once pieces are on free '.' tiles:
 * every chair touches exactly one table, and nothing blocks the way.
 */
function arrangementProblem(placed: readonly PlacedPiece[], room: readonly string[]): string | null {
  for (const chair of placed.filter((p) => p.kind === 'chair')) {
    const tables = tablesTouching(placed, chair);
    if (tables === 0) return 'A chair needs a table next to it';
    if (tables > 1) return 'A chair can only be at one table';
  }
  // The checks above are exactly what parseLayout() needs, so this can't throw.
  if (!staysConnected(parseLayout(furnishedRows(room, placed)))) return 'That would block the way';
  return null;
}

/**
 * The pieces that go together with the one at `at`: just it, or for a
 * table, it plus the chairs at it (they're put away and moved together).
 */
export function pieceGroup(furniture: Furniture, at: Point): PlacedPiece[] {
  const piece = pieceAt(furniture, at);
  if (!piece) return [];
  return furniture.placed.filter(
    (p) => p === piece || (piece.kind === 'table' && p.kind === 'chair' && touching(p, piece)),
  );
}

/**
 * Why the piece at `from` can't be dragged to `to` (its group moving by the
 * same step, GAME_DESIGN.md §5.7), or null if it can. Judged with the group
 * lifted out, so a table can shift onto where its own chair was.
 */
export function moveProblem(
  furniture: Furniture,
  from: Point,
  to: Point,
  room: readonly string[] = CAFE_ROOM,
): string | null {
  const group = pieceGroup(furniture, from);
  if (group.length === 0) return 'Nothing there to move';
  if (samePoint(from, to)) return null;
  const staying = furniture.placed.filter((p) => !group.includes(p));
  const moved = group.map((p) => ({ ...p, x: p.x + to.x - from.x, y: p.y + to.y - from.y }));
  for (const p of moved) {
    if (staying.some((q) => samePoint(q, p))) return 'Something is already there';
    if (room[p.y]?.[p.x] !== '.') return 'Keep the door, counter and queue clear';
  }
  return arrangementProblem([...staying, ...moved], room);
}

/** Drags the piece at `from` (and a table's chairs) to `to`. Throws if moveProblem() says no: check first. */
export function movePiece(
  furniture: Furniture,
  from: Point,
  to: Point,
  room: readonly string[] = CAFE_ROOM,
): Furniture {
  const problem = moveProblem(furniture, from, to, room);
  if (problem) throw new Error(`movePiece: ${problem}`);
  const group = pieceGroup(furniture, from);
  return {
    ...furniture,
    // Same order as before, so a move changes only the positions.
    placed: furniture.placed.map((p) => (group.includes(p) ? { ...p, x: p.x + to.x - from.x, y: p.y + to.y - from.y } : p)),
  };
}

/** Moves one `kind` from storage to `at`. Throws if placeProblem() says no: check first. */
export function placePiece(
  furniture: Furniture,
  kind: FurnitureKind,
  at: Point,
  room: readonly string[] = CAFE_ROOM,
): Furniture {
  const problem = placeProblem(furniture, kind, at, room);
  if (problem) throw new Error(`placePiece: ${problem}`);
  return {
    placed: [...furniture.placed, { kind, x: at.x, y: at.y }],
    stored: { ...furniture.stored, [kind]: furniture.stored[kind] - 1 },
  };
}

/**
 * Puts the piece at `at` back into storage (free). A table takes its chairs
 * with it: a chair always needs its table. Nothing there: unchanged.
 */
export function removePiece(furniture: Furniture, at: Point): Furniture {
  const removed = pieceGroup(furniture, at);
  if (removed.length === 0) return furniture;
  const stored = { ...furniture.stored };
  for (const p of removed) stored[p.kind] += 1;
  return { placed: furniture.placed.filter((p) => !removed.includes(p)), stored };
}

/** Adds bought pieces to storage. */
export function storePieces(furniture: Furniture, kind: FurnitureKind, count: number): Furniture {
  return { ...furniture, stored: { ...furniture.stored, [kind]: furniture.stored[kind] + count } };
}
