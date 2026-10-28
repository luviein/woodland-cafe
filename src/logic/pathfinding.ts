import { isWalkable, neighbours, pointKey, samePoint, type Layout, type Point } from './layout';

/** Grid distance ignoring walls: how many steps if nothing were in the way. */
function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Shortest walking route from start to goal, moving up/down/left/right.
 * Returns the tiles to step onto in order (start NOT included, goal
 * included), [] if already there, or null if the goal can't be reached.
 *
 * This is A* search. It explores tiles in order of
 *   (steps taken so far) + (straight-line guess of steps left)
 * so it heads toward the goal first instead of flooding the whole map, but
 * still always finds a shortest path, because the guess (Manhattan distance)
 * never overestimates when you can only move in 4 directions.
 */
export function findPath(layout: Layout, start: Point, goal: Point): Point[] | null {
  if (samePoint(start, goal)) return [];
  if (!isWalkable(layout, goal)) return null;

  // cameFrom lets us walk backwards from the goal to rebuild the route.
  const cameFrom = new Map<string, Point>();
  const stepsTo = new Map<string, number>([[pointKey(start), 0]]);
  // Tiles found but not yet explored. A plain array is fine: cafe grids are a
  // few hundred tiles, so a priority-queue library would be overkill.
  const open: Point[] = [start];
  const score = (p: Point): number => stepsTo.get(pointKey(p))! + manhattan(p, goal);

  while (open.length > 0) {
    // Take the most promising tile.
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (score(open[i]) < score(open[best])) best = i;
    }
    const current = open.splice(best, 1)[0];

    if (samePoint(current, goal)) return rebuildPath(cameFrom, current);

    for (const next of neighbours(current)) {
      if (!isWalkable(layout, next)) continue;
      const steps = stepsTo.get(pointKey(current))! + 1;
      // Only keep this route if it's the shortest way to `next` found so far.
      if (steps < (stepsTo.get(pointKey(next)) ?? Infinity)) {
        stepsTo.set(pointKey(next), steps);
        cameFrom.set(pointKey(next), current);
        if (!open.some((p) => samePoint(p, next))) open.push(next);
      }
    }
  }
  return null; // explored everything reachable; goal isn't among it
}

function rebuildPath(cameFrom: Map<string, Point>, goal: Point): Point[] {
  const path: Point[] = [goal];
  let current = cameFrom.get(pointKey(goal));
  // Stop before the start tile (it has no cameFrom entry).
  while (current && cameFrom.has(pointKey(current))) {
    path.unshift(current);
    current = cameFrom.get(pointKey(current));
  }
  return path;
}

/**
 * Shortest route to any walkable tile touching `target` (a table, a seat):
 * you can't stand ON furniture, only next to it. [] if already next to it,
 * null if no side of it can be reached.
 */
export function findPathNextTo(layout: Layout, start: Point, target: Point): Point[] | null {
  let best: Point[] | null = null;
  for (const n of neighbours(target)) {
    if (!isWalkable(layout, n)) continue;
    const route = findPath(layout, start, n);
    if (route && (!best || route.length < best.length)) best = route;
  }
  return best;
}
