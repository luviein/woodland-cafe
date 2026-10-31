import Phaser from 'phaser';
import { createNewGame, type GameState } from '../logic/gameState';
import { loadGame, saveGame, type LoadResult } from '../logic/save';
import { browserSaveSlot, type SaveSlot } from '../storage/saveSlot';

// Where the one GameState lives while the game runs: Phaser's registry, a
// key-value store shared by every scene in the game. Scenes read the
// current state, compute a new one with the pure functions in
// logic/gameState.ts, and put it back. Going through these two helpers keeps
// the key and the type in one place.
//
// It also autosaves (GAME_DESIGN.md §6.1): every setGameState() between
// days writes the save slot, so no scene has to remember to save. During a
// cafe day nothing is written; the day's end saves once it's over.

const KEY = 'gameState';
/** True from opening the cafe until the day is over: no autosaves meanwhile. */
const DAY_KEY = 'cafeDayInProgress';

/** The one save slot. Module-level: there's one per game, set at startup. */
let slot: SaveSlot = browserSaveSlot();

/**
 * Called once at startup (main.ts). Starts on a new game's state, marked
 * as mid-day so nothing is saved until the title screen picks Continue or
 * New game.
 */
export function initGameState(game: Phaser.Game, saveSlot: SaveSlot = browserSaveSlot()): void {
  slot = saveSlot;
  game.registry.set(DAY_KEY, true);
  game.registry.set(KEY, createNewGame());
}

/** What's in the save slot: null if empty, else the loaded state or why it can't be loaded. */
export function readSave(): LoadResult | null {
  const text = slot.read();
  return text === null ? null : loadGame(text);
}

/** Title screen's Continue: carry on from the save. Saving resumes (it's between days). */
export function continueGame(owner: HasRegistry, state: GameState): void {
  owner.registry.set(DAY_KEY, false);
  owner.registry.set(KEY, state);
}

/** Title screen's New game: the old save is deleted, and Day 1 starts at once. */
export function startNewGame(owner: HasRegistry): void {
  slot.clear();
  beginCafeDay(owner);
  owner.registry.set(KEY, createNewGame());
}

/**
 * Opening the cafe: stop autosaving until the day ends. Called BEFORE the
 * day number moves on, so a save never holds a day that was started but
 * not finished.
 */
export function beginCafeDay(owner: HasRegistry): void {
  owner.registry.set(DAY_KEY, true);
}

/** The cafe day is over (or was left): autosaving resumes, starting with a save now. */
export function endCafeDay(owner: HasRegistry): void {
  owner.registry.set(DAY_KEY, false);
  saveNow(owner);
}

/** Writes the save slot now, mid-day or not (the dev console's `save`). */
export function saveNow(owner: HasRegistry): void {
  slot.write(saveGame(getGameState(owner)));
}

/** Empties the save slot (the dev console's `wipesave`). */
export function deleteSave(): void {
  slot.clear();
}

/**
 * Anything with the game's registry: a scene, or the Game itself (the dev
 * console uses that, so its commands work whichever scene is running).
 */
type HasRegistry = { registry: Phaser.Data.DataManager };

export function getGameState(owner: HasRegistry): GameState {
  return owner.registry.get(KEY) as GameState;
}

export function setGameState(owner: HasRegistry, state: GameState): void {
  owner.registry.set(KEY, state);
  if (!owner.registry.get(DAY_KEY)) saveNow(owner);
}

/**
 * Calls `onChange` now with the current state, then again every time it's
 * replaced, until `scene` shuts down. The registry fires a
 * `changedata-<key>` event on every set(), so displays (like the wallet)
 * stay correct without each scene remembering to refresh them.
 */
export function watchGameState(scene: Phaser.Scene, onChange: (state: GameState) => void): void {
  onChange(getGameState(scene));
  const event = `changedata-${KEY}`;
  const listener = (_parent: unknown, state: GameState) => onChange(state);
  scene.registry.events.on(event, listener);
  // The registry belongs to the whole GAME, so it outlives the scene. Without
  // off() on shutdown, every visit to a scene would add one more listener,
  // each pointing at objects that no longer exist.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.registry.events.off(event, listener));
}
