import { EMPLOYEE_ROLES, type EmployeeRole } from '../data/employees';
import { FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import { INGREDIENT_IDS, type IngredientId } from '../data/ingredients';
import { UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { CAFE_ROOM, buildLayout, type Furniture, type PlacedPiece } from './furniture';
import { createNewGame, type GameState } from './gameState';

// Turning the game state into text for the save slot and back
// (GAME_DESIGN.md §6.1). Saved text is untrusted: it may come from an older
// version of the game, or have been broken or hand-edited. So loading checks
// every field and either gives back a complete, valid GameState or refuses
// with a reason. It never hands the game something half-loaded.

/**
 * Bump this when the saved shape changes in a way defaults can't cover, and
 * teach loadGame() to convert the older shape. Fields that are simply NEW
 * (like `employees` was) don't need a bump: a missing field gets its new-game
 * default anyway.
 */
export const SAVE_VERSION = 1;

/** What's written to the slot: the version, then the state as-is. */
interface SaveFile {
  version: number;
  state: GameState;
}

export function saveGame(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Thrown inside loadGame() for a bad field; turned into { ok: false }. */
class BadSave extends Error {}

/**
 * Reads saved text back into a GameState. Missing fields get a new game's
 * values; ids the game no longer has (a removed ingredient, say) are dropped.
 * Anything else wrong (not JSON, a newer version, a field of the wrong type)
 * refuses the whole save.
 */
export function loadGame(text: string): LoadResult {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: "The save file isn't readable." };
  }
  if (!isObject(file) || typeof file.version !== 'number' || !isObject(file.state)) {
    return { ok: false, reason: "The save file isn't readable." };
  }
  if (file.version > SAVE_VERSION) {
    return { ok: false, reason: 'The save is from a newer version of the game.' };
  }
  try {
    return { ok: true, state: readState(file.state) };
  } catch (e) {
    if (e instanceof BadSave) return { ok: false, reason: `The save is damaged (${e.message}).` };
    throw e; // a bug in this file, not a bad save: let it show
  }
}

function readState(raw: Record<string, unknown>): GameState {
  const fresh = createNewGame();
  const furniture = readFurniture(raw.furniture, fresh.furniture);
  return {
    day: field(raw, 'day', fresh.day, (v) => isWhole(v) && v >= 1),
    leaves: field(raw, 'leaves', fresh.leaves, (v) => isWhole(v) && v >= 0),
    ingredients: idList(raw, 'ingredients', fresh.ingredients, INGREDIENT_IDS),
    upgrades: idList<UpgradeId>(raw, 'upgrades', fresh.upgrades, UPGRADE_IDS),
    stock: countsById<IngredientId>(raw.stock, 'stock', fresh.stock, INGREDIENT_IDS),
    leavesPickedToday: field(raw, 'leavesPickedToday', fresh.leavesPickedToday, (v) => isWhole(v) && v >= 0),
    foragedToday: field(raw, 'foragedToday', fresh.foragedToday, (v) =>
      Array.isArray(v) && v.every((s) => typeof s === 'string'),
    ),
    furniture,
    employees: idList<EmployeeRole>(raw, 'employees', fresh.employees, EMPLOYEE_ROLES),
  };
}

/** raw[key] if present and `valid`, the default if missing; throws if present but invalid. */
function field<T>(raw: Record<string, unknown>, key: string, fallback: T, valid: (v: unknown) => boolean): T {
  if (!(key in raw)) return fallback;
  if (!valid(raw[key])) throw new BadSave(key);
  return raw[key] as T;
}

/** A list of ids: unknown ones are dropped (removed from the game since), duplicates too. */
function idList<T extends string>(
  raw: Record<string, unknown>,
  key: string,
  fallback: readonly T[],
  known: readonly T[],
): T[] {
  const list = field<unknown[]>(raw, key, [...fallback], (v) => Array.isArray(v));
  // Filtering `known` (not the list) keeps the game's own order, like
  // addIngredient() and hire() do, and drops duplicates for free.
  return known.filter((id) => list.includes(id));
}

/** A count per id, e.g. stock. Missing ids get the default; unknown ones are dropped. */
function countsById<T extends string>(
  value: unknown,
  key: string,
  fallback: Record<T, number>,
  known: readonly T[],
): Record<T, number> {
  if (value === undefined) return { ...fallback };
  if (!isObject(value)) throw new BadSave(key);
  const counts = { ...fallback };
  for (const id of known) {
    if (!(id in value)) continue;
    const n = value[id];
    if (!isWhole(n) || n < 0) throw new BadSave(`${key}.${id}`);
    counts[id] = n;
  }
  return counts;
}

/**
 * Placed and stored furniture. If the placed pieces no longer make a valid
 * cafe (e.g. the room was changed in an update), they're all moved into
 * storage instead of refusing the save: the player can put them back with
 * Decorate.
 */
function readFurniture(value: unknown, fallback: Furniture): Furniture {
  if (value === undefined) return fallback;
  if (!isObject(value) || !Array.isArray(value.placed)) throw new BadSave('furniture');
  const stored = countsById<FurnitureKind>(value.stored, 'furniture.stored', fallback.stored, FURNITURE_KINDS);
  const placed: PlacedPiece[] = value.placed.map((p: unknown) => {
    const ok = isObject(p) && FURNITURE_KINDS.includes(p.kind as FurnitureKind) && isWhole(p.x) && isWhole(p.y);
    if (!ok) throw new BadSave('furniture.placed');
    return { kind: p.kind as FurnitureKind, x: p.x as number, y: p.y as number };
  });
  const onFloor = placed.every((p) => CAFE_ROOM[p.y]?.[p.x] === '.');
  const furniture = { placed, stored };
  if (onFloor && buildsValidCafe(furniture)) return furniture;
  const allStored = { ...stored };
  for (const p of placed) allStored[p.kind] += 1;
  return { placed: [], stored: allStored };
}

function buildsValidCafe(furniture: Furniture): boolean {
  try {
    buildLayout(furniture);
    return true;
  } catch {
    return false;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isWhole(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}
