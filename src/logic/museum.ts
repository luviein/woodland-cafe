import { COLLECTION_IDS, type CollectionId } from './cropCollection';
import type { GameState } from './gameState';
import type { Layout, Point } from './layout';
import { findPathNextTo } from './pathfinding';

export const MUSEUM_CASE_PRICE = 25;
export const MUSEUM_EXPANSION_PRICES = [200, 400] as const;
export const MUSEUM_ROWS = 8;
export interface MuseumCase extends Point { id: number; exhibit: CollectionId | null }
export interface Museum { level: number; storedCases: number; nextCaseId: number; cases: readonly MuseumCase[] }
export const emptyMuseum = (): Museum => ({ level: 0, storedCases: 1, nextCaseId: 1, cases: [] });
export const museumColumns = (museum: Museum): number => 12 + museum.level * 4;
export const museumDoor = (museum: Museum): Point => ({ x: museumColumns(museum) / 2, y: MUSEUM_ROWS - 1 });

export function museumLayout(museum: Museum): Layout {
  const width = museumColumns(museum), door = museumDoor(museum);
  const tiles: Layout['tiles'] = Array.from({ length: MUSEUM_ROWS }, () => Array(width).fill('floor'));
  for (const item of museum.cases) tiles[item.y][item.x] = 'decor';
  return { width, height: MUSEUM_ROWS, tiles, door, tables: [], orderSpot: door, queueSpots: [], counterSpot: door };
}

/** Keep every floor tile connected to the entrance, rather than only the main aisle. */
function connected(museum: Museum): boolean {
  const layout = museumLayout(museum), todo = [layout.door], seen = new Set<string>();
  while (todo.length) {
    const p = todo.pop()!, key = `${p.x},${p.y}`;
    if (seen.has(key) || p.x < 0 || p.y < 0 || p.x >= layout.width || p.y >= layout.height || layout.tiles[p.y][p.x] !== 'floor') continue;
    seen.add(key);
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) todo.push({ x: p.x + x, y: p.y + y });
  }
  return seen.size === layout.width * layout.height - museum.cases.length
    && museum.cases.every(item => findPathNextTo(layout, layout.door, item) !== null);
}

function casePosition(museum: Museum, p: Point): boolean {
  const mid = museumColumns(museum) / 2;
  return Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < mid * 2 && p.y >= 1 && p.y < MUSEUM_ROWS - 1
    && p.x !== mid - 1 && p.x !== mid;
}

export function canPlaceMuseumCase(museum: Museum, at: Point, movingId: number | null = null): boolean {
  if (!casePosition(museum, at)) return false;
  const others = museum.cases.filter(item => item.id !== movingId);
  if (others.some(item => item.x === at.x && item.y === at.y)) return false;
  return connected({ ...museum, cases: [...others, { ...at, id: movingId ?? museum.nextCaseId, exhibit: null }] });
}

export function placeMuseumCase(state: GameState, at: Point, movingId: number | null = null): GameState {
  const museum = state.museum, moving = museum.cases.find(item => item.id === movingId);
  if (!moving && museum.nextCaseId >= Number.MAX_SAFE_INTEGER) return state;
  if (movingId !== null ? !moving : museum.storedCases < 1) return state;
  if (!canPlaceMuseumCase(museum, at, movingId)) return state;
  if (moving && moving.x === at.x && moving.y === at.y) return state;
  const item: MuseumCase = { ...at, id: moving?.id ?? museum.nextCaseId, exhibit: moving?.exhibit ?? null };
  return { ...state, museum: { ...museum,
    storedCases: museum.storedCases - (moving ? 0 : 1), nextCaseId: museum.nextCaseId + (moving ? 0 : 1),
    cases: [...museum.cases.filter(item => item.id !== movingId), item],
  } };
}

export function storeMuseumCase(state: GameState, id: number): GameState {
  if (!state.museum.cases.some(item => item.id === id) || state.museum.storedCases >= Number.MAX_SAFE_INTEGER) return state;
  return { ...state, museum: { ...state.museum, storedCases: state.museum.storedCases + 1,
    cases: state.museum.cases.filter(item => item.id !== id) } };
}

export function displayMuseumCrop(state: GameState, id: number, exhibit: CollectionId | null): GameState {
  if (!state.museum.cases.some(item => item.id === id) || exhibit !== null && !state.cropCollection.includes(exhibit)) return state;
  if (state.museum.cases.find(item => item.id === id)?.exhibit === exhibit) return state;
  // A choice belongs to this case; never silently empty another display.
  if (exhibit !== null && state.museum.cases.some(item => item.id !== id && item.exhibit === exhibit)) return state;
  return { ...state, museum: { ...state.museum, cases: state.museum.cases.map(item => item.id === id ? { ...item, exhibit } : item) } };
}

export function buyMuseumCase(state: GameState): GameState {
  if (state.leaves < MUSEUM_CASE_PRICE || state.museum.storedCases >= Number.MAX_SAFE_INTEGER - 1) return state;
  return { ...state, leaves: state.leaves - MUSEUM_CASE_PRICE, museum: { ...state.museum, storedCases: state.museum.storedCases + 1 } };
}

export function expandMuseum(state: GameState): GameState {
  const price = MUSEUM_EXPANSION_PRICES[state.museum.level];
  if (price === undefined || state.leaves < price) return state;
  return { ...state, leaves: state.leaves - price, museum: { ...state.museum, level: state.museum.level + 1,
    cases: state.museum.cases.map(item => ({ ...item, x: item.x + 2 })) } };
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const whole = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
export function validMuseum(value: unknown): value is Museum {
  if (!object(value) || !whole(value.level) || value.level > 2 || !whole(value.storedCases) || !whole(value.nextCaseId) || value.nextCaseId < 1 || !Array.isArray(value.cases)) return false;
  const museum = value as unknown as Museum;
  if (!value.cases.every(item => object(item) && whole(item.id) && item.id > 0 && item.id < museum.nextCaseId
    && casePosition(museum, item as unknown as Point) && (item.exhibit === null || COLLECTION_IDS.includes(item.exhibit as CollectionId)))) return false;
  if (new Set(museum.cases.map(item => item.id)).size !== museum.cases.length || new Set(museum.cases.map(item => `${item.x},${item.y}`)).size !== museum.cases.length) return false;
  const exhibits = museum.cases.flatMap(item => item.exhibit ? [item.exhibit] : []);
  return new Set(exhibits).size === exhibits.length && connected(museum);
}

/** Museum changes persist without also committing the cafe day's stock or takings. */
export function museumCheckpoint(checkpoint: GameState, before: GameState, after: GameState): GameState {
  return { ...checkpoint, museum: after.museum, leaves: checkpoint.leaves + after.leaves - before.leaves };
}
