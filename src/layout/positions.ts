import type { Point } from '../logic/layout';

// Where things go on each screen (GAME_DESIGN.md §9.3), by name: "the
// Pantry's stall on the Marketplace", "the Serve button at the prep station".
// Code asks with a default; a position moved in Arrange mode (dev only) is
// saved to src/data/layouts/<screen>.json and wins over the default. So every
// screen, now and later, can be rearranged without touching its code, and
// anything never moved keeps the default written next to it.

/** One file per screen: src/data/layouts/<screen>.json, { name: { x, y } }. */
const FILES = import.meta.glob<Record<string, Point>>('../data/layouts/*.json', { eager: true, import: 'default' });

const screenOf = (path: string): string => path.replace(/^.*\//, '').replace(/\.json$/, '');

/** Positions as saved (or moved since, in Arrange mode), by screen then name. */
const saved: Record<string, Record<string, Point>> = {};
for (const [path, data] of Object.entries(FILES)) saved[screenOf(path)] = { ...data };

/** Every default asked for so far, by screen then name: what "unmoved" means. */
const defaults: Record<string, Record<string, Point>> = {};

/**
 * Where `name` goes on `screen`: its saved position, else `fallback`.
 * Read it when the thing is placed (each time the screen is built), not once
 * at start-up, so a move in Arrange mode shows the next time it's read.
 */
export function layoutPoint(screen: string, name: string, fallback: Point): Point {
  (defaults[screen] ??= {})[name] = { x: fallback.x, y: fallback.y };
  const p = saved[screen]?.[name];
  return p ? { x: p.x, y: p.y } : { x: fallback.x, y: fallback.y };
}

/** Arrange mode: `name` is now at `to` (not saved to its file until saveFile()). */
export function moveTo(screen: string, name: string, to: Point): void {
  (saved[screen] ??= {})[name] = { x: to.x, y: to.y };
}

/** What Save writes for a screen: only the positions that differ from their defaults, sorted by name. */
export function fileContents(screen: string): Record<string, Point> {
  const out: Record<string, Point> = {};
  const own = saved[screen] ?? {};
  for (const name of Object.keys(own).sort()) {
    const p = own[name], d = defaults[screen]?.[name];
    if (!d || d.x !== p.x || d.y !== p.y) out[name] = { x: p.x, y: p.y };
  }
  return out;
}

/** Back to a file's contents (Reset in Arrange mode). */
export function replaceScreen(screen: string, contents: Record<string, Point>): void {
  saved[screen] = { ...contents };
}

/** Whole pixels, or a grid of `grid` pixels. */
export function snap(p: Point, grid = 1): Point {
  return { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid };
}

// Saving a layout file in Arrange mode changes it on disk. Take the new
// contents here instead of letting the dev server reload the whole page
// (which would land back on the title screen).
if (import.meta.hot) {
  const paths = Object.keys(FILES);
  import.meta.hot.accept(paths, (modules) => {
    modules.forEach((m, i) => {
      if (m) saved[screenOf(paths[i])] = { ...(m.default as Record<string, Point>) };
    });
  });
}
