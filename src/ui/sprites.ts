import type Phaser from 'phaser';
import { COLORS } from './theme';

// Placeholder drawings shared by several scenes (cafe floor, world map,
// outdoor areas), so they look the same everywhere until real art
// (milestone 10) replaces them in one place.

/** The player: a 16x16 critter in an apron. Origin is its top-left corner. */
export function createPlayerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.player);
  g.fillRect(3, 1, 10, 14);
  g.fillStyle(COLORS.apron);
  g.fillRect(5, 8, 6, 6);
  g.fillStyle(COLORS.ink);
  g.fillRect(5, 4, 2, 2);
  g.fillRect(9, 4, 2, 2);
  // Depth: draw the player above customers and scenery when they overlap.
  return scene.add.container(0, 0, [g]).setDepth(10);
}

/** Height of a tree's trunk at `size` 1; its base (y + this * size) is where it stands. */
export const TREE_TRUNK_HEIGHT = 8;
/** Height of a stall's counter; its base (y + this) is where it stands. */
export const STALL_HEIGHT = 16;

/** A round tree; (x, y) is the top of the trunk. `size` 1 is about 20px wide. */
export function drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, size = 1): void {
  g.fillStyle(COLORS.treeTrunk).fillRect(x - 2 * size, y, 4 * size, TREE_TRUNK_HEIGHT * size);
  g.fillStyle(COLORS.treeLeaf).fillCircle(x, y - 4 * size, 10 * size);
}

/** A Leaf lying on the ground (the currency): a small pointed oval with a vein. Centred on (0, 0). */
export function drawLeaf(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.leaf).fillEllipse(0, 0, 10, 6);
  g.fillTriangle(4, -2, 4, 2, 7, 0); // pointed tip
  g.fillStyle(COLORS.leafVein).fillRect(-5, 0, 10, 1);
  g.fillRect(-7, 0, 2, 1); // stem
}

/** A market stall with a striped awning; (x, y) is the top-middle of the counter. */
export function drawStall(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COLORS.counter).fillRect(x - 16, y, 32, STALL_HEIGHT);
  g.fillStyle(COLORS.awning).fillRect(x - 18, y - 10, 36, 10);
  g.fillStyle(COLORS.roof);
  for (let s = 0; s < 36; s += 12) g.fillRect(x - 18 + s, y - 10, 6, 10);
}
