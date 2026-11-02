import Phaser from 'phaser';
import type { Point } from '../logic/layout';

// Screens mark what Arrange mode (GAME_DESIGN.md §9.3, dev only) may move:
// a name on a screen (as in layoutPoint) and the objects drawn there, which
// move together (a stall and its sign). This file is tiny and always in the
// game; the Arrange overlay itself (debug/ArrangeMode.ts) is dev only.

/** Anything placed on a screen: it has a position, and usually a box on screen (Graphics have none: give them a sizeBox). */
export type Placeable = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform & { getBounds?(): Phaser.Geom.Rectangle };

export interface ArrangeItem {
  screen: string;
  name: string;
  /** Where the item's own point is now (what's saved). */
  point: Point;
  objects: Placeable[];
}

/** A rule a screen's arrangement must keep, for Arrange mode to check before saving. */
export type ArrangeRule = () => { name: string; problem: string }[];

const items = new Map<Phaser.Scene, ArrangeItem[]>();
const rules = new Map<Phaser.Scene, ArrangeRule[]>();

/**
 * Marks objects as one movable thing called `name` on `screen`, whose
 * position is `point` (from layoutPoint). Only kept under `npm run dev`.
 */
export function arrangeable(scene: Phaser.Scene, screen: string, name: string, point: Point, ...objects: Placeable[]): void {
  if (!import.meta.env.DEV) return;
  forScene(scene);
  items.get(scene)!.push({ screen, name, point: { ...point }, objects });
}

/** A scene's lists, made on first use; gone with the screen, built again (with fresh objects) when it's next shown. */
function forScene(scene: Phaser.Scene): void {
  if (items.has(scene)) return;
  items.set(scene, []);
  rules.set(scene, []);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    items.delete(scene);
    rules.delete(scene);
  });
}

/** A rule for this screen's arrangement (e.g. stalls stay where the player can walk). */
export function arrangeRule(scene: Phaser.Scene, rule: ArrangeRule): void {
  if (!import.meta.env.DEV) return;
  forScene(scene);
  rules.get(scene)!.push(rule);
}

export function arrangeItems(scene: Phaser.Scene): ArrangeItem[] {
  return items.get(scene) ?? [];
}

export function arrangeRules(scene: Phaser.Scene): ArrangeRule[] {
  return rules.get(scene) ?? [];
}

/**
 * An invisible box the size of something drawn with Graphics (a speech
 * bubble, a plate), whose own box Arrange mode can't measure: pass it to
 * arrangeable() with the thing, and it moves with it. (x, y) is its
 * top-left. Nothing in the release build.
 */
export function sizeBox(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Placeable[] {
  return import.meta.env.DEV ? [scene.add.zone(x, y, width, height).setOrigin(0)] : [];
}
