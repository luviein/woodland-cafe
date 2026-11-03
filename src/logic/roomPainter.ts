import { CAFE_LAYOUT } from '../data/cafeLayout';
import { DESIGN_IDS } from '../data/furniture';
import { buildLayout, noneStored, spotProblemFor, startingFurniture, staysConnected, type PlacedPiece } from './furniture';
import { parseLayout, type Point } from './layout';

export const ROOM_BRUSHES = ['.', 'W', 'C', 'D', 'P', 'O', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type RoomBrush = (typeof ROOM_BRUSHES)[number];

/** Special markers move; ordinary tiles are painted. Drafts may be invalid. */
export function paintRoom(rows: readonly string[], at: Point, brush: RoomBrush): string[] {
  if (!Number.isInteger(at.x) || !Number.isInteger(at.y) || rows[at.y]?.[at.x] === undefined) return [...rows];
  const unique = !['.', 'W', 'C'].includes(brush);
  return rows.map((row, y) => [...row].map((char, x) => {
    if (x === at.x && y === at.y) return brush;
    return unique && char === brush ? '.' : char;
  }).join(''));
}

/** Check both the room and each furniture arrangement before writing a file. */
export function roomProblems(rows: readonly string[], placed: readonly PlacedPiece[] = [], includeStarter = true): string[] {
  if (rows.length !== CAFE_LAYOUT.length || rows.some(row => row.length !== CAFE_LAYOUT[0].length)) return ['Keep the room at 24 columns by 12 rows.'];
  if (rows.some(row => [...row].some(char => !ROOM_BRUSHES.includes(char as RoomBrush)))) return ['Use only floor, wall, counter, D, P, O and queue 1-9 tiles.'];
  try {
    const layout = parseLayout(rows);
    const { counterSpot: p, orderSpot: o } = layout;
    const across = (p.x === o.x && Math.abs(p.y - o.y) === 2) || (p.y === o.y && Math.abs(p.x - o.x) === 2);
    const middle = across ? rows[(p.y + o.y) / 2][(p.x + o.x) / 2] : undefined;
    const errors: string[] = [];
    if (!across || middle !== 'C') errors.push('P and O must face each other across one counter tile.');
    if (!staysConnected(layout)) errors.push('All walkable tiles must connect to the door.');
    const arrangements: [string, readonly PlacedPiece[]][] = [['Saved furniture', placed]];
    if (includeStarter) arrangements.unshift(['Starter furniture', startingFurniture().placed]);
    for (const [label, pieces] of arrangements) {
      const invalid = pieces.find(piece => spotProblemFor(piece.design, piece, rows));
      if (invalid) {
        errors.push(`${label}: keep a suitable tile under ${invalid.design} at (${invalid.x}, ${invalid.y}).`);
        continue;
      }
      const furnished = buildLayout({ stored: noneStored(), placed: pieces }, rows);
      if (!staysConnected(furnished)) errors.push(`${label}: keep paths and access to tables and seats clear.`);
    }
    return errors;
  } catch (error) {
    return [error instanceof Error ? error.message : 'The room is invalid.'];
  }
}

export interface RoomSaveInput { rows: string[]; base: string[]; placed: PlacedPiece[] }
/** The dev endpoint validates its untrusted JSON before calling game logic. */
export function isRoomSaveInput(value: unknown): value is RoomSaveInput {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  const rows = (v: unknown): v is string[] => Array.isArray(v) && v.length === 12 && v.every(row => typeof row === 'string' && row.length === 24);
  return rows(data.rows) && rows(data.base) && Array.isArray(data.placed) && data.placed.length <= 288 && data.placed.every(p =>
    p && typeof p === 'object' && DESIGN_IDS.includes(p.design) && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < 24 && p.y >= 0 && p.y < 12,
  );
}
