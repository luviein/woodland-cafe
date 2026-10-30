import type Phaser from 'phaser';
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
