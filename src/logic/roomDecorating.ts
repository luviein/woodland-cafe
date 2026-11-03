import type { RoomSurface } from '../data/roomFinishes';
import { FLOOR_FINISHES, WALL_FINISHES } from '../data/roomFinishes';
import type { Furniture } from './furniture';
import { parseLayout, type Point } from './layout';
import { roomProblems } from './roomPainter';

/** Finishes are separate from the room: painting cannot alter walking rules. */
export function paintFinish(room: readonly string[], finishes: readonly string[], at: Point, surface: RoomSurface, style: number): string[] {
  const char = room[at.y]?.[at.x];
  const styles = surface === 'wall' ? WALL_FINISHES : FLOOR_FINISHES;
  if (!Number.isInteger(at.x) || !Number.isInteger(at.y) || !Number.isInteger(style) || style < 0 || style >= styles.length || !char) return [...finishes];
  if (surface === 'wall' ? char !== 'W' : !'.PO123456789'.includes(char)) return [...finishes];
  return finishes.map((row, y) => y === at.y ? row.slice(0, at.x) + style + row.slice(at.x + 1) : row);
}

/** Join sparse pointer events so quick strokes cannot leave unpainted gaps. */
export function paintFinishStroke(room: readonly string[], finishes: readonly string[], from: Point, to: Point, surface: RoomSurface, style: number): string[] {
  let result = [...finishes];
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let step = 0; step <= steps; step++) {
    const t = steps === 0 ? 0 : step / steps;
    result = paintFinish(room, result, { x: Math.round(from.x + (to.x - from.x) * t), y: Math.round(from.y + (to.y - from.y) * t) }, surface, style);
  }
  return result;
}

/** Fill the connected surface, respecting structural boundaries, not colours. */
export function paintFinishStretch(room: readonly string[], finishes: readonly string[], at: Point, surface: RoomSurface, style: number): string[] {
  let result = [...finishes];
  const pending = [at], visited = new Set<string>();
  while (pending.length) {
    const point = pending.pop()!;
    const key = `${point.x},${point.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const char = room[point.y]?.[point.x];
    if (!char || (surface === 'wall' ? char !== 'W' : !'.PO123456789'.includes(char))) continue;
    result = paintFinish(room, result, point, surface, style);
    pending.push({ x: point.x - 1, y: point.y }, { x: point.x + 1, y: point.y }, { x: point.x, y: point.y - 1 }, { x: point.x, y: point.y + 1 });
  }
  return result;
}

export type CounterMove = { ok: true; room: string[]; furniture: Furniture } | { ok: false; reason: string };

/** Service markers and counter decorations travel as one working station. */
export function moveCounter(room: readonly string[], furniture: Furniture, to: Point): CounterMove {
  const start = parseLayout(room).counterSpot;
  const dx = to.x - start.x, dy = to.y - start.y;
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) return { ok: false, reason: 'Choose a cafe tile' };
  const moving = (char: string) => 'CPO123456789'.includes(char);
  const grid = room.map(row => [...row].map(char => moving(char) ? '.' : char));
  for (let y = 0; y < room.length; y++) for (let x = 0; x < room[y].length; x++) {
    if (!moving(room[y][x])) continue;
    const target = grid[y + dy]?.[x + dx];
    if (target !== '.') return { ok: false, reason: 'Keep the counter and queue inside the cafe, clear of walls and the door' };
  }
  for (let y = 0; y < room.length; y++) for (let x = 0; x < room[y].length; x++) {
    if (moving(room[y][x])) grid[y + dy][x + dx] = room[y][x];
  }
  const placed = furniture.placed.map(piece => room[piece.y]?.[piece.x] === 'C' ? { ...piece, x: piece.x + dx, y: piece.y + dy } : piece);
  if (new Set(placed.map(piece => `${piece.x},${piece.y}`)).size !== placed.length) return { ok: false, reason: 'Move furniture out of the way first' };
  const rows = grid.map(row => row.join(''));
  const problems = roomProblems(rows, placed, false);
  return problems.length ? { ok: false, reason: problems[0] } : { ok: true, room: rows, furniture: { ...furniture, placed } };
}
