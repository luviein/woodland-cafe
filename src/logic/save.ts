import { migrateGarden, validGarden } from './garden';
import { FINISH_IDS } from '../data/roomFinishProducts';
import { appliedFinishIds, ownedFinishGrid } from './roomFinishShop';
import { defaultFinishes, validFinishes } from '../data/roomFinishes';
import { roomProblems } from './roomPainter';
import { EMPLOYEE_ROLES, type EmployeeRole } from '../data/employees';
import { DESIGN_IDS, kindOf, type DesignId } from '../data/furniture';
import { INGREDIENT_IDS, type IngredientId } from '../data/ingredients';
import { UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { buildLayout, placementOverlap, validPiecePosition, validRugOrientation, spotProblemFor, type Furniture, type PlacedPiece } from './furniture';
import { createNewGame, type GameState } from './gameState';
import { isTutorialState } from './tutorial';
import { TIP_IDS, type TipId } from '../data/tutorial';
import { readOutfit } from './wardrobe';
import { readPlayerAnimal } from '../data/playerAnimals';
import { CLOTHING_IDS, CLOTHING_SLOTS } from '../data/clothing';

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
// 2: furniture records its design (the Christmas edition, GAME_DESIGN.md §5.10).
// 3: independent wardrobe slots; older saves start without clothing.
// 4: player animal; older saves keep the hedgehog.
// 5: capes and shoes; older outfits retain their hat and top.
// 6: clothing ownership; pre-shop saves retain the free collection.
// 7: each cafe saves its own painted room.
// 8: painted floor and wall finishes, separate from room structure.
// 9: one-time room finish purchases.
// 10: rugs share floor coordinates with furniture.
// 11: rugs use quarter-tile placement coordinates.
// 12: each placed rug remembers its quarter-turn and mirror flags.
// 13: real-time garden crops and seed packets.
// 14: saved mutations, seasonal seeds and separately stored special harvests.
// 15: permanent Christmas ticket balance.
export const SAVE_VERSION = 15;

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
    return { ok: true, state: readState(file.state, file.version) };
  } catch (e) {
    if (e instanceof BadSave) return { ok: false, reason: `The save is damaged (${e.message}).` };
    throw e; // a bug in this file, not a bad save: let it show
  }
}

function readState(raw: Record<string, unknown>, version: number): GameState {
  const fresh = createNewGame();
  const room = field<readonly string[]>(raw, 'room', fresh.room, value => Array.isArray(value) && value.every(row => typeof row === 'string') && roomProblems(value, [], false).length === 0);
  const finishes = field<readonly string[]>(raw, 'roomFinishes', defaultFinishes(room), value => validFinishes(value, room));
  const ownedFinishes = idList(raw, 'ownedFinishes', version < 9 ? appliedFinishIds(room, finishes) : [], FINISH_IDS);
  const furniture = readFurniture(raw.furniture, fresh.furniture, room);
  if (roomProblems(room, furniture.placed, false).length) throw new BadSave('room paths');
  const ownedClothing = idList(raw, 'ownedClothing', version < 6 ? CLOTHING_IDS : fresh.ownedClothing, CLOTHING_IDS);
  const outfit = readOutfit(raw.outfit);
  for (const slot of CLOTHING_SLOTS) {
    const item = outfit[slot];
    if (item && !ownedClothing.includes(item)) outfit[slot] = null;
  }
  return {
    christmasTickets: field(raw, 'christmasTickets', fresh.christmasTickets, (v) => Number.isSafeInteger(v) && (v as number) >= 0),
    garden: field(version < 14 && 'garden' in raw ? { ...raw, garden: migrateGarden(raw.garden) } : raw, 'garden', fresh.garden, validGarden),
    room,
    roomFinishes: ownedFinishGrid(room, finishes, ownedFinishes),
    ownedFinishes,
    ownedClothing,
    animal: readPlayerAnimal(raw.animal),
    outfit,
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
    // Unlike other new fields, a save without it gets 'done', not the new
    // game's 'intro': it was made by someone already playing, before the
    // tutorial existed (GAME_DESIGN.md §5.9). A step the game no longer
    // has also counts as done, like other unknown ids being dropped.
    tutorial: isTutorialState(raw.tutorial) ? raw.tutorial : 'done',
    tipsSeen: idList<TipId>(raw, 'tipsSeen', fresh.tipsSeen, TIP_IDS),
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
 * Placed and stored furniture, by design. Version 1 saves wrote `kind`
 * ('table' or 'chair') where `design` is now; those are the plain designs'
 * ids, so they read straight in. If the placed pieces no longer make a valid
 * cafe (e.g. the room was changed in an update), they're all moved into
 * storage instead of refusing the save: the player can put them back with
 * Decorate.
 */
function readFurniture(value: unknown, fallback: Furniture, room: readonly string[]): Furniture {
  if (value === undefined) return fallback;
  if (!isObject(value) || !Array.isArray(value.placed)) throw new BadSave('furniture');
  const stored = countsById<DesignId>(value.stored, 'furniture.stored', fallback.stored, DESIGN_IDS);
  const placed: PlacedPiece[] = value.placed.map((p: unknown) => {
    const design = isObject(p) ? (p.design ?? p.kind) : undefined;
    const ok = isObject(p) && DESIGN_IDS.includes(design as DesignId) && validPiecePosition(design as DesignId, p.x, p.y);
    if (!ok) throw new BadSave('furniture.placed');
    const piece: PlacedPiece = { design: design as DesignId, x: p.x as number, y: p.y as number };
    if (kindOf(piece.design) === 'rug') {
      if (!validRugOrientation(p)) throw new BadSave('rug orientation');
      if (p.rugRotation !== undefined) piece.rugRotation = p.rugRotation as number;
      if (p.rugFlipX !== undefined) piece.rugFlipX = p.rugFlipX as boolean;
      if (p.rugFlipY !== undefined) piece.rugFlipY = p.rugFlipY as boolean;
    }
    return piece;
  });
  const furniture = { placed, stored };
  if (allPlacedOk(furniture, room)) return furniture;
  const allStored = { ...stored };
  for (const p of placed) allStored[p.design] += 1;
  return { placed: [], stored: allStored };
}

/** Every piece on a spot it may stand on, one per spot, making a valid cafe. */
function allPlacedOk(furniture: Furniture, room: readonly string[]): boolean {
  if (placementOverlap(furniture.placed)) return false;
  const onItsSpot = (p: PlacedPiece) => spotProblemFor(p.design, p, room) === null;
  return furniture.placed.every(onItsSpot) && buildsValidCafe(furniture, room);
}

function buildsValidCafe(furniture: Furniture, room: readonly string[]): boolean {
  try {
    buildLayout(furniture, room);
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
