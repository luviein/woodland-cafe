import { CAFE_LAYOUT } from '../data/cafeLayout';
import { FURNITURE, FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import { parseLayout, type Layout, type Point } from './layout';

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
