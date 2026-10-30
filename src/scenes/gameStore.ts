import Phaser from 'phaser';
import { createNewGame, type GameState } from '../logic/gameState';

// Where the one GameState lives while the game runs: Phaser's registry, a
// key-value store shared by every scene in the game. Scenes read the
// current state, compute a new one with the pure functions in
// logic/gameState.ts, and put it back. Going through these two helpers keeps
// the key and the type in one place.

const KEY = 'gameState';

/** Called once at startup (main.ts). Later, loading a save goes here instead. */
export function initGameState(game: Phaser.Game): void {
  game.registry.set(KEY, createNewGame());
}

export function getGameState(scene: Phaser.Scene): GameState {
  return scene.registry.get(KEY) as GameState;
}

export function setGameState(scene: Phaser.Scene, state: GameState): void {
  scene.registry.set(KEY, state);
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
