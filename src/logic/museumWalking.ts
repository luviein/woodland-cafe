import type { Point } from './layout';
import { findPath, findPathNextTo } from './pathfinding';
import { museumColumns, museumLayout, MUSEUM_ROWS, type Museum } from './museum';

// Coordinates are floor cells, with fractions retained between rendered pixels.
const CLEARANCE = 0.23;
export const MUSEUM_WALK_SPEED = 100;

/** Spend the whole frame's distance, even when it passes one or more route corners. */
export function stepMuseumRoute(from: Point, route: readonly Point[], distance: number): { position: Point; route: Point[] } {
  let position = { ...from }, remaining = Math.max(0, distance);
  const points = [...route];
  while (points.length) {
    const next = points[0], dx = next.x - position.x, dy = next.y - position.y, length = Math.hypot(dx, dy);
    if (length <= remaining) {
      position = { ...next }; remaining -= length; points.shift();
    } else {
      if (remaining > 0) position = { x: position.x + dx / length * remaining, y: position.y + dy / length * remaining };
      break;
    }
  }
  return { position, route: points };
}

export function museumCanStand(museum: Museum, p: Point): boolean {
  return p.x >= 0 && p.x <= museumColumns(museum) - 1 && p.y >= 0 && p.y <= MUSEUM_ROWS - 1
    && !museum.cases.some(item => Math.abs(item.x - p.x) < 0.5 + CLEARANCE && Math.abs(item.y - p.y) < 0.5 + CLEARANCE);
}

/** Small collision steps prevent tunnelling; separate axes allow sliding along cases. */
export function moveInMuseum(museum: Museum, from: Point, delta: Point): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 0.1));
  let p = { ...from };
  for (let i = 0; i < steps; i++) {
    const x = { ...p, x: p.x + delta.x / steps };
    if (museumCanStand(museum, x)) p = x;
    const y = { ...p, y: p.y + delta.y / steps };
    if (museumCanStand(museum, y)) p = y;
  }
  return p;
}

export function museumLineClear(museum: Museum, from: Point, to: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.1));
  for (let i = 0; i <= steps; i++) {
    if (!museumCanStand(museum, { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps })) return false;
  }
  return true;
}

function nearestWalkingCell(museum: Museum, p: Point, visible = true): Point | undefined {
  const cells: Point[] = [];
  for (let y = 0; y < MUSEUM_ROWS; y++) for (let x = 0; x < museumColumns(museum); x++) {
    const cell = { x, y };
    if (museumCanStand(museum, cell)) cells.push(cell);
  }
  cells.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  return cells.find(cell => !visible || museumLineClear(museum, p, cell));
}

/** Replan from the real position, then skip grid corners only when the whole segment is clear. */
export function museumWalkingRoute(museum: Museum, from: Point, target: Point, caseId: number | null = null): Point[] | null {
  const to = { x: Math.min(Math.max(target.x, 0), museumColumns(museum) - 1), y: Math.min(Math.max(target.y, 0), MUSEUM_ROWS - 1) };
  if (caseId === null && museumLineClear(museum, from, to)) return [to];
  const start = nearestWalkingCell(museum, from);
  if (!start) return null;
  const item = museum.cases.find(item => item.id === caseId);
  if (caseId !== null && !item) return null;
  const goal = item ?? nearestWalkingCell(museum, to, museumCanStand(museum, to));
  if (!goal) return null;
  const layout = museumLayout(museum);
  const path = caseId !== null ? findPathNextTo(layout, start, goal) : findPath(layout, start, goal);
  if (!path) return null;
  const candidates = [start, ...path];
  if (caseId === null && museumCanStand(museum, to) && museumLineClear(museum, candidates.at(-1)!, to)) candidates.push(to);
  const route: Point[] = [];
  let current = from, index = 0;
  while (index < candidates.length) {
    let farthest = index;
    for (let i = candidates.length - 1; i > index; i--) if (museumLineClear(museum, current, candidates[i])) { farthest = i; break; }
    route.push(candidates[farthest]); current = candidates[farthest]; index = farthest + 1;
  }
  return route;
}
